import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Store } from '@ngxs/store';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ConfirmModalComponent } from '../../../../../shared/confirm-modal/confirm-modal.component';
import { ToastrService } from '../../../../../shared/toastr/toastr.service';
import {
  GetUsers,
  UpdateUserApproval,
  User,
  UserApprovalOption,
  UsersQueryParams,
  UsersState,
  userApprovalOptions,
} from './users.state';

export interface UserRow {
  user: User;
  name: string;
  contact: string;
  role: string;
  statusLabel: string;
  createdAt: string;
  isApproved: boolean;
  isRejected: boolean;
  isPending: boolean;
  isActionInProgress: boolean;
}

@Component({
  selector: 'app-users',
  imports: [MatIconModule, MatMenuModule, TableModule],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersComponent {
  private readonly dialog = inject(MatDialog);
  private readonly store = inject(Store);
  private readonly toastr = inject(ToastrService);
  private readonly router = inject(Router);

  private readonly users = this.store.selectSignal(UsersState.users);
  private readonly approvingUserId = this.store.selectSignal(UsersState.approvingUserId);
  protected readonly userRows = computed(() => this.users().map((user) => this.toRow(user)));
  protected readonly usersData = this.store.selectSignal(UsersState.usersConfigs);
  protected readonly isLoading = this.store.selectSignal(UsersState.isLoading);
  protected readonly approvalOptions = userApprovalOptions;

  private lastEvent: TableLazyLoadEvent = {};
  private searchTerm = '';
  protected selectedStatus = '';

  private readonly searchInput$ = new Subject<string>();

  constructor() {
    this.searchInput$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((value) => {
        this.searchTerm = value;
        this.dispatchUsersLoad({ ...this.lastEvent, first: 0 });
      });
  }

  protected loadUsers(event: TableLazyLoadEvent = {}): void {
    this.lastEvent = event;
    this.dispatchUsersLoad();
  }

  protected onSearch(value: string): void {
    this.searchInput$.next(value.trim());
  }

  protected onStatusFilter(status: string): void {
    this.selectedStatus = status;
    this.dispatchUsersLoad({ ...this.lastEvent, first: 0 });
  }

  protected onUserRowClick(user: User): void {
    if (!user.id) {
      return;
    }

    this.router.navigate(['/dashboard/super-admin/users', user.id]);
  }

  protected onUserRowKeydown(event: KeyboardEvent, user: User): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    this.onUserRowClick(user);
  }

  protected onApprovalRequest(user: User, option: UserApprovalOption): void {
    if (!user.id) {
      this.toastr.triggerToastr('error', 'Unable to update this user.');
      return;
    }

    this.dialog
      .open(ConfirmModalComponent, { disableClose: true })
      .afterClosed()
      .subscribe((confirmed?: boolean) => {
        if (!confirmed) {
          return;
        }

        this.store.dispatch(new UpdateUserApproval(user.id, option.value)).subscribe({
          next: () => this.toastr.triggerToastr('success', option.successMessage),
          error: () => this.toastr.triggerToastr('error', 'Failed to update user approval.'),
        });
      });
  }

  protected formatLabel(value: string): string {
    return value
      .replace(/[_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (letter) => letter.toUpperCase()) || '-';
  }

  private toRow(user: User): UserRow {
    const status = (user.approvalStatus || user.status || 'pending').toLowerCase();
    const isApproved = status === 'approved';
    const isRejected = ['denied', 'rejected', 'suspended'].includes(status);

    return {
      user,
      name:
        user.fullName ||
        user.full_name ||
        [user.firstName, user.lastName].filter(Boolean).join(' ') ||
        '-',
      contact: user.email || user.phone || user.phoneNumber || '-',
      role: this.formatLabel(user.role || '-'),
      statusLabel: this.formatLabel(status),
      createdAt: user.createdAt || user.dateCreated || '-',
      isApproved,
      isRejected,
      isPending: !isApproved && !isRejected,
      isActionInProgress: this.approvingUserId() === user.id,
    };
  }

  private dispatchUsersLoad(event: TableLazyLoadEvent = this.lastEvent): void {
    this.lastEvent = event;
    const params: UsersQueryParams = {
      first: event.first ?? 0,
      rows: event.rows ?? 10,
      sortField: this.getSortField(event.sortField),
      sortOrder: event.sortOrder ?? undefined,
      globalFilter: this.searchTerm || undefined,
      status: this.selectedStatus || undefined,
    };

    this.store.dispatch(new GetUsers(params)).subscribe();
  }

  private getSortField(sortField: string | string[] | null | undefined): string | undefined {
    if (Array.isArray(sortField)) {
      return sortField[0];
    }

    return sortField ?? undefined;
  }
}


