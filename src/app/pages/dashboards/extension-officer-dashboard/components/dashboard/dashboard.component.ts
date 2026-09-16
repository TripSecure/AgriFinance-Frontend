import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { GetExtensionFarmers, ExtensionFarmersState } from '../farmers/farmers.state';
import { GetExtensionFarms, ExtensionFarmsState } from '../farms/farms.state';
import { FarmVisitsState, GetExtensionFarmVisits, FarmVisit } from '../farm-visits/farm-visits.state';

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  private readonly store = inject(Store);

  private readonly farmers = this.store.selectSignal(ExtensionFarmersState.farmers);
  private readonly visits = this.store.selectSignal(FarmVisitsState.visits);
  protected readonly farmersData = this.store.selectSignal(ExtensionFarmersState.farmersConfigs);
  protected readonly farmsData = this.store.selectSignal(ExtensionFarmsState.farmsConfigs);
  protected readonly visitsData = this.store.selectSignal(FarmVisitsState.visitsConfigs);
  protected readonly isLoadingFarmers = this.store.selectSignal(ExtensionFarmersState.isLoading);
  protected readonly isLoadingFarms = this.store.selectSignal(ExtensionFarmsState.isLoading);
  protected readonly isLoadingVisits = this.store.selectSignal(FarmVisitsState.isLoading);

  protected readonly recentVisits = computed(() => this.visits().slice(0, 5));
  protected readonly reportsToComplete = computed(
    () => this.visits().filter((visit) => ['draft', 'under_review'].includes((visit.status ?? '').toLowerCase())).length,
  );
  protected readonly riskAlerts = computed(() => this.visits().filter((visit) => visit.alertGenerated).length);

  ngOnInit(): void {
    this.store
      .dispatch([
        new GetExtensionFarmers({ rows: 1 }),
        new GetExtensionFarms({ rows: 1 }),
        new GetExtensionFarmVisits({ rows: 5, timeframeDays: 30 }),
      ])
      .subscribe();
  }

  protected statusLabel(status: string | null | undefined): string {
    return (
      (status ?? 'draft')
        .replace(/[_-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Draft'
    );
  }

  protected visitDate(visit: FarmVisit): string {
    return visit.visitDate || visit.createdAt || '';
  }
}
