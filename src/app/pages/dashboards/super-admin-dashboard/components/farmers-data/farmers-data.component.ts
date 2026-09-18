import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MenuItem } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { MenuModule } from 'primeng/menu';
import { Store } from '@ngxs/store';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { ConfirmModalComponent } from '../../../../../shared/confirm-modal/confirm-modal.component';
import { FormInputComponent } from '../../../../../shared/form-input/form-input.component';
import { extractErrorMessage } from '../../../../../shared/request.utils';
import { ToastrService } from '../../../../../shared/toastr/toastr.service';
import {
  AdminFarmer,
  AdminFarmersQueryParams,
  AdminFarmersState,
  GetAdminFarmerDetail,
  GetAdminFarmers,
  ReviewAdminFarmer,
} from './farmers-data.state';

interface StatusFilterOption {
  label: string;
  value: string;
  icon: string;
}

interface FarmerRow {
  farmer: AdminFarmer;
  region: string;
  farmSize: string;
  crop: string;
  statusLabel: string;
  isVerified: boolean;
  isFlagged: boolean;
  isPending: boolean;
  canReview: boolean;
}

const statusOptions: readonly StatusFilterOption[] = [
  { label: 'Approved', value: 'approved', icon: 'check_circle' },
  { label: 'Active', value: 'active', icon: 'check_circle' },
  { label: 'Submitted', value: 'submitted', icon: 'pending' },
  { label: 'Under Review', value: 'under_review', icon: 'pending' },
  { label: 'Rejected', value: 'rejected', icon: 'block' },
  { label: 'Suspended', value: 'suspended', icon: 'block' },
];

