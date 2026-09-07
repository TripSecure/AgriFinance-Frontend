import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatMenuModule } from '@angular/material/menu';
import { Store } from '@ngxs/store';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import {
  ExtensionFarmer,
  ExtensionFarmersQueryParams,
  ExtensionFarmersState,
  GetExtensionFarmers,
} from './farmers.state';

interface StatusFilterOption {
  label: string;
  value: string;
  icon: string;
}

interface ExtensionFarmerRow {
  farmer: ExtensionFarmer;
  name: string;
  contact: string;
  location: string;
  primaryCrop: string;
  farmsCount: number;
  statusLabel: string;
  lastVisit: string;
  isActive: boolean;
  isInactive: boolean;
  isPending: boolean;
}

const statusOptions: readonly StatusFilterOption[] = [
  { label: 'Active', value: 'active', icon: 'check_circle' },
  { label: 'Pending', value: 'pending', icon: 'pending' },
  { label: 'Approved', value: 'approved', icon: 'verified' },
  { label: 'Inactive', value: 'inactive', icon: 'block' },
  { label: 'Suspended', value: 'suspended', icon: 'warning' },
];

@Component({
  selector: 'app-farmers',
  imports: [MatMenuModule, TableModule],
  templateUrl: './farmers.component.html',
  styleUrl: './farmers.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FarmersComponent {
  private readonly store = inject(Store);

  private readonly farmers = this.store.selectSignal(ExtensionFarmersState.farmers);
  protected readonly farmerRows = computed(() => this.farmers().map((farmer) => this.toRow(farmer)));
  protected readonly farmersData = this.store.selectSignal(ExtensionFarmersState.farmersConfigs);
  protected readonly isLoading = this.store.selectSignal(ExtensionFarmersState.isLoading);
  protected readonly statusOptions = statusOptions;

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

  private toRow(farmer: ExtensionFarmer): ExtensionFarmerRow {
    const rawStatus = (
      farmer.status ||
      farmer.approvalStatus ||
      'active'
    ).toLowerCase();

    const isActive = ['active', 'approved', 'verified'].includes(rawStatus);
    const isInactive = ['inactive', 'denied', 'suspended', 'rejected'].includes(rawStatus);
    const isPending = !isActive && !isInactive;

    const name =
      farmer.fullName ||
      [farmer.firstName, farmer.lastName].filter(Boolean).join(' ') ||
      '-';

    const contact =
      [farmer.phone || farmer.phoneNumber, farmer.email].filter(Boolean).join(' / ') ||
      '-';

    const location =
      farmer.community ||
      farmer.location ||
      farmer.region ||
      '-';

    const primaryCrop =
      farmer.primaryCrop ||
      (farmer.cropTypes && farmer.cropTypes.length ? farmer.cropTypes.join(', ') : '-') ||
      '-';

    const farmsCount =
      farmer.farmsCount ??
      farmer.totalFarms ??
      1;

    const lastVisit =
      farmer.lastActivityLabel ||
      this.formatDate(farmer.lastVisitDate || farmer.updatedAt || farmer.createdAt) ||
      'No visits yet';

    return {
      farmer,
      name,
      contact,
      location,
      primaryCrop: this.formatLabel(primaryCrop),
      farmsCount,
      statusLabel: this.formatLabel(rawStatus),
      lastVisit,
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

  private dispatchFarmersLoad(event: TableLazyLoadEvent = this.lastEvent): void {
    this.lastEvent = event;
    const params: ExtensionFarmersQueryParams = {
      first: event.first ?? 0,
      rows: event.rows ?? 10,
      globalFilter: this.searchTerm || undefined,
      status: this.selectedStatus || undefined,
    };

    this.store.dispatch(new GetExtensionFarmers(params)).subscribe();
  }
}
