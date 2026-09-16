import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
  ExtensionOfficerActivityItem,
  ExtensionOfficersQueryParams,
  GetPortfolioExtensionOfficers,
  PortfolioExtensionOfficersState,
} from './extension-officers.state';

interface OfficerStatusFilterOption {
  label: string;
  value: string;
  icon: string;
}

interface ExtensionOfficerRow {
  officer: ExtensionOfficerActivityItem;
  name: string;
  region: string;
  farmsMonitored: number;
  reportsSubmitted: number;
  riskFlagsLabel: string;
  riskFlagsTone: string;
  lastVisit: string | Date | null;
}

interface ExtensionOfficerDetail {
  officer?: { fullName?: string | null; region?: string | null } | null;
  summary?: {
    assignedFarmCount?: number;
    totalVisits?: number;
    reportsSubmitted?: { total?: number } | null;
    monitoringAccuracy?: { percent?: number } | null;
    riskFlagsRaised?: { label?: string; tone?: string } | null;
  } | null;
  recentVisits?: Array<{
    visitId: string;
    farmerName?: string | null;
    visitDate?: string | null;
    status?: string | null;
  }>;
}

const officerActivityOptions: readonly OfficerStatusFilterOption[] = [
  { label: 'All Activities', value: 'all', icon: 'list' },
  { label: 'Monitoring Visits', value: 'monitoring_visits', icon: 'event_note' },
  { label: 'Reports Submitted', value: 'reports_submitted', icon: 'description' },
  { label: 'Risk Flags Raised', value: 'risk_flags', icon: 'flag' },
];

