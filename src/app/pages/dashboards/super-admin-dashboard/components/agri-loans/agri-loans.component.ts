import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Dialog } from 'primeng/dialog';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { Store } from '@ngxs/store';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import {
  AdminLoan,
  AdminLoansQueryParams,
  AdminLoansState,
  GetAdminLoanDetail,
  GetAdminLoans,
} from './agri-loans.state';

interface StatusFilterOption {
  label: string;
  value: string;
  icon: string;
}

interface KeyValueView {
  label: string;
  value: string;
}

const statusOptions: readonly StatusFilterOption[] = [
  { label: 'Submitted', value: 'submitted', icon: 'pending' },
  { label: 'Under Bank Review', value: 'under_bank_review', icon: 'pending' },
  { label: 'Approved', value: 'approved', icon: 'check_circle' },
  { label: 'Rejected', value: 'rejected', icon: 'block' },
  { label: 'Flagged', value: 'flagged', icon: 'flag' },
  { label: 'Disbursed', value: 'disbursed', icon: 'payments' },
  { label: 'Partially Repaid', value: 'partially_repaid', icon: 'hourglass_top' },
  { label: 'Repaid', value: 'repaid', icon: 'task_alt' },
  { label: 'Cancelled', value: 'cancelled', icon: 'cancel' },
];

@Component({
  selector: 'app-agri-loans',
  imports: [DatePipe, DecimalPipe, Dialog, MenuModule, TableModule],
  templateUrl: './agri-loans.component.html',
  styleUrl: './agri-loans.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgriLoansComponent {
  private readonly store = inject(Store);

  protected readonly loans = this.store.selectSignal(AdminLoansState.loans);
  protected readonly loansData = this.store.selectSignal(AdminLoansState.loansConfigs);
  protected readonly isLoading = this.store.selectSignal(AdminLoansState.isLoading);
  protected readonly summary = this.store.selectSignal(AdminLoansState.summary);
  protected readonly queue = this.store.selectSignal(AdminLoansState.queue);
  protected readonly statusOptions = statusOptions;

  protected readonly isDetailModalVisible = signal(false);
  protected readonly loanDetail = this.store.selectSignal(AdminLoansState.loanDetail);
  protected readonly isDetailLoading = this.store.selectSignal(AdminLoansState.isDetailLoading);

  protected readonly cropPlanEntries = computed<KeyValueView[]>(() =>
    this.toEntries(this.loanDetail()?.loan.cropPlan),
  );

  protected readonly repaymentScheduleEntries = computed<KeyValueView[]>(() =>
    this.toEntries(this.loanDetail()?.loan.repaymentSchedule),
  );

  protected readonly inputBundleItems = computed<string[]>(() => {
    const bundle = this.loanDetail()?.loan.inputBundle ?? [];
    return bundle.map((item) => (typeof item === 'string' ? this.formatLabel(item) : this.formatValue(item)));
  });

  protected readonly statusHistoryRows = computed<KeyValueView[]>(() => {
    const history = this.loanDetail()?.loan.statusHistory ?? [];
    return history.map((entry) => {
      if (typeof entry === 'object' && entry !== null) {
        const record = entry as Record<string, unknown>;
        const status = typeof record['status'] === 'string' ? this.formatLabel(record['status'] as string) : 'Update';
        const at = typeof record['at'] === 'string' ? record['at'] as string : (typeof record['timestamp'] === 'string' ? record['timestamp'] as string : null);
        return { label: status, value: at ? new Date(at).toLocaleString() : this.formatValue(record) };
      }
      return { label: 'Update', value: this.formatValue(entry) };
    });
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

  protected loadLoans(event: TableLazyLoadEvent = {}): void {
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
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[_-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (letter) => letter.toUpperCase()) || '-'
    );
  }

  protected isActiveStatus(status: string): boolean {
    return ['repaid', 'disbursed'].includes(status);
  }

  protected isWarningStatus(status: string): boolean {
    return ['partially_repaid', 'under_bank_review', 'submitted', 'flagged'].includes(status);
  }

  protected isDangerStatus(status: string): boolean {
    return ['rejected', 'cancelled'].includes(status);
  }

  protected openDetails(loanId: string): void {
    this.isDetailModalVisible.set(true);
    this.store.dispatch(new GetAdminLoanDetail(loanId));
  }

  private toEntries(source: Record<string, unknown> | undefined | null): KeyValueView[] {
    return Object.entries(source ?? {})
      .filter(([key, value]) => key !== 'tariaAssessment' && value != null)
      .map(([key, value]) => ({
        label: this.formatLabel(key),
        value: this.formatValue(value),
      }));
  }

  private formatValue(value: unknown): string {
    if (value == null) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number' || typeof value === 'string') return String(value);
    if (Array.isArray(value)) return value.map((item) => this.formatValue(item)).join(', ');
    return Object.entries(value as Record<string, unknown>)
      .map(([key, nested]) => `${this.formatLabel(key)}: ${this.formatValue(nested)}`)
      .join(', ');
  }

  private dispatchLoad(event: TableLazyLoadEvent = this.lastEvent): void {
    this.lastEvent = event;
    const params: AdminLoansQueryParams = {
      first: event.first ?? 0,
      rows: event.rows ?? 10,
      globalFilter: this.searchTerm || undefined,
      status: this.selectedStatus || undefined,
    };

    this.store.dispatch(new GetAdminLoans(params)).subscribe();
  }
}
