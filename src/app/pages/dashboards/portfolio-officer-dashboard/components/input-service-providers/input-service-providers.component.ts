import { DatePipe, DecimalPipe } from '@angular/common';
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
  GetInputProviderDetail,
  GetPortfolioInputProviders,
  InputProviderActivityItem,
  InputProviderOrderSummary,
  InputProvidersQueryParams,
  PortfolioInputProvidersState,
  ReviewProviderOrder,
} from './input-service-providers.state';

interface ProviderStatusFilterOption {
  label: string;
  value: string;
  icon: string;
}

interface InputProviderRow {
  provider: InputProviderActivityItem;
  businessName: string;
  contactPerson: string;
  contact: string;
  serviceTypes: string;
  regions: string;
  fulfilledOrders: number;
  statusLabel: string;
  lastActivity: string | Date | null;
  isActive: boolean;
  isInactive: boolean;
  isPending: boolean;
  pendingReviewCount: number;
}

const providerStatusOptions: readonly ProviderStatusFilterOption[] = [
  { label: 'Active', value: 'active', icon: 'check_circle' },
  { label: 'Pending', value: 'pending', icon: 'pending' },
  { label: 'Approved', value: 'approved', icon: 'verified' },
  { label: 'Inactive', value: 'inactive', icon: 'block' },
  { label: 'Suspended', value: 'suspended', icon: 'warning' },
];

