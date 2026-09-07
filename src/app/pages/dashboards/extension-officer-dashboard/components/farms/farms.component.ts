import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatMenuModule } from '@angular/material/menu';
import { Store } from '@ngxs/store';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import {
  AssignedFarm,
  ExtensionFarmsQueryParams,
  ExtensionFarmsState,
  GetExtensionFarms,
} from './farms.state';

interface AssignmentStatusFilterOption {
  label: string;
  value: string;
  icon: string;
}

interface AssignedFarmRow {
  farm: AssignedFarm;
  name: string;
  contact: string;
  crop: string;
  location: string;
  size: string;
  assignmentStatusLabel: string;
  latestVisit: string;
  isActive: boolean;
  isInactive: boolean;
  isPending: boolean;
}

const assignmentStatusOptions: readonly AssignmentStatusFilterOption[] = [
  { label: 'Active', value: 'active', icon: 'check_circle' },
  { label: 'Approved', value: 'approved', icon: 'verified' },
  { label: 'Under Review', value: 'under_review', icon: 'pending' },
  { label: 'Suspended', value: 'suspended', icon: 'block' },
  { label: 'Inactive', value: 'inactive', icon: 'pause_circle' },
];

@Component({
  selector: 'app-farms',
  imports: [MatMenuModule, TableModule],
  templateUrl: './farms.component.html',
  styleUrl: './farms.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FarmsComponent {
  private readonly store = inject(Store);

  private readonly farms = this.store.selectSignal(ExtensionFarmsState.farms);
  protected readonly farmRows = computed(() => this.farms().map((farm) => this.toRow(farm)));
  protected readonly farmsData = this.store.selectSignal(ExtensionFarmsState.farmsConfigs);
  protected readonly isLoading = this.store.selectSignal(ExtensionFarmsState.isLoading);
  protected readonly statusOptions = assignmentStatusOptions;

  private lastEvent: TableLazyLoadEvent = {};
  private searchTerm = '';
  protected selectedStatus = '';

  private readonly searchInput$ = new Subject<string>();

  constructor() {
    this.searchInput$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((value) => {
        this.searchTerm = value;
        this.dispatchFarmsLoad({ ...this.lastEvent, first: 0 });
      });
  }

  protected loadFarms(event: TableLazyLoadEvent = {}): void {
    this.lastEvent = event;
    this.dispatchFarmsLoad();
  }

  protected onSearch(value: string): void {
    this.searchInput$.next(value.trim());
  }

  protected onStatusFilter(status: string): void {
    this.selectedStatus = status;
    this.dispatchFarmsLoad({ ...this.lastEvent, first: 0 });
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

  private toRow(farm: AssignedFarm): AssignedFarmRow {
    const assignmentStatus = (farm.assignment?.status || farm.status || 'under_review').toLowerCase();
    const isActive = ['active', 'approved', 'assigned'].includes(assignmentStatus);
    const isInactive = ['inactive', 'rejected', 'suspended', 'archived'].includes(assignmentStatus);
    const isPending = !isActive && !isInactive;
    const latestVisitStatus = farm.latestVisit?.status ? this.formatLabel(farm.latestVisit.status) : 'No visit';

    return {
      farm,
      name: farm.farmer?.fullName || '-',
      contact: farm.farmer?.phone || '-',
      crop: farm.cropType || farm.farmer?.primaryCrop || '-',
      location: farm.locationLabel || '-',
      size: this.formatFarmSize(farm.sizeHectares),
      assignmentStatusLabel: this.formatLabel(assignmentStatus),
      latestVisit: latestVisitStatus,
      isActive,
      isInactive,
      isPending,
    };
  }

  private formatFarmSize(sizeHectares: number | null | undefined): string {
    if (typeof sizeHectares !== 'number' || !Number.isFinite(sizeHectares)) {
      return '-';
    }

    return `${sizeHectares.toLocaleString(undefined, { maximumFractionDigits: 2 })} ha`;
  }

  private dispatchFarmsLoad(event: TableLazyLoadEvent = this.lastEvent): void {
    this.lastEvent = event;
    const params: ExtensionFarmsQueryParams = {
      first: event.first ?? 0,
      rows: event.rows ?? 10,
      globalFilter: this.searchTerm || undefined,
      assignmentStatus: this.selectedStatus || undefined,
    };

    this.store.dispatch(new GetExtensionFarms(params)).subscribe();
  }
}
