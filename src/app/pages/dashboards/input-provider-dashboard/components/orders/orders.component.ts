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
  AcceptProviderOrder,
  CancelProviderOrder,
  DeliverProviderOrder,
  DispatchProviderOrder,
  GetProviderOrders,
  ProviderOrder,
  ProviderOrdersQueryParams,
  ProviderOrdersState,
} from './orders.state';

interface OrderStatusFilterOption {
  label: string;
  value: string;
  icon: string;
}

const orderStatusOptions: readonly OrderStatusFilterOption[] = [
  { label: 'Pending', value: 'pending', icon: 'hourglass_empty' },
  { label: 'Accepted', value: 'accepted', icon: 'task_alt' },
  { label: 'In Transit', value: 'in_transit', icon: 'local_shipping' },
  { label: 'Pending Review', value: 'pending_review', icon: 'visibility' },
  { label: 'Delivered', value: 'delivered', icon: 'check_circle' },
  { label: 'Rejected', value: 'rejected', icon: 'error' },
  { label: 'Cancelled', value: 'cancelled', icon: 'cancel' },
];

const parseProofLines = (value: string): string[] =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

@Component({
  selector: 'app-provider-orders',
  imports: [DatePipe, DecimalPipe, Dialog, FormInputComponent, MenuModule, ReactiveFormsModule, TableModule],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersComponent {
  private readonly dialog = inject(MatDialog);
  private readonly store = inject(Store);
  private readonly toastr = inject(ToastrService);

  protected readonly orders = this.store.selectSignal(ProviderOrdersState.orders);
  protected readonly ordersData = this.store.selectSignal(ProviderOrdersState.ordersConfigs);
  protected readonly isLoading = this.store.selectSignal(ProviderOrdersState.isLoading);
  protected readonly isMutating = this.store.selectSignal(ProviderOrdersState.isMutating);
  protected readonly statusOptions = orderStatusOptions;

  protected readonly statusMenuItems: MenuItem[] = [
    { label: 'All statuses', icon: 'list', command: () => this.onStatusFilter('') },
    ...orderStatusOptions.map((option) => ({
      label: option.label,
      icon: option.icon,
      command: () => this.onStatusFilter(option.value),
    })),
  ];

  protected readonly selectedOrderForAction = signal<ProviderOrder | null>(null);

  protected readonly actionMenuItems = computed<MenuItem[]>(() => {
    const order = this.selectedOrderForAction();
    if (!order) {
      return [];
    }

    switch (order.status) {
      case 'pending':
        return [{ label: 'Accept order', icon: 'task_alt', command: () => this.onAccept(order) }];
      case 'accepted':
        return [
          { label: 'Mark in transit', icon: 'local_shipping', command: () => this.onOpenDispatch(order) },
          { label: 'Mark delivered', icon: 'check_circle', command: () => this.onOpenDeliver(order) },
          { label: 'Cancel order', icon: 'cancel', command: () => this.onOpenCancel(order) },
        ];
      case 'in_transit':
        return [
          { label: 'Mark delivered', icon: 'check_circle', command: () => this.onOpenDeliver(order) },
          { label: 'Cancel order', icon: 'cancel', command: () => this.onOpenCancel(order) },
        ];
      case 'pending_review':
        return [{ label: 'Cancel order', icon: 'cancel', command: () => this.onOpenCancel(order) }];
      case 'rejected':
        return [
          { label: 'Resubmit delivery', icon: 'check_circle', command: () => this.onOpenDeliver(order) },
          { label: 'Cancel order', icon: 'cancel', command: () => this.onOpenCancel(order) },
        ];
      default:
        return [];
    }
  });

  protected readonly isDispatchModalVisible = signal(false);
  protected readonly isDeliverModalVisible = signal(false);
  protected readonly isCancelModalVisible = signal(false);
  protected readonly selectedOrderForModal = signal<ProviderOrder | null>(null);

  protected readonly dispatchForm = new FormGroup({
    deliveryNotes: new FormControl('', { nonNullable: true }),
  });

  protected readonly deliverForm = new FormGroup({
    deliveryNotes: new FormControl('', { nonNullable: true }),
    proofOfDelivery: new FormControl('', { nonNullable: true }),
  });

  protected readonly cancelForm = new FormGroup({
    reason: new FormControl('', { nonNullable: true }),
  });

  private lastEvent: TableLazyLoadEvent = {};
  protected selectedStatus = '';

  private readonly searchInput$ = new Subject<string>();

  constructor() {
    this.searchInput$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.dispatchOrdersLoad({ ...this.lastEvent, first: 0 }));
  }

  protected loadOrders(event: TableLazyLoadEvent = {}): void {
    this.lastEvent = event;
    this.dispatchOrdersLoad();
  }

  protected onStatusFilter(status: string): void {
    this.selectedStatus = status;
    this.dispatchOrdersLoad({ ...this.lastEvent, first: 0 });
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

  protected onAccept(order: ProviderOrder): void {
    this.dialog
      .open(ConfirmModalComponent, { disableClose: true })
      .afterClosed()
      .subscribe((confirmed?: boolean) => {
        if (!confirmed) {
          return;
        }

        this.store.dispatch(new AcceptProviderOrder(order.id)).subscribe({
          next: () => this.onMutationComplete(),
          error: () => this.toastr.triggerToastr('error', 'Unable to accept this order.'),
        });
      });
  }

  protected onOpenDispatch(order: ProviderOrder): void {
    this.selectedOrderForModal.set(order);
    this.dispatchForm.reset({ deliveryNotes: '' });
    this.isDispatchModalVisible.set(true);
  }

  protected onSubmitDispatch(): void {
    const order = this.selectedOrderForModal();
    if (!order) {
      return;
    }

    const deliveryNotes = this.dispatchForm.controls.deliveryNotes.value.trim();
    this.store.dispatch(new DispatchProviderOrder(order.id, deliveryNotes || null)).subscribe({
      next: () => {
        this.isDispatchModalVisible.set(false);
        this.onMutationComplete();
      },
      error: (error: unknown) =>
        this.toastr.triggerToastr('error', extractErrorMessage(error, 'Unable to mark this order in transit.')),
    });
  }

  protected onOpenDeliver(order: ProviderOrder): void {
    this.selectedOrderForModal.set(order);
    this.deliverForm.reset({ deliveryNotes: '', proofOfDelivery: '' });
    this.isDeliverModalVisible.set(true);
  }

  protected onSubmitDeliver(): void {
    const order = this.selectedOrderForModal();
    if (!order) {
      return;
    }

    const raw = this.deliverForm.getRawValue();
    this.store
      .dispatch(
        new DeliverProviderOrder(order.id, {
          deliveryNotes: raw.deliveryNotes.trim() || null,
          proofOfDelivery: parseProofLines(raw.proofOfDelivery),
        }),
      )
      .subscribe({
        next: () => {
          this.isDeliverModalVisible.set(false);
          this.onMutationComplete();
        },
        error: (error: unknown) =>
          this.toastr.triggerToastr('error', extractErrorMessage(error, 'Unable to mark this order delivered.')),
      });
  }

  protected onOpenCancel(order: ProviderOrder): void {
    this.selectedOrderForModal.set(order);
    this.cancelForm.reset({ reason: '' });
    this.isCancelModalVisible.set(true);
  }

  protected onSubmitCancel(): void {
    const order = this.selectedOrderForModal();
    if (!order) {
      return;
    }

    const reason = this.cancelForm.controls.reason.value.trim();
    this.store.dispatch(new CancelProviderOrder(order.id, reason || null)).subscribe({
      next: () => {
        this.isCancelModalVisible.set(false);
        this.onMutationComplete();
      },
      error: (error: unknown) =>
        this.toastr.triggerToastr('error', extractErrorMessage(error, 'Unable to cancel this order.')),
    });
  }

  private onMutationComplete(): void {
    const errors = this.store.selectSnapshot(ProviderOrdersState.errors);
    if (errors.length) {
      this.toastr.triggerToastr('error', errors[0]);
      return;
    }

    const message = this.store.selectSnapshot(ProviderOrdersState.message);
    this.toastr.triggerToastr('success', message || 'Order updated successfully.');
    this.dispatchOrdersLoad();
  }

  private dispatchOrdersLoad(event: TableLazyLoadEvent = this.lastEvent): void {
    this.lastEvent = event;
    const params: ProviderOrdersQueryParams = {
      first: event.first ?? 0,
      rows: event.rows ?? 10,
      status: (this.selectedStatus as ProviderOrdersQueryParams['status']) || 'all',
    };

    this.store.dispatch(new GetProviderOrders(params)).subscribe();
  }
}