@Component({
  selector: 'app-extension-officers',
  imports: [DatePipe, DialogModule, MenuModule, TableModule],
  templateUrl: './extension-officers.component.html',
  styleUrl: './extension-officers.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExtensionOfficersComponent {
  private readonly store = inject(Store);
  private readonly http = inject(HttpClient);
  private readonly toastr = inject(ToastrService);

  private readonly officers = this.store.selectSignal(PortfolioExtensionOfficersState.officers);
  protected readonly officerRows = computed(() => this.officers().map((officer) => this.toRow(officer)));
  protected readonly officersData = this.store.selectSignal(PortfolioExtensionOfficersState.officersConfigs);
  protected readonly officersSummary = this.store.selectSignal(PortfolioExtensionOfficersState.summary);
  protected readonly farmTypes = this.store.selectSignal(PortfolioExtensionOfficersState.farmTypes);
  protected readonly isLoading = this.store.selectSignal(PortfolioExtensionOfficersState.isLoading);
  protected readonly activityOptions = officerActivityOptions;

  protected readonly statusMenuItems: MenuItem[] = [
    ...officerActivityOptions.map((option) => ({
      label: option.label,
      icon: option.icon,
      command: () => this.onActivityFilter(option.value),
    })),
  ];

  protected readonly timeframeMenuItems: MenuItem[] = [
    { label: 'Last 30 days', command: () => this.onTimeframeFilter(30) },
    { label: 'Last 90 days', command: () => this.onTimeframeFilter(90) },
    { label: 'Last 365 days', command: () => this.onTimeframeFilter(365) },
  ];

  protected readonly farmTypeMenuItems = computed<MenuItem[]>(() => [
    { label: 'All Types', command: () => this.onFarmTypeFilter('') },
    ...this.farmTypes().map((option) => ({
      label: option.label,
      command: () => this.onFarmTypeFilter(option.value),
    })),
  ]);

  protected readonly actionMenuItems: MenuItem[] = [
    { label: 'View detail', icon: 'visibility', command: () => this.openOfficerDetail() },
    { label: 'Send follow-up notification', icon: 'send', command: () => this.performAction('send_follow_up') },
    { label: 'Request status update', icon: 'update', command: () => this.performAction('request_status_update') },
  ];

  private lastEvent: TableLazyLoadEvent = {};
  private searchTerm = '';
  protected selectedActivity = 'all';
  protected selectedTimeframe = 30;
  protected selectedFarmType = '';
  protected selectedOfficerForAction: ExtensionOfficerActivityItem | null = null;
  protected readonly isLoadingDetail = signal(false);
  protected readonly officerDetail = signal<ExtensionOfficerDetail | null>(null);

  private readonly searchInput$ = new Subject<string>();

  constructor() {
    this.searchInput$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((value) => {
        this.searchTerm = value;
        this.dispatchOfficersLoad({ ...this.lastEvent, first: 0 });
      });
  }

  protected loadOfficers(event: TableLazyLoadEvent = {}): void {
    this.lastEvent = event;
    this.dispatchOfficersLoad();
  }

  protected onSearch(value: string): void {
    this.searchInput$.next(value.trim());
  }

  protected onActivityFilter(activity: string): void {
    this.selectedActivity = activity;
    this.dispatchOfficersLoad({ ...this.lastEvent, first: 0 });
  }

  protected onTimeframeFilter(timeframeDays: number): void {
    this.selectedTimeframe = timeframeDays;
    this.dispatchOfficersLoad({ ...this.lastEvent, first: 0 });
  }

  protected selectedActivityLabel(): string {
    return officerActivityOptions.find((option) => option.value === this.selectedActivity)?.label ?? 'All Activities';
  }

  protected selectedTimeframeLabel(): string {
    return `Last ${this.selectedTimeframe} days`;
  }

  protected onFarmTypeFilter(farmType: string): void {
    this.selectedFarmType = farmType;
    this.dispatchOfficersLoad({ ...this.lastEvent, first: 0 });
  }

  protected selectedFarmTypeLabel(): string {
    return this.farmTypes().find((option) => option.value === this.selectedFarmType)?.label ?? 'All Types';
  }

  protected formatChange(value: number): string {
    const direction = value >= 0 ? '↑' : '↓';
    return `${direction} ${Math.abs(value)}%`;
  }

  protected openActionMenu(officer: ExtensionOfficerActivityItem, event: Event, menu: { toggle: (event: Event) => void }): void {
    this.selectedOfficerForAction = officer;
    menu.toggle(event);
  }

  protected performAction(action: 'send_follow_up' | 'request_status_update'): void {
    const officer = this.selectedOfficerForAction;
    const officerId = officer?.officerId || officer?.id;
    if (!officerId) return;

    this.http
      .post(
        `${environment.api}/portfolio/extension-officers/activity/${encodeURIComponent(officerId)}/actions`,
        { action },
        { withCredentials: true },
      )
      .subscribe({
        next: () => this.toastr.triggerToastr('success', 'Notification sent to the extension officer.'),
        error: () => this.toastr.triggerToastr('error', 'Unable to send the notification.'),
      });
  }

  protected openOfficerDetail(): void {
    const officer = this.selectedOfficerForAction;
    const officerId = officer?.officerId || officer?.id;
    if (!officerId) return;

    this.isLoadingDetail.set(true);
    this.http
      .get<{ data?: ExtensionOfficerDetail }>(
        `${environment.api}/portfolio/extension-officers/activity/${encodeURIComponent(officerId)}`,
        { withCredentials: true },
      )
      .subscribe({
        next: (response) => this.officerDetail.set(response.data ?? null),
        error: () => {
          this.isLoadingDetail.set(false);
          this.toastr.triggerToastr('error', 'Unable to load extension officer details.');
        },
        complete: () => this.isLoadingDetail.set(false),
      });
  }

  protected closeOfficerDetail(): void {
    this.officerDetail.set(null);
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

  private toRow(officer: ExtensionOfficerActivityItem): ExtensionOfficerRow {
    const name =
      officer.officerName ||
      officer.fullName ||
      officer.name ||
      officer.personalInformation?.fullName ||
      '-';

    const region =
      officer.region ||
      officer.regionDistrict ||
      officer.employmentDetails?.regionDistrict ||
      '-';

    const riskFlags = officer.riskFlagsRaised;

    return {
      officer,
      name,
      region,
      farmsMonitored: officer.farmsMonitored ?? 0,
      reportsSubmitted: officer.reportsSubmitted ?? 0,
      riskFlagsLabel: riskFlags?.label || 'No Flags',
      riskFlagsTone: riskFlags?.tone || 'neutral',
      lastVisit: officer.lastVisitAt || null,
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

  private dispatchOfficersLoad(event: TableLazyLoadEvent = this.lastEvent): void {
    this.lastEvent = event;
    const params: ExtensionOfficersQueryParams = {
      first: event.first ?? 0,
      rows: event.rows ?? 10,
      farmerSearch: this.searchTerm || undefined,
      timeframeDays: this.selectedTimeframe,
      activity: this.selectedActivity,
      farmType: this.selectedFarmType || undefined,
    };

    this.store.dispatch(new GetPortfolioExtensionOfficers(params)).subscribe();
  }
}
