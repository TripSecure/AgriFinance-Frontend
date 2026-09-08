import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { Store } from '@ngxs/store';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
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
  staffId: string;
  region: string;
  contact: string;
  assignedFarmers: number;
  completedVisits: number;
  statusLabel: string;
  lastActivity: string | Date | null;
  isActive: boolean;
  isInactive: boolean;
  isPending: boolean;
}

const officerStatusOptions: readonly OfficerStatusFilterOption[] = [
  { label: 'Active', value: 'active', icon: 'check_circle' },
  { label: 'Pending', value: 'pending', icon: 'pending' },
  { label: 'Approved', value: 'approved', icon: 'verified' },
  { label: 'Inactive', value: 'inactive', icon: 'block' },
  { label: 'Suspended', value: 'suspended', icon: 'warning' },
];

@Component({
  selector: 'app-extension-officers',
  imports: [DatePipe, MenuModule, TableModule],
  templateUrl: './extension-officers.component.html',
  styleUrl: './extension-officers.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExtensionOfficersComponent {
  private readonly store = inject(Store);

  private readonly officers = this.store.selectSignal(PortfolioExtensionOfficersState.officers);
  protected readonly officerRows = computed(() => this.officers().map((officer) => this.toRow(officer)));
  protected readonly officersData = this.store.selectSignal(PortfolioExtensionOfficersState.officersConfigs);
  protected readonly isLoading = this.store.selectSignal(PortfolioExtensionOfficersState.isLoading);
  protected readonly statusOptions = officerStatusOptions;

  protected readonly statusMenuItems: MenuItem[] = [
    {
      label: 'All statuses',
      icon: 'list',
      command: () => this.onStatusFilter(''),
    },
    ...officerStatusOptions.map((option) => ({
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

  protected onStatusFilter(status: string): void {
    this.selectedStatus = status;
    this.dispatchOfficersLoad({ ...this.lastEvent, first: 0 });
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
    const rawStatus = (
      officer.status ||
      officer.approvalStatus ||
      'active'
    ).toLowerCase();
    const isActive = ['active', 'approved', 'verified'].includes(rawStatus);
    const isInactive = ['inactive', 'suspended', 'rejected', 'blocked'].includes(rawStatus);
    const isPending = !isActive && !isInactive;

    const name =
      officer.fullName ||
      officer.name ||
      officer.personalInformation?.fullName ||
      '-';

    const staffId =
      officer.staffId ||
      officer.employmentDetails?.staffId ||
      officer.officerId ||
      '-';

    const region =
      officer.region ||
      officer.regionDistrict ||
      officer.employmentDetails?.regionDistrict ||
      '-';

    const phone = officer.phone || officer.personalInformation?.phone;
    const email = officer.email || officer.personalInformation?.email;
    const contact = [phone, email].filter(Boolean).join(' / ') || '-';

    const assignedFarmers =
      officer.assignedFarmersCount ??
      officer.metrics?.assignedFarmersCount ??
      0;

    const completedVisits =
      officer.completedVisitsCount ??
      officer.metrics?.completedVisitsCount ??
      officer.metrics?.totalVisitsCount ??
      0;

    const lastActivity =
      officer.lastActiveAt || officer.lastActivityAt || officer.updatedAt || null;

    return {
      officer,
      name,
      staffId,
      region,
      contact,
      assignedFarmers,
      completedVisits,
      statusLabel: this.formatLabel(rawStatus),
      lastActivity,
      isActive,
      isInactive,
      isPending,
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
      globalFilter: this.searchTerm || undefined,
      status: this.selectedStatus || undefined,
    };

    this.store.dispatch(new GetPortfolioExtensionOfficers(params)).subscribe();
  }
}
