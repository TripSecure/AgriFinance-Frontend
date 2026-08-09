import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Farmer, FarmersQueryParams, FarmersState, GetPortfolioFarmers } from './farmers.state';

interface StatusFilterOption {
  label: string;
  value: string;
  icon: string;
}

export interface FarmerRow {
  farmer: Farmer;
  name: string;
  contact: string;
  location: string;
  statusLabel: string;
  createdAt: string;
  isActive: boolean;
  isInactive: boolean;
  isPending: boolean;
}

const statusFilterOptions: readonly StatusFilterOption[] = [
  { label: 'Active', value: 'active', icon: 'check_circle' },
  { label: 'Pending', value: 'pending', icon: 'pending' },
  { label: 'Inactive', value: 'inactive', icon: 'block' },
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
  protected readonly router = inject(Router);

  private readonly farmers = this.store.selectSignal(FarmersState.farmers);
  protected readonly farmerRows = computed(() => this.farmers().map((farmer) => this.toRow(farmer)));
  protected readonly farmersData = this.store.selectSignal(FarmersState.farmersConfigs);
  protected readonly isLoading = this.store.selectSignal(FarmersState.isLoading);
  protected readonly statusOptions = statusFilterOptions;

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

  protected onAddFarmer(): void {
    void this.router.navigate(['/dashboard/portfolio-officer/farmers/add']);
  }

  protected onFarmerSelected(farmer: Farmer): void {
    if (!farmer.id) {
      return;
    }

    void this.router.navigate(['/dashboard/portfolio-officer/farmers', farmer.id]);
  }

  protected onFarmerRowKeydown(event: KeyboardEvent, farmer: Farmer): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    this.onFarmerSelected(farmer);
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

  private toRow(farmer: Farmer): FarmerRow {
    const status = (farmer.approvalStatus || farmer.status || 'pending').toLowerCase();
    const isActive = status === 'active';
    const isInactive = ['inactive', 'denied', 'rejected', 'suspended'].includes(status);

    return {
      farmer,
      name:
        farmer.fullName ||
        farmer.full_name ||
        [farmer.firstName, farmer.lastName].filter(Boolean).join(' ') ||
        '-',
      contact: farmer.email || farmer.phone || farmer.phoneNumber || '-',
      location: farmer.community || farmer.location || farmer.region || '-',
      statusLabel: this.formatLabel(status),
      createdAt: farmer.createdAt || farmer.dateCreated || '-',
      isActive,
      isInactive,
      isPending: !isActive && !isInactive,
    };
  }

  private dispatchFarmersLoad(event: TableLazyLoadEvent = this.lastEvent): void {
    this.lastEvent = event;
    const params: FarmersQueryParams = {
      first: event.first ?? 0,
      rows: event.rows ?? 10,
      sortField: this.getSortField(event.sortField),
      sortOrder: event.sortOrder ?? undefined,
      globalFilter: this.searchTerm || undefined,
      status: this.selectedStatus || undefined,
    };

    this.store.dispatch(new GetPortfolioFarmers(params)).subscribe();
  }

  private getSortField(sortField: string | string[] | null | undefined): string | undefined {
    if (Array.isArray(sortField)) {
      return sortField[0];
    }

    return sortField ?? undefined;
  }
}
