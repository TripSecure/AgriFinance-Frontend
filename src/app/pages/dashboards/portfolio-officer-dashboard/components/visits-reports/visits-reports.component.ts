import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatMenuModule } from '@angular/material/menu';
import { Store } from '@ngxs/store';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import {
  GetPortfolioMonitoringVisits,
  MonitoringVisitsQueryParams,
  PortfolioMonitoringVisit,
  PortfolioMonitoringVisitsState,
} from './visits-reports.state';

interface ReportStatusFilterOption {
  label: string;
  value: string;
  icon: string;
}

interface MonitoringVisitRow {
  visit: PortfolioMonitoringVisit;
  farmerName: string;
  farmLocation: string;
  crop: string;
  officerName: string;
  visitDate: string;
  yieldEstimate: string;
  riskAssessment: string;
  statusLabel: string;
  lastActivity: string;
  isSuccess: boolean;
  isDanger: boolean;
  isWarning: boolean;
}

const visitStatusOptions: readonly ReportStatusFilterOption[] = [
  { label: 'Completed', value: 'completed', icon: 'task_alt' },
  { label: 'Reviewed', value: 'reviewed', icon: 'verified' },
  { label: 'Submitted', value: 'submitted', icon: 'upload' },
  { label: 'Scheduled', value: 'scheduled', icon: 'schedule' },
  { label: 'Flagged', value: 'flagged', icon: 'warning' },
];

@Component({
  selector: 'app-visits-reports',
  imports: [MatMenuModule, TableModule],
  templateUrl: './visits-reports.component.html',
  styleUrl: './visits-reports.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisitsReportsComponent {
  private readonly store = inject(Store);

  private readonly visits = this.store.selectSignal(PortfolioMonitoringVisitsState.visits);
  protected readonly visitRows = computed(() => this.visits().map((v) => this.toRow(v)));
  protected readonly visitsData = this.store.selectSignal(PortfolioMonitoringVisitsState.visitsConfigs);
  protected readonly isLoading = this.store.selectSignal(PortfolioMonitoringVisitsState.isLoading);
  protected readonly statusOptions = visitStatusOptions;

  private lastEvent: TableLazyLoadEvent = {};
  private searchTerm = '';
  protected selectedStatus = '';

  private readonly searchInput$ = new Subject<string>();

  constructor() {
    this.searchInput$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((value) => {
        this.searchTerm = value;
        this.dispatchVisitsLoad({ ...this.lastEvent, first: 0 });
      });
  }

  protected loadVisits(event: TableLazyLoadEvent = {}): void {
    this.lastEvent = event;
    this.dispatchVisitsLoad();
  }

  protected onSearch(value: string): void {
    this.searchInput$.next(value.trim());
  }

  protected onStatusFilter(status: string): void {
    this.selectedStatus = status;
    this.dispatchVisitsLoad({ ...this.lastEvent, first: 0 });
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

  private toRow(visit: PortfolioMonitoringVisit): MonitoringVisitRow {
    const rawStatus = (
      visit.status ||
      visit.approvalStatus ||
      'completed'
    ).toLowerCase();

    const isSuccess = ['completed', 'reviewed', 'approved'].includes(rawStatus);
    const isDanger = ['flagged', 'rejected', 'high_risk'].includes(rawStatus) || !!visit.alertGenerated;
    const isWarning = ['submitted', 'pending', 'scheduled'].includes(rawStatus) && !isDanger;

    const farmerName =
      visit.farmer?.fullName ||
      visit.farmer?.name ||
      visit.farmerName ||
      '-';

    const farmLocation =
      visit.farm?.locationLabel ||
      visit.farmLocation ||
      '-';

    const crop =
      visit.farm?.cropType ||
      visit.cropType ||
      '-';

    const officerName =
      visit.officer?.fullName ||
      visit.officer?.name ||
      visit.officerName ||
      '-';

    const yieldEstimate =
      typeof visit.yieldEstimate === 'number' && Number.isFinite(visit.yieldEstimate)
        ? `${visit.yieldEstimate} bags`
        : '-';

    const riskAssessment = visit.alertGenerated
      ? 'Alert Generated'
      : visit.riskNotes || 'Normal';

    const lastActivity =
      visit.lastActivityLabel ||
      this.formatDate(visit.reviewedAt || visit.submittedAt || visit.updatedAt || visit.createdAt) ||
      '-';

    return {
      visit,
      farmerName,
      farmLocation,
      crop,
      officerName,
      visitDate: this.formatDate(visit.visitDate) || '-',
      yieldEstimate,
      riskAssessment,
      statusLabel: this.formatLabel(rawStatus),
      lastActivity,
      isSuccess,
      isDanger,
      isWarning,
    };
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

  private dispatchVisitsLoad(event: TableLazyLoadEvent = this.lastEvent): void {
    this.lastEvent = event;
    const params: MonitoringVisitsQueryParams = {
      first: event.first ?? 0,
      rows: event.rows ?? 10,
      globalFilter: this.searchTerm || undefined,
      status: this.selectedStatus || undefined,
    };

    this.store.dispatch(new GetPortfolioMonitoringVisits(params)).subscribe();
  }
}