@Component({
  selector: 'app-farmers-data',
  imports: [DatePipe, Dialog, FormInputComponent, MenuModule, ReactiveFormsModule, TableModule],
  templateUrl: './farmers-data.component.html',
  styleUrl: './farmers-data.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FarmersDataComponent {
  private readonly dialog = inject(MatDialog);
  private readonly store = inject(Store);
  private readonly toastr = inject(ToastrService);

  private readonly farmers = this.store.selectSignal(AdminFarmersState.farmers);
  protected readonly farmerRows = computed(() => this.farmers().map((farmer) => this.toRow(farmer)));
  protected readonly farmersData = this.store.selectSignal(AdminFarmersState.farmersConfigs);
  protected readonly isLoading = this.store.selectSignal(AdminFarmersState.isLoading);
  protected readonly summary = this.store.selectSignal(AdminFarmersState.summary);
  protected readonly isReviewing = this.store.selectSignal(AdminFarmersState.isReviewing);
  protected readonly statusOptions = statusOptions;

  protected readonly selectedFarmerForAction = signal<AdminFarmer | null>(null);
  protected readonly isRejectModalVisible = signal(false);
  protected readonly selectedFarmerForReject = signal<AdminFarmer | null>(null);

  protected readonly isDetailModalVisible = signal(false);
  protected readonly farmerDetail = this.store.selectSignal(AdminFarmersState.farmerDetail);
  protected readonly isDetailLoading = this.store.selectSignal(AdminFarmersState.isDetailLoading);

  protected readonly rejectForm = new FormGroup({
    reason: new FormControl('', { nonNullable: true }),
  });

  protected readonly actionMenuItems = computed<MenuItem[]>(() => {
    const farmer = this.selectedFarmerForAction();
    if (!farmer) {
      return [];
    }

    return [
      { label: 'Approve KYC', icon: 'check_circle', command: () => this.onApprove(farmer) },
      { label: 'Reject KYC', icon: 'cancel', command: () => this.onOpenReject(farmer) },
    ];
  });

  protected readonly statusMenuItems: MenuItem[] = [
    { label: 'All statuses', icon: 'list', command: () => this.onStatusFilter('') },
    ...statusOptions.map((option) => ({
      label: option.label,
      icon: option.icon,
      command: () => this.onStatusFilter(option.value),
    })),
  ];

  private lastEvent: TableLazyLoadEvent = {};
  private searchTerm = '';
  protected selectedStatus = '';

  private readonly searchInput$ = new Subject<string>();

  constructor() {
    this.searchInput$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((value) => {
        this.searchTerm = value;
        this.dispatchLoad({ ...this.lastEvent, first: 0 });
      });
  }

  protected loadFarmers(event: TableLazyLoadEvent = {}): void {
    this.lastEvent = event;
    this.dispatchLoad();
  }

  protected onSearch(value: string): void {
    this.searchInput$.next(value.trim());
  }

  protected onStatusFilter(status: string): void {
    this.selectedStatus = status;
    this.dispatchLoad({ ...this.lastEvent, first: 0 });
  }

  protected formatLabel(value: string | null | undefined): string {
    return (
      (value ?? '')
        .replace(/[_-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (letter) => letter.toUpperCase()) || '-'
    );
  }

  protected openDetails(farmer: AdminFarmer): void {
    this.isDetailModalVisible.set(true);
    this.store.dispatch(new GetAdminFarmerDetail(farmer.id));
  }

  protected onApprove(farmer: AdminFarmer): void {
    this.dialog
      .open(ConfirmModalComponent, { disableClose: true })
      .afterClosed()
      .subscribe((confirmed?: boolean) => {
        if (!confirmed) {
          return;
        }

        this.store.dispatch(new ReviewAdminFarmer(farmer.id, 'approve')).subscribe({
          next: () => this.onReviewComplete(),
          error: (error: unknown) =>
            this.toastr.triggerToastr('error', extractErrorMessage(error, 'Unable to approve this farmer.')),
        });
      });
  }

  protected onOpenReject(farmer: AdminFarmer): void {
    this.selectedFarmerForReject.set(farmer);
    this.rejectForm.reset({ reason: '' });
    this.isRejectModalVisible.set(true);
  }

  protected onSubmitReject(): void {
    const farmer = this.selectedFarmerForReject();
    if (!farmer) {
      return;
    }

    const reason = this.rejectForm.controls.reason.value.trim();
    this.store.dispatch(new ReviewAdminFarmer(farmer.id, 'reject', reason || null)).subscribe({
      next: () => {
        this.isRejectModalVisible.set(false);
        this.onReviewComplete();
      },
      error: (error: unknown) =>
        this.toastr.triggerToastr('error', extractErrorMessage(error, 'Unable to reject this farmer.')),
    });
  }

  private onReviewComplete(): void {
    const errors = this.store.selectSnapshot(AdminFarmersState.reviewErrors);
    if (errors.length) {
      this.toastr.triggerToastr('error', errors[0]);
      return;
    }

    const message = this.store.selectSnapshot(AdminFarmersState.reviewMessage);
    this.toastr.triggerToastr('success', message || 'Review recorded successfully.');
  }

  private toRow(farmer: AdminFarmer): FarmerRow {
    const status = (farmer.status || 'submitted').toLowerCase();
    const isVerified = ['approved', 'active'].includes(status);
    const isFlagged = ['rejected', 'suspended'].includes(status);
    const isPending = !isVerified && !isFlagged;
    const canReview = ['submitted', 'under_review'].includes(status);

    return {
      farmer,
      region: farmer.region || '-',
      farmSize: farmer.farmSizeHectares != null ? `${farmer.farmSizeHectares.toLocaleString(undefined, { maximumFractionDigits: 2 })} ha` : '-',
      crop: this.formatLabel(farmer.primaryCrop),
      statusLabel: isVerified ? 'Verified' : isFlagged ? 'Flagged' : 'Pending',
      isVerified,
      isFlagged,
      isPending,
      canReview,
    };
  }

  private dispatchLoad(event: TableLazyLoadEvent = this.lastEvent): void {
    this.lastEvent = event;
    const params: AdminFarmersQueryParams = {
      first: event.first ?? 0,
      rows: event.rows ?? 10,
      globalFilter: this.searchTerm || undefined,
      status: this.selectedStatus || undefined,
    };

    this.store.dispatch(new GetAdminFarmers(params)).subscribe();
  }
}
