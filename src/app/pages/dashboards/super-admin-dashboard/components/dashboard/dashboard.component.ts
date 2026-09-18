import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { AuditLog, AuditLogsState, GetAuditLogs } from '../audit-logs/audit-logs.state';
import { AdminDashboardState, GetAdminDashboardOverview } from './dashboard.state';

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  private readonly store = inject(Store);

  protected readonly overview = this.store.selectSignal(AdminDashboardState.overview);
  protected readonly isLoadingOverview = this.store.selectSignal(AdminDashboardState.isLoading);
  protected readonly recentActivity = this.store.selectSignal(AuditLogsState.logs);
  protected readonly isLoadingActivity = this.store.selectSignal(AuditLogsState.isLoading);

  private static readonly roleIcons: Record<string, string> = {
    farmer: 'agriculture',
    portfolio_officer: 'account_balance',
    extension_officer: 'directions_walk',
    input_provider: 'inventory_2',
    tractor_provider: 'agriculture',
    soil_testing_provider: 'science',
    irrigation_provider: 'water_drop',
    logistics_provider: 'local_shipping',
    offtaker: 'storefront',
    bank: 'account_balance',
    insurer: 'health_and_safety',
  };

  protected readonly roleBreakdown = computed(() => {
    const rows = this.overview()?.roleBreakdown ?? [];
    const total = rows.reduce((sum, row) => sum + row.count, 0);
    return rows
      .slice()
      .sort((left, right) => right.count - left.count)
      .map((row) => ({
        ...row,
        percent: total > 0 ? Math.round((row.count / total) * 100) : 0,
        icon: DashboardComponent.roleIcons[row.role] ?? 'person',
      }));
  });

  ngOnInit(): void {
    this.store
      .dispatch([new GetAdminDashboardOverview(), new GetAuditLogs({ rows: 5 })])
      .subscribe();
  }

  protected formatLabel(value: string | null | undefined): string {
    return (
      (value ?? '')
        .replace(/[_-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (letter) => letter.toUpperCase()) || '-'
    );
  }

  protected activityTimestamp(log: AuditLog): string | null {
    return log.timestamp || log.createdAt || null;
  }

  protected activityActor(log: AuditLog): string {
    return (
      log.actor?.fullName ||
      log.actor?.name ||
      log.actorName ||
      log.performedBy ||
      log.actor?.email ||
      log.actorEmail ||
      'System'
    );
  }

  protected activityDescription(log: AuditLog): string {
    const resource = log.resource || log.resourceType || log.entityType || null;

    const details =
      typeof log.details === 'string' && log.details.trim()
        ? log.details
        : log.description
          ? log.description
          : null;

    if (resource && details) {
      return `${this.formatLabel(resource)} — ${details}`;
    }

    if (details) {
      return details;
    }

    if (resource) {
      return this.formatLabel(resource);
    }

    return `By ${this.activityActor(log)}`;
  }
}
