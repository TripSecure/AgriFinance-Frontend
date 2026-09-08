import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { Store } from '@ngxs/store';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import {
  AuditLog,
  AuditLogsQueryParams,
  AuditLogsState,
  GetAuditLogs,
} from './audit-logs.state';

interface StatusFilterOption {
  label: string;
  value: string;
  icon: string;
}

interface AuditLogRow {
  log: AuditLog;
  timestamp: string | Date | null;
  actor: string;
  action: string;
  resource: string;
  details: string;
  ipAddress: string;
  statusLabel: string;
  isSuccess: boolean;
  isDanger: boolean;
  isWarning: boolean;
}

const auditStatusOptions: readonly StatusFilterOption[] = [
  { label: 'Success', value: 'success', icon: 'check_circle' },
  { label: 'Failed', value: 'failed', icon: 'cancel' },
  { label: 'Warning', value: 'warning', icon: 'warning' },
  { label: 'Pending', value: 'pending', icon: 'pending' },
];

@Component({
  selector: 'app-audit-logs',
  imports: [DatePipe, MenuModule, TableModule],
  templateUrl: './audit-logs.component.html',
  styleUrl: './audit-logs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditLogsComponent {
  private readonly store = inject(Store);

  private readonly logs = this.store.selectSignal(AuditLogsState.logs);
  protected readonly logRows = computed(() => this.logs().map((log) => this.toRow(log)));
  protected readonly logsData = this.store.selectSignal(AuditLogsState.logsConfigs);
  protected readonly isLoading = this.store.selectSignal(AuditLogsState.isLoading);
  protected readonly statusOptions = auditStatusOptions;

  protected readonly statusMenuItems: MenuItem[] = [
    {
      label: 'All statuses',
      icon: 'list',
      command: () => this.onStatusFilter(''),
    },
    ...auditStatusOptions.map((option) => ({
      label: option.label,
      icon: option.icon,
      command: () => this.onStatusFilter(option.value),
    })),
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
        this.dispatchLogsLoad({ ...this.lastEvent, first: 0 });
      });
  }

  protected loadLogs(event: TableLazyLoadEvent = {}): void {
    this.lastEvent = event;
    this.dispatchLogsLoad();
  }

  protected onSearch(value: string): void {
    this.searchInput$.next(value.trim());
  }

  protected onStatusFilter(status: string): void {
    this.selectedStatus = status;
    this.dispatchLogsLoad({ ...this.lastEvent, first: 0 });
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

  private toRow(log: AuditLog): AuditLogRow {
    const rawStatus = (log.status || 'success').toLowerCase();
    const isSuccess = ['success', 'successful', 'ok', 'approved', '200', '201'].includes(rawStatus);
    const isDanger = ['failed', 'error', 'rejected', 'denied', '400', '401', '403', '500'].includes(rawStatus);
    const isWarning = !isSuccess && !isDanger;

    const actor =
      log.actor?.fullName ||
      log.actor?.name ||
      log.actorName ||
      log.performedBy ||
      log.actor?.email ||
      log.actorEmail ||
      log.userId ||
      'System';

    const action = log.action ? this.formatLabel(log.action) : '-';

    const resource =
      log.resource ||
      log.resourceType ||
      log.entityType ||
      (log.resourceId ? `ID: ${log.resourceId}` : '-');

    const details = typeof log.details === 'string'
      ? log.details
      : log.description
        ? log.description
        : log.details && typeof log.details === 'object'
          ? JSON.stringify(log.details)
          : '-';

    const ipAddress = log.ipAddress || log.ip || '-';

    const timestamp = log.timestamp || log.createdAt || log.updatedAt || null;

    return {
      log,
      timestamp,
      actor,
      action,
      resource: this.formatLabel(resource),
      details,
      ipAddress,
      statusLabel: this.formatLabel(rawStatus),
      isSuccess,
      isDanger,
      isWarning,
    };
  }

  private formatDateTime(value: string | null | undefined): string {
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
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  }

  private dispatchLogsLoad(event: TableLazyLoadEvent = this.lastEvent): void {
    this.lastEvent = event;
    const params: AuditLogsQueryParams = {
      first: event.first ?? 0,
      rows: event.rows ?? 10,
      globalFilter: this.searchTerm || undefined,
      status: this.selectedStatus || undefined,
    };

    this.store.dispatch(new GetAuditLogs(params)).subscribe();
  }
}
