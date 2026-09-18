import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { GetProviderDashboard, ProviderOrdersState } from '../orders/orders.state';

@Component({
  selector: 'app-provider-dashboard',
  imports: [DatePipe, DecimalPipe, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProviderDashboardComponent implements OnInit {
  private readonly store = inject(Store);

  protected readonly summary = this.store.selectSignal(ProviderOrdersState.dashboardSummary);
  protected readonly recentOrders = this.store.selectSignal(ProviderOrdersState.dashboardRecentOrders);
  protected readonly isLoading = this.store.selectSignal(ProviderOrdersState.isDashboardLoading);

  protected readonly ordersNeedingAction = computed(() => {
    const summary = this.summary();
    if (!summary) {
      return 0;
    }
    return summary.pendingCount + summary.acceptedCount + summary.inTransitCount;
  });

  ngOnInit(): void {
    this.store.dispatch(new GetProviderDashboard()).subscribe();
  }

  protected formatLabel(value: string | null | undefined): string {
    return (
      (value ?? '')
        .replace(/[_-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Pending'
    );
  }
}
