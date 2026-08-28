import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Store } from '@ngxs/store';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import {
  AssignedFarm,
  ExtensionFarmersState,
  ExtensionFarmsQueryParams,
  GetExtensionFarms,
} from './farmers.state';

interface AssignmentStatusFilterOption {
  label: string;
  value: string;
  icon: string;
}

interface AssignedFarmerRow {
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
  selector: 'app-farmers',
  imports: [MatIconModule, MatMenuModule, TableModule],
  templateUrl: './farmers.component.html',
  styleUrl: './farmers.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FarmersComponent {
  private readonly store = inject(Store);

  private readonly farms = this.store.selectSignal(ExtensionFarmersState.farms);
  protected readonly farmerRows = computed(() => this.farms().map((farm) => this.toRow(farm)));
  protected readonly farmersData = this.store.selectSignal(ExtensionFarmersState.farmersConfigs);
  protected readonly isLoading = this.store.selectSignal(ExtensionFarmersState.isLoading);
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
        this.dispatchFarmersLoad({ ...this.lastEvent, first: 0 });
      });
  }

  protected loadFarmers(event: TableLazyLoadEvent = {}): void {
    this.lastEvent = event;
    this.dispatchFarmersLoad();
  }

  protected onSearch(value: string): void {
    this.searchInput$.next(value.trim());
  }

  protected onStatusFilter(status: string): void {
    this.selectedStatus = status;
    this.dispatchFarmersLoad({ ...this.lastEvent, first: 0 });
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

  private toRow(farm: AssignedFarm): AssignedFarmerRow {
    const assignmentStatus = (farm.assignment?.status || 'under_review').toLowerCase();
    const isActive = ['active', 'approved'].includes(assignmentStatus);
    const isInactive = ['inactive', 'rejected', 'suspended', 'archived'].includes(assignmentStatus);
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
      isPending: !isActive && !isInactive,
    };
  }

  private formatFarmSize(sizeHectares: number | null | undefined): string {
    if (typeof sizeHectares !== 'number' || !Number.isFinite(sizeHectares)) {
      return '-';
    }

    return `${sizeHectares.toLocaleString(undefined, { maximumFractionDigits: 2 })} ha`;
  }

  private dispatchFarmersLoad(event: TableLazyLoadEvent = this.lastEvent): void {
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
