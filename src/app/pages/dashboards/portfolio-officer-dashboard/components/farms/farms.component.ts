import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatMenuModule } from '@angular/material/menu';
import { Store } from '@ngxs/store';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import {
  GetPortfolioFarms,
  PortfolioFarm,
  PortfolioFarmsQueryParams,
  PortfolioFarmsState,
} from './farms.state';

interface FarmStatusFilterOption {
  label: string;
  value: string;
  icon: string;
}

interface PortfolioFarmRow {
  farm: PortfolioFarm;
  farmLocation: string;
  farmerName: string;
  cropType: string;
  size: string;
  assignedOfficer: string;
  statusLabel: string;
  registeredDate: string;
  isActive: boolean;
  isInactive: boolean;
  isPending: boolean;
}

const farmStatusOptions: readonly FarmStatusFilterOption[] = [
  { label: 'Active', value: 'active', icon: 'check_circle' },
  { label: 'Pending', value: 'pending', icon: 'pending' },
  { label: 'Assigned', value: 'assigned', icon: 'how_to_reg' },
  { label: 'Unassigned', value: 'unassigned', icon: 'person_off' },
  { label: 'Inactive', value: 'inactive', icon: 'block' },
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

  private readonly farms = this.store.selectSignal(PortfolioFarmsState.farms);
  protected readonly farmRows = computed(() => this.farms().map((farm) => this.toRow(farm)));
  protected readonly farmsData = this.store.selectSignal(PortfolioFarmsState.farmsConfigs);
  protected readonly isLoading = this.store.selectSignal(PortfolioFarmsState.isLoading);
  protected readonly statusOptions = farmStatusOptions;

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

  private toRow(farm: PortfolioFarm): PortfolioFarmRow {
    const rawStatus = (
      farm.status ||
      farm.assignment?.status ||
      'active'
    ).toLowerCase();

    const isActive = ['active', 'verified', 'assigned'].includes(rawStatus);
    const isInactive = ['inactive', 'denied', 'suspended'].includes(rawStatus);
    const isPending = !isActive && !isInactive;

    const farmLocation =
      farm.locationLabel ||
      farm.farmName ||
      farm.location ||
      farm.community ||
      '-';

    const farmerName =
      farm.farmer?.fullName ||
      farm.farmer?.name ||
      '-';

    const cropType =
      farm.cropType ||
      farm.primaryCrop ||
      farm.farmer?.primaryCrop ||
      '-';

    const size =
      typeof farm.sizeHectares === 'number' && Number.isFinite(farm.sizeHectares)
        ? `${farm.sizeHectares} ha`
        : typeof farm.sizeAcres === 'number' && Number.isFinite(farm.sizeAcres)
          ? `${farm.sizeAcres} acres`
          : '-';

    const assignedOfficer =
      farm.assignedOfficerName ||
      farm.assignment?.officerName ||
      'Unassigned';

    const registeredDate =
      this.formatDate(farm.createdAt || farm.updatedAt) || '-';

    return {
      farm,
      farmLocation,
      farmerName,
      cropType,
      size,
      assignedOfficer,
      statusLabel: this.formatLabel(rawStatus),
      registeredDate,
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

  private dispatchFarmsLoad(event: TableLazyLoadEvent = this.lastEvent): void {
    this.lastEvent = event;
    const params: PortfolioFarmsQueryParams = {
      first: event.first ?? 0,
      rows: event.rows ?? 10,
      globalFilter: this.searchTerm || undefined,
      status: this.selectedStatus || undefined,
    };

    this.store.dispatch(new GetPortfolioFarms(params)).subscribe();
  }
}
