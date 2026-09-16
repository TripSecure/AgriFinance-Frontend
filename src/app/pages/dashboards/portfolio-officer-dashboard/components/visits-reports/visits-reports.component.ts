import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { DialogModule } from 'primeng/dialog';
import { Store } from '@ngxs/store';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { environment } from '../../../../../../environment/environment';
import { ToastrService } from '../../../../../shared/toastr/toastr.service';
import {
  GetAvailablePortfolioExtensionOfficers,
  GetPortfolioExtensionOfficers,
  PortfolioExtensionOfficersState,
} from '../extension-officers/extension-officers.state';
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
  visitDate: string | Date | null;
  yieldEstimate: string;
  riskAssessment: string;
  statusLabel: string;
  lastActivity: string | Date | null;
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
  imports: [DatePipe, DialogModule, MenuModule, TableModule],
  templateUrl: './visits-reports.component.html',
  styleUrl: './visits-reports.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisitsReportsComponent {
  private readonly store = inject(Store);
  private readonly http = inject(HttpClient);
  private readonly toastr = inject(ToastrService);

  private readonly visits = this.store.selectSignal(PortfolioMonitoringVisitsState.visits);
  protected readonly visitRows = computed(() => this.visits().map((v) => this.toRow(v)));
  protected readonly visitsData = this.store.selectSignal(PortfolioMonitoringVisitsState.visitsConfigs);
  protected readonly isLoading = this.store.selectSignal(PortfolioMonitoringVisitsState.isLoading);
  private readonly officers = this.store.selectSignal(PortfolioExtensionOfficersState.officers);
  private readonly availableOfficers = this.store.selectSignal(PortfolioExtensionOfficersState.availableOfficers);
  protected readonly officerOptions = computed(() => {
    const byId = new Map<string, { id: string; name: string }>();
    [...this.officers(), ...this.availableOfficers()].forEach((officer) => {
      const id = officer.officerId || officer.id;
      if (id) {
        byId.set(id, {
          id,
          name: officer.officerName || officer.fullName || officer.name || 'Extension Officer',
        });
      }
    });
    return Array.from(byId.values());
  });
  protected readonly officerMenuItems = computed<MenuItem[]>(() => [
    { label: 'All officers', icon: 'group', command: () => this.onOfficerFilter('') },
    ...this.officerOptions().map((officer) => ({
      label: officer.name,
      icon: 'person',
      command: () => this.onOfficerFilter(officer.id),
    })),
  ]);
  protected readonly isReviewModalVisible = signal(false);
  protected readonly selectedVisit = signal<PortfolioMonitoringVisit | null>(null);
  protected reviewAction: 'approved' | 'rejected' | 'under_review' = 'approved';
  protected reviewNotes = '';
  protected readonly statusOptions = visitStatusOptions;

  protected readonly statusMenuItems: MenuItem[] = [
    {
      label: 'All statuses',
      icon: 'list',
      command: () => this.onStatusFilter(''),
    },
    ...visitStatusOptions.map((option) => ({
      label: option.label,
      icon: option.icon,
      command: () => this.onStatusFilter(option.value),
    })),
  ];

  protected readonly actionMenuItems: MenuItem[] = [
    { label: 'Review report', icon: 'fact_check', command: () => this.openReview('approved') },
  ];

  private lastEvent: TableLazyLoadEvent = {};
  private searchTerm = '';
  protected selectedStatus = '';
  protected selectedOfficerId = '';

  private readonly searchInput$ = new Subject<string>();

  constructor() {
    this.store.dispatch(new GetPortfolioExtensionOfficers({ rows: 100 })).subscribe();
    this.store.dispatch(new GetAvailablePortfolioExtensionOfficers({ rows: 100 })).subscribe();
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

  protected onOfficerFilter(officerId: string): void {
    this.selectedOfficerId = officerId;
    this.dispatchVisitsLoad({ ...this.lastEvent, first: 0 });
  }

  protected selectedOfficerLabel(): string {
    return this.officerOptions().find((officer) => officer.id === this.selectedOfficerId)?.name ?? 'All officers';
  }

  protected openReview(action: 'approved' | 'rejected' | 'under_review'): void {
    if (!this.selectedVisit()) return;
    this.reviewAction = action;
    this.reviewNotes = '';
    this.isReviewModalVisible.set(true);
  }

  protected openActionMenu(visit: PortfolioMonitoringVisit, event: Event, menu: { toggle: (event: Event) => void }): void {
    this.selectedVisit.set(visit);
    menu.toggle(event);
  }

  protected submitReview(): void {
    const visit = this.selectedVisit();
    if (!visit?.id) return;

    this.http
      .post(`${environment.api}/portfolio/monitoring-visits/${encodeURIComponent(visit.id)}/review`, {
        action: this.reviewAction,
        notes: this.reviewNotes.trim() || null,
      }, { withCredentials: true })
      .subscribe({
        next: () => {
          this.isReviewModalVisible.set(false);
          this.toastr.triggerToastr('success', `Report ${this.reviewAction === 'approved' ? 'approved' : 'updated'} successfully.`);
          this.dispatchVisitsLoad();
        },
        error: () => this.toastr.triggerToastr('error', 'Unable to review this monitoring report.'),
      });
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
      visit.farmer?.farmDetails?.farmAddress ||
      '-';

    const crop =
      visit.farm?.cropType ||
      visit.cropType ||
      visit.farmer?.farmDetails?.primaryCrop ||
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

    const visitDate = visit.visitDate || visit.visitScheduling?.date || null;
    const lastActivity =
      visit.reviewedAt || visit.submittedAt || visit.updatedAt || visit.createdAt || null;

    return {
      visit,
      farmerName,
      farmLocation,
      crop,
      officerName,
      visitDate,
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
      officerId: this.selectedOfficerId || undefined,
      timeframeDays: 365,
    };

    this.store.dispatch(new GetPortfolioMonitoringVisits(params)).subscribe();
  }
}
