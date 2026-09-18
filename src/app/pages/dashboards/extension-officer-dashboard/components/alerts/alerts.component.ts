import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Store } from '@ngxs/store';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ExtensionAlertsState, GetExtensionAlerts, MarkExtensionAlertsRead } from './alerts.state';

@Component({
  selector: 'app-extension-alerts',
  imports: [DatePipe, TableModule],
  templateUrl: './alerts.component.html',
  styleUrl: './alerts.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertsComponent implements OnInit {
  private readonly store = inject(Store);

  protected readonly alerts = this.store.selectSignal(ExtensionAlertsState.alerts);
  protected readonly alertsData = this.store.selectSignal(ExtensionAlertsState.alertsConfigs);
  protected readonly unreadCount = this.store.selectSignal(ExtensionAlertsState.unreadCount);
  protected readonly isLoading = this.store.selectSignal(ExtensionAlertsState.isLoading);

  private lastEvent: TableLazyLoadEvent = {};

  ngOnInit(): void {
    this.dispatchAlertsLoad();
  }

  protected loadAlerts(event: TableLazyLoadEvent = {}): void {
    this.lastEvent = event;
    this.dispatchAlertsLoad();
  }

  protected onMarkAllRead(): void {
    this.store.dispatch(new MarkExtensionAlertsRead()).subscribe();
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

  private dispatchAlertsLoad(event: TableLazyLoadEvent = this.lastEvent): void {
    this.lastEvent = event;
    this.store
      .dispatch(new GetExtensionAlerts({ first: event.first ?? 0, rows: event.rows ?? 10 }))
      .subscribe();
  }
}
