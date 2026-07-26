import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Store } from '@ngxs/store';
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

  protected readonly users = this.store.selectSignal(UsersState.users);
  protected readonly usersData = this.store.selectSignal(UsersState.usersConfigs);
  protected readonly isLoading = this.store.selectSignal(UsersState.isLoading);
  protected readonly approvingUserId = this.store.selectSignal(UsersState.approvingUserId);
  protected readonly approvalOptions = userApprovalOptions;

  private lastEvent: TableLazyLoadEvent = {};
  private searchTerm = '';
  protected selectedStatus = '';

  protected loadUsers(event: TableLazyLoadEvent = {}): void {
    this.lastEvent = event;
    this.dispatchUsersLoad();
  }

  protected onSearch(value: string): void {
    this.searchTerm = value.trim();
    this.dispatchUsersLoad({ ...this.lastEvent, first: 0 });
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

  protected getUserName(user: User): string {
    return (
      user.fullName ||
      user.full_name ||
      [user.firstName, user.lastName].filter(Boolean).join(' ') ||
      '-'
    );
  }

  protected getUserDialogSubject(user: User): string {
    return this.getUserName(user) || this.getUserContact(user) || 'this user';
  }

  protected getUserContact(user: User): string {
    return user.email || user.phone || user.phoneNumber || '-';
  }

  protected getUserRole(user: User): string {
    return this.formatLabel(user.role || '-');
  }

  protected getUserStatus(user: User): string {
    return user.approvalStatus || user.status || 'pending';
  }

  protected isApproved(user: User): boolean {
    return this.getUserStatus(user).toLowerCase() === 'approved';
  }

  protected isRejected(user: User): boolean {
    return ['denied', 'rejected', 'suspended'].includes(this.getUserStatus(user).toLowerCase());
  }

  protected isPending(user: User): boolean {
    return !this.isApproved(user) && !this.isRejected(user);
  }

  protected formatLabel(value: string): string {
    return value
      .replace(/[_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (letter) => letter.toUpperCase()) || '-';
  }

  protected isActionInProgress(user: User): boolean {
    return this.approvingUserId() === user.id;
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