@Component({
  selector: 'app-input-service-providers',
  imports: [DatePipe, DecimalPipe, Dialog, FormInputComponent, MenuModule, ReactiveFormsModule, TableModule],
  templateUrl: './input-service-providers.component.html',
  styleUrl: './input-service-providers.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputServiceProvidersComponent {
  private readonly dialog = inject(MatDialog);
  private readonly store = inject(Store);
  private readonly toastr = inject(ToastrService);

  private readonly providers = this.store.selectSignal(PortfolioInputProvidersState.providers);
  protected readonly providerRows = computed(() => this.providers().map((p) => this.toRow(p)));
  protected readonly providersData = this.store.selectSignal(PortfolioInputProvidersState.providersConfigs);
  protected readonly isLoading = this.store.selectSignal(PortfolioInputProvidersState.isLoading);
  protected readonly statusOptions = providerStatusOptions;

  protected readonly detail = this.store.selectSignal(PortfolioInputProvidersState.detail);
  protected readonly isDetailLoading = this.store.selectSignal(PortfolioInputProvidersState.isDetailLoading);
  protected readonly isReviewing = this.store.selectSignal(PortfolioInputProvidersState.isReviewing);

  protected readonly isDetailModalVisible = signal(false);
  protected readonly isDenyModalVisible = signal(false);
  protected readonly selectedOrderForDeny = signal<InputProviderOrderSummary | null>(null);

  protected readonly denyForm = new FormGroup({
    notes: new FormControl('', { nonNullable: true }),
  });

  protected readonly statusMenuItems: MenuItem[] = [
    {
      label: 'All statuses',
      icon: 'list',
      command: () => this.onStatusFilter(''),
    },
    ...providerStatusOptions.map((option) => ({
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
        this.dispatchProvidersLoad({ ...this.lastEvent, first: 0 });
      });
  }

  protected loadProviders(event: TableLazyLoadEvent = {}): void {
    this.lastEvent = event;
    this.dispatchProvidersLoad();
  }

  protected onSearch(value: string): void {
    this.searchInput$.next(value.trim());
  }

  protected onStatusFilter(status: string): void {
    this.selectedStatus = status;
    this.dispatchProvidersLoad({ ...this.lastEvent, first: 0 });
  }

  protected formatLabel(value: string): string {
    return (
      value
        .replace(/[_-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (letter) => letter.toUpperCase()) || '-'
    );
  }

  private toRow(provider: InputProviderActivityItem): InputProviderRow {
    const rawStatus = (
      provider.status ||
      provider.approvalStatus ||
      'active'
    ).toLowerCase();
    const isActive = ['active', 'approved', 'verified'].includes(rawStatus);
    const isInactive = ['inactive', 'suspended', 'rejected', 'blocked'].includes(rawStatus);
    const isPending = !isActive && !isInactive;

    const businessName =
      provider.businessName ||
      provider.businessDetails?.businessName ||
      provider.name ||
      '-';

    const contactPerson =
      provider.contactPerson ||
      provider.businessDetails?.contactPerson ||
      '-';

    const phone =
      provider.phone ||
      provider.businessDetails?.phoneNumber;
    const email =
      provider.email ||
      provider.businessDetails?.emailAddress;
    const contact = [phone, email].filter(Boolean).join(' / ') || '-';

    const services = provider.serviceTypes?.length
      ? provider.serviceTypes.map((s) => this.formatLabel(s)).join(', ')
      : '-';

    const regions = provider.operationalJurisdictions?.length
      ? provider.operationalJurisdictions.map((r) => this.formatLabel(r)).join(', ')
      : provider.region || '-';

    const fulfilledOrders =
      provider.fulfilledOrdersCount ??
      provider.totalOrdersCount ??
      0;

    const lastActivity =
      provider.lastActiveAt || provider.lastActivityAt || provider.updatedAt || null;

    return {
      provider,
      businessName,
      contactPerson,
      contact,
      serviceTypes: services,
      regions,
      fulfilledOrders,
      statusLabel: this.formatLabel(rawStatus),
      lastActivity,
      isActive,
      isInactive,
      isPending,
      pendingReviewCount: Number(provider['pendingReviewCount'] ?? 0),
    };
  }

  protected onViewDetail(row: InputProviderRow): void {
    const providerId = row.provider.providerId ?? row.provider.id;
    if (!providerId) {
      return;
    }

    this.isDetailModalVisible.set(true);
    this.store.dispatch(new GetInputProviderDetail(providerId)).subscribe({
      error: (error: unknown) =>
        this.toastr.triggerToastr('error', extractErrorMessage(error, "Unable to load this provider's activity.")),
    });
  }

  protected onApprove(order: InputProviderOrderSummary): void {
    this.dialog
      .open(ConfirmModalComponent, { disableClose: true })
      .afterClosed()
      .subscribe((confirmed?: boolean) => {
        if (!confirmed) {
          return;
        }

        this.store.dispatch(new ReviewProviderOrder(order.orderId, 'approve')).subscribe({
          next: () => this.onReviewComplete(),
          error: (error: unknown) =>
            this.toastr.triggerToastr('error', extractErrorMessage(error, 'Unable to approve this order.')),
        });
      });
  }

  protected onOpenDeny(order: InputProviderOrderSummary): void {
    this.selectedOrderForDeny.set(order);
    this.denyForm.reset({ notes: '' });
    this.isDenyModalVisible.set(true);
  }

  protected onSubmitDeny(): void {
    const order = this.selectedOrderForDeny();
    if (!order) {
      return;
    }

    const notes = this.denyForm.controls.notes.value.trim();
    this.store.dispatch(new ReviewProviderOrder(order.orderId, 'deny', notes || null)).subscribe({
      next: () => {
        this.isDenyModalVisible.set(false);
        this.onReviewComplete();
      },
      error: (error: unknown) =>
        this.toastr.triggerToastr('error', extractErrorMessage(error, 'Unable to send this order back.')),
    });
  }

  private onReviewComplete(): void {
    const errors = this.store.selectSnapshot(PortfolioInputProvidersState.reviewErrors);
    if (errors.length) {
      this.toastr.triggerToastr('error', errors[0]);
      return;
    }

    const message = this.store.selectSnapshot(PortfolioInputProvidersState.reviewMessage);
    this.toastr.triggerToastr('success', message || 'Review recorded successfully.');
    this.dispatchProvidersLoad();
  }

  private formatDate(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  }

  private dispatchProvidersLoad(event: TableLazyLoadEvent = this.lastEvent): void {
    this.lastEvent = event;
    const params: InputProvidersQueryParams = {
      first: event.first ?? 0,
      rows: event.rows ?? 10,
      globalFilter: this.searchTerm || undefined,
      status: this.selectedStatus || undefined,
    };

    this.store.dispatch(new GetPortfolioInputProviders(params)).subscribe();
  }
}
