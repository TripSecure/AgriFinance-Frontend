import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatMenuModule } from '@angular/material/menu';
import { Store } from '@ngxs/store';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import {
  FarmVisit,
  FarmVisitsQueryParams,
  FarmVisitsState,
  GetExtensionFarmVisits,
} from './farm-visits.state';

interface VisitStatusFilterOption {
  label: string;
  value: string;
  icon: string;
}

interface TimeframeFilterOption {
  label: string;
  value: number;
}

interface FarmVisitRow {
  visit: FarmVisit;
  farmerName: string;
  contact: string;
  farm: string;
  crop: string;
  visitDate: string;
  statusLabel: string;
  latestActivity: string;
  alertLabel: string;
  isApproved: boolean;
  isRejected: boolean;
  isPending: boolean;
}

const visitStatusOptions: readonly VisitStatusFilterOption[] = [
  { label: 'Draft', value: 'draft', icon: 'edit_note' },
  { label: 'Submitted', value: 'submitted', icon: 'upload' },
  { label: 'Under Review', value: 'under_review', icon: 'pending' },
  { label: 'Approved', value: 'approved', icon: 'verified' },
  { label: 'Rejected', value: 'rejected', icon: 'block' },
];

const timeframeOptions: readonly TimeframeFilterOption[] = [
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
  { label: 'Last 365 days', value: 365 },
];

@Component({
  selector: 'app-farm-visits',
  imports: [MatMenuModule, TableModule],
  templateUrl: './farm-visits.component.html',
  styleUrl: './farm-visits.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FarmVisitsComponent {
  private readonly store = inject(Store);

  private readonly visits = this.store.selectSignal(FarmVisitsState.visits);
  protected readonly visitRows = computed(() => this.visits().map((visit) => this.toRow(visit)));
  protected readonly visitsData = this.store.selectSignal(FarmVisitsState.visitsConfigs);
  protected readonly isLoading = this.store.selectSignal(FarmVisitsState.isLoading);
  protected readonly statusOptions = visitStatusOptions;
  protected readonly timeframeOptions = timeframeOptions;

  private lastEvent: TableLazyLoadEvent = {};
  private searchTerm = '';
  protected selectedStatus = '';
  protected selectedTimeframe = 30;

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

  protected onTimeframeFilter(timeframeDays: number): void {
    this.selectedTimeframe = timeframeDays;
    this.dispatchVisitsLoad({ ...this.lastEvent, first: 0 });
  }

  protected selectedTimeframeLabel(): string {
    return this.timeframeOptions.find((option) => option.value === this.selectedTimeframe)?.label ?? 'Last 30 days';
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

  private toRow(visit: FarmVisit): FarmVisitRow {
    const status = (visit.status || 'draft').toLowerCase();
    const isApproved = status === 'approved';
    const isRejected = status === 'rejected';

    return {
      visit,
      farmerName: visit.farmer?.fullName || '-',
      contact: visit.farmer?.phone || '-',
      farm: visit.farm?.locationLabel || '-',
      crop: visit.farm?.cropType || '-',
      visitDate: this.formatDate(visit.visitDate),
      statusLabel: this.formatLabel(status),
      latestActivity: visit.lastActivityLabel || this.formatDate(visit.updatedAt) || '-',
      alertLabel: visit.alertGenerated ? 'Alert raised' : 'No alert',
      isApproved,
      isRejected,
      isPending: !isApproved && !isRejected,
    };
  }

  private formatDate(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  }

  private dispatchVisitsLoad(event: TableLazyLoadEvent = this.lastEvent): void {
    this.lastEvent = event;
    const params: FarmVisitsQueryParams = {
      first: event.first ?? 0,
      rows: event.rows ?? 10,
      globalFilter: this.searchTerm || undefined,
      status: this.selectedStatus || undefined,
      timeframeDays: this.selectedTimeframe,
    };

    this.store.dispatch(new GetExtensionFarmVisits(params)).subscribe();
  }
}
