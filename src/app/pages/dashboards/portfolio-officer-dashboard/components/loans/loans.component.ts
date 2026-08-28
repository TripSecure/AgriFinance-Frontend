import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatMenuModule } from '@angular/material/menu';
import { Store } from '@ngxs/store';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import {
  GetPortfolioLoans,
  PortfolioLoanApplication,
  PortfolioLoansQueryParams,
  PortfolioLoansState,
} from './loans.state';

interface LoanStatusFilterOption {
  label: string;
  value: string;
  icon: string;
}

interface PortfolioLoanRow {
  loan: PortfolioLoanApplication;
  farmerName: string;
  crop: string;
  statusLabel: string;
  requestedAmount: string;
  eligibleAmount: string;
  approvedAmount: string;
  riskScore: string;
  servicesCount: string;
  insuranceLabel: string;
  lastActivity: string;
  isSuccess: boolean;
  isDanger: boolean;
  isWarning: boolean;
}

const loanStatusOptions: readonly LoanStatusFilterOption[] = [
  { label: 'Draft', value: 'draft', icon: 'edit_note' },
  { label: 'Submitted', value: 'submitted', icon: 'upload' },
  { label: 'Under Bank Review', value: 'under_bank_review', icon: 'pending' },
  { label: 'Approved', value: 'approved', icon: 'verified' },
  { label: 'Rejected', value: 'rejected', icon: 'block' },
  { label: 'Flagged', value: 'flagged', icon: 'warning' },
  { label: 'Disbursed', value: 'disbursed', icon: 'payments' },
  { label: 'Partially Repaid', value: 'partially_repaid', icon: 'sync' },
  { label: 'Repaid', value: 'repaid', icon: 'task_alt' },
  { label: 'Cancelled', value: 'cancelled', icon: 'cancel' },
];

@Component({
  selector: 'app-loans',
  imports: [MatMenuModule, TableModule],
  templateUrl: './loans.component.html',
  styleUrl: './loans.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoansComponent {
  private readonly store = inject(Store);

  private readonly loans = this.store.selectSignal(PortfolioLoansState.loans);
  protected readonly loanRows = computed(() => this.loans().map((loan) => this.toRow(loan)));
  protected readonly loansData = this.store.selectSignal(PortfolioLoansState.loansConfigs);
  protected readonly isLoading = this.store.selectSignal(PortfolioLoansState.isLoading);
  protected readonly statusOptions = loanStatusOptions;

  private lastEvent: TableLazyLoadEvent = {};
  private searchTerm = '';
  protected selectedStatus = '';

  private readonly searchInput$ = new Subject<string>();

  constructor() {
    this.searchInput$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((value) => {
        this.searchTerm = value;
        this.dispatchLoansLoad({ ...this.lastEvent, first: 0 });
      });
  }

  protected loadLoans(event: TableLazyLoadEvent = {}): void {
    this.lastEvent = event;
    this.dispatchLoansLoad();
  }

  protected onSearch(value: string): void {
    this.searchInput$.next(value.trim());
  }

  protected onStatusFilter(status: string): void {
    this.selectedStatus = status;
    this.dispatchLoansLoad({ ...this.lastEvent, first: 0 });
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

  private toRow(loan: PortfolioLoanApplication): PortfolioLoanRow {
    const tone = loan.status?.tone ?? 'neutral';

    return {
      loan,
      farmerName: loan.farmer?.fullName || '-',
      crop: loan.farmer?.primaryCrop || '-',
      statusLabel: loan.status?.label || this.formatLabel(loan.status?.code ?? ''),
      requestedAmount: this.formatCurrency(loan.requestedAmount),
      eligibleAmount: this.formatCurrency(loan.eligibleAmount),
      approvedAmount: this.formatCurrency(loan.approvedAmount),
      riskScore: this.formatRiskScore(loan.riskProfile?.score, loan.riskProfile?.category),
      servicesCount: String(loan.selectedServiceCount ?? loan.selectedServices?.length ?? 0),
      insuranceLabel: loan.insuranceIncluded ? 'Included' : 'Not included',
      lastActivity: loan.lastActivityLabel || this.formatDate(loan.lastActivityAt) || '-',
      isSuccess: tone === 'success',
      isDanger: tone === 'danger',
      isWarning: tone === 'warning',
    };
  }

  private formatCurrency(value: number | null | undefined): string {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return '-';
    }

    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'GHS',
      maximumFractionDigits: 0,
    }).format(value);
  }

  private formatRiskScore(score: number | null | undefined, category: string | null | undefined): string {
    const scoreLabel = typeof score === 'number' && Number.isFinite(score) ? String(score) : null;
    const categoryLabel = category ? this.formatLabel(category) : null;

    return [scoreLabel, categoryLabel].filter(Boolean).join(' / ') || '-';
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

  private dispatchLoansLoad(event: TableLazyLoadEvent = this.lastEvent): void {
    this.lastEvent = event;
    const params: PortfolioLoansQueryParams = {
      first: event.first ?? 0,
      rows: event.rows ?? 10,
      globalFilter: this.searchTerm || undefined,
      status: this.selectedStatus || undefined,
    };

    this.store.dispatch(new GetPortfolioLoans(params)).subscribe();
  }
}
