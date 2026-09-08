import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { ConfirmModalComponent } from '../../../../../shared/confirm-modal/confirm-modal.component';
import { ToastrService } from '../../../../../shared/toastr/toastr.service';
import {
  DeletePortfolioFarm,
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
  registeredDate: string | Date | null;
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
  imports: [DatePipe, MenuModule, TableModule],
  templateUrl: './farms.component.html',
  styleUrl: './farms.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FarmsComponent {
  private readonly dialog = inject(MatDialog);
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);

  public readonly farmerId = input<string | undefined>();

  private readonly farms = this.store.selectSignal(PortfolioFarmsState.farms);
  protected readonly farmRows = computed(() => this.farms().map((farm) => this.toRow(farm)));
  protected readonly farmsData = this.store.selectSignal(PortfolioFarmsState.farmsConfigs);
  protected readonly isLoading = this.store.selectSignal(PortfolioFarmsState.isLoading);
  protected readonly statusOptions = farmStatusOptions;

  protected selectedFarmForAction: PortfolioFarm | null = null;

  protected readonly statusMenuItems: MenuItem[] = [
    {
      label: 'All statuses',
      icon: 'list',
      command: () => this.onStatusFilter(''),
    },
    ...farmStatusOptions.map((option) => ({
      label: option.label,
      icon: option.icon,
      command: () => this.onStatusFilter(option.value),
    })),
  ];

  protected readonly actionMenuItems: MenuItem[] = [
    {
      label: 'View Farm',
      icon: 'visibility',
      command: () => {
        if (this.selectedFarmForAction) {
          this.onViewFarm(this.selectedFarmForAction);
        }
      },
    },
    {
      label: 'Edit Farm',
      icon: 'edit',
      command: () => {
        if (this.selectedFarmForAction) {
          this.onEditFarm(this.selectedFarmForAction);
        }
      },
    },
    {
      label: 'Assign Extension Officer',
      icon: 'person_add',
      command: () => {
        if (this.selectedFarmForAction) {
          this.onAssignOfficer(this.selectedFarmForAction);
        }
      },
    },
    {
      label: 'Schedule Visit',
      icon: 'calendar_month',
      command: () => {
        if (this.selectedFarmForAction) {
          this.onScheduleVisit(this.selectedFarmForAction);
        }
      },
    },
    {
      label: 'Delete Farm',
      icon: 'delete',
      command: () => {
        if (this.selectedFarmForAction) {
          this.onDeleteFarm(this.selectedFarmForAction);
        }
      },
    },
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

  protected onAddFarm(): void {
    const farmerId = this.getEffectiveFarmerId();
    if (farmerId) {
      void this.router.navigate(['/dashboard/portfolio-officer/farms/add'], {
        queryParams: { farmerId },
      });
      return;
    }
    void this.router.navigate(['/dashboard/portfolio-officer/farms/add']);
  }

  protected onViewFarm(farm: PortfolioFarm): void {
    // if (farm.farmerId || farm.farmer?.id) {
    //   const farmerId = farm.farmerId || farm.farmer?.id;
    //   void this.router.navigate(['/dashboard/portfolio-officer/farmers', farmerId, 'farms']);
    //   return;
    // }
    if (farm.id) {
      void this.router.navigate(['/dashboard/portfolio-officer/farms', farm.id]);
      return;
    }
    this.toastr.triggerToastr(
      'info',
      `Viewing farm: ${farm.farmName || farm.locationLabel || 'Details'}`,
    );
  }

  protected onEditFarm(farm: PortfolioFarm): void {
    if (farm.id) {
      void this.router.navigate(['/dashboard/portfolio-officer/farms/edit', farm.id]);
      return;
    }
    void this.router.navigate(['/dashboard/portfolio-officer/farms/add']);
  }

  protected onAssignOfficer(farm: PortfolioFarm): void {
    this.toastr.triggerToastr(
      'info',
      `Assign extension officer for: ${farm.farmName || farm.locationLabel || farm.id}`,
    );
  }

  protected onScheduleVisit(farm: PortfolioFarm): void {
    this.toastr.triggerToastr(
      'info',
      `Schedule visit for: ${farm.farmName || farm.locationLabel || farm.id}`,
    );
  }

  protected onDeleteFarm(farm: PortfolioFarm): void {
    if (!farm.id) {
      this.toastr.triggerToastr('error', 'Unable to delete this farm.');
      return;
    }

    this.dialog
      .open(ConfirmModalComponent, { disableClose: true })
      .afterClosed()
      .subscribe((confirmed?: boolean) => {
        if (!confirmed) {
          return;
        }

        const farmerId = farm.farmerId || farm.farmer?.id || this.getEffectiveFarmerId();
        this.store.dispatch(new DeletePortfolioFarm(farm.id, farmerId)).subscribe({
          next: () => {
            const farmName = farm.farmName || farm.locationLabel || 'Farm';
            this.toastr.triggerToastr('success', `${farmName} deleted successfully.`);
            this.dispatchFarmsLoad();
          },
          error: () => {
            this.toastr.triggerToastr('error', 'Unable to delete farm.');
          },
        });
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

  private toRow(farm: PortfolioFarm): PortfolioFarmRow {
    const rawStatus = (farm.status || farm.assignment?.status || 'active').toLowerCase();

    const isActive = ['active', 'verified', 'assigned'].includes(rawStatus);
    const isInactive = ['inactive', 'denied', 'suspended'].includes(rawStatus);
    const isPending = !isActive && !isInactive;

    const farmLocation =
      farm.locationLabel || farm.farmName || farm.location || farm.community || '-';

    const farmerName = farm.farmer?.fullName || farm.farmer?.name || '-';

    const cropType = farm.cropType || farm.primaryCrop || farm.farmer?.primaryCrop || '-';

    const size =
      typeof farm.sizeHectares === 'number' && Number.isFinite(farm.sizeHectares)
        ? `${farm.sizeHectares} ha`
        : typeof farm.sizeAcres === 'number' && Number.isFinite(farm.sizeAcres)
          ? `${farm.sizeAcres} acres`
          : '-';

    const assignedOfficer =
      farm.assignedOfficerName || farm.assignment?.officerName || 'Unassigned';

    const registeredDate = farm.createdAt || farm.updatedAt || null;

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

  private getEffectiveFarmerId(): string | undefined {
    const inputId = this.farmerId();
    if (inputId) {
      return inputId;
    }

    return (
      this.route.snapshot.paramMap.get('farmerId') ||
      this.route.parent?.snapshot.paramMap.get('farmerId') ||
      undefined
    );
  }

  private dispatchFarmsLoad(event: TableLazyLoadEvent = this.lastEvent): void {
    this.lastEvent = event;
    const params: PortfolioFarmsQueryParams = {
      farmerId: this.getEffectiveFarmerId(),
      first: event.first ?? 0,
      rows: event.rows ?? 10,
      globalFilter: this.searchTerm || undefined,
      status: this.selectedStatus || undefined,
    };

    this.store.dispatch(new GetPortfolioFarms(params)).subscribe();
  }
}
