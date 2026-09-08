import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { ToastrService } from '../../../../../shared/toastr/toastr.service';
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
  lastActivity: string | Date | null;
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
  imports: [DatePipe, MenuModule, TableModule],
  templateUrl: './loans.component.html',
  styleUrl: './loans.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoansComponent {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);

  public readonly farmerId = input<string | undefined>();

  private readonly loans = this.store.selectSignal(PortfolioLoansState.loans);
  protected readonly loanRows = computed(() => this.loans().map((loan) => this.toRow(loan)));
  protected readonly loansData = this.store.selectSignal(PortfolioLoansState.loansConfigs);
  protected readonly isLoading = this.store.selectSignal(PortfolioLoansState.isLoading);
  protected readonly statusOptions = loanStatusOptions;

  protected selectedLoanForAction: PortfolioLoanApplication | null = null;

  protected readonly statusMenuItems: MenuItem[] = [
    {
      label: 'All statuses',
      icon: 'list',
      command: () => this.onStatusFilter(''),
    },
    ...loanStatusOptions.map((option) => ({
      label: option.label,
      icon: option.icon,
      command: () => this.onStatusFilter(option.value),
    })),
  ];

  protected readonly actionMenuItems: MenuItem[] = [
    {
      label: 'View Loan',
      icon: 'visibility',
      command: () => {
        if (this.selectedLoanForAction) {
          this.onViewLoan(this.selectedLoanForAction);
        }
      },
    },
    {
      label: 'Edit Loan',
      icon: 'edit',
      command: () => {
        if (this.selectedLoanForAction) {
          this.onEditLoan(this.selectedLoanForAction);
        }
      },
    },
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

  protected onAddLoan(): void {
    void this.router.navigate(['/dashboard/portfolio-officer/loans/add']);
  }

  protected onViewLoan(loan: PortfolioLoanApplication): void {
    // if (loan.farmerId || loan.farmer?.id) {
    //   const farmerId = loan.farmerId || loan.farmer?.id;
    //   void this.router.navigate(['/dashboard/portfolio-officer/farmers', farmerId, 'loans']);
    //   return;
    // }
    if (loan.id) {
      void this.router.navigate(['/dashboard/portfolio-officer/loans', loan.id]);
      return;
    }
    this.toastr.triggerToastr(
      'info',
      `Viewing loan: ${loan.id || loan.farmer?.fullName || 'Application'}`,
    );
  }

  protected onEditLoan(loan: PortfolioLoanApplication): void {
    if (loan.id) {
      void this.router.navigate(['/dashboard/portfolio-officer/loans/edit', loan.id]);
      return;
    }
    void this.router.navigate(['/dashboard/portfolio-officer/loans/add']);
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
      lastActivity: loan.lastActivityAt || loan.updatedAt || loan.submittedAt || null,
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

  private formatRiskScore(
    score: number | null | undefined,
    category: string | null | undefined,
  ): string {
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

  private getEffectiveFarmerId(): string | undefined {
    const inputId = this.farmerId();
    if (inputId) {
      return inputId;
    }

    return (
      this.route.snapshot.paramMap.get('farmerId') ||
      this.route.parent?.snapshot.paramMap.get('farmerId') ||
      undefined
    );
  }

  private dispatchLoansLoad(event: TableLazyLoadEvent = this.lastEvent): void {
    this.lastEvent = event;
    const params: PortfolioLoansQueryParams = {
      farmerId: this.getEffectiveFarmerId(),
      first: event.first ?? 0,
      rows: event.rows ?? 10,
      globalFilter: this.searchTerm || undefined,
      status: this.selectedStatus || undefined,
    };

    this.store.dispatch(new GetPortfolioLoans(params)).subscribe();
  }
}
