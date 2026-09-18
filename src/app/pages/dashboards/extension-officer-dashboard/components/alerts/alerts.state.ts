import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../../../environment/environment';
import { extractErrorMessage, normalizeListResponse } from '../../../../../shared/request.utils';

export interface ExtensionAlert extends Record<string, unknown> {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  createdAt: string;
  timeAgo: string | null;
  readAt: string | null;
  payload?: Record<string, unknown>;
}

interface ExtensionAlertsResponse {
  message?: string;
  success?: boolean;
  data: ExtensionAlertsData;
}

interface ExtensionAlertsData {
  unreadCount?: number;
  items?: ExtensionAlert[];
  pagination?: {
    totalPages?: number;
    page?: number;
    pageSize?: number;
    limit?: number;
    total?: number;
  };
}

export interface ExtensionAlertsQueryParams {
  first?: number;
  rows?: number;
}

export interface ExtensionAlertsStateModel {
  alerts: ExtensionAlert[];
  unreadCount: number;
  totalPages: number;
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  isLoading: boolean;
  isMarkingRead: boolean;
  errors: string[];
}

export class GetExtensionAlerts {
  static readonly type = '[Extension Alerts] Get Alerts';
  constructor(public params?: ExtensionAlertsQueryParams) {}
}

export class MarkExtensionAlertsRead {
  static readonly type = '[Extension Alerts] Mark All Read';
}

@State<ExtensionAlertsStateModel>({
  name: 'extensionAlerts',
  defaults: {
    alerts: [],
    unreadCount: 0,
    totalPages: 0,
    pageIndex: 0,
    pageSize: 10,
    totalCount: 0,
    isLoading: false,
    isMarkingRead: false,
    errors: [],
  },
})
@Injectable()
export class ExtensionAlertsState {
  private readonly http = inject(HttpClient);

  @Selector()
  static isLoading(state: ExtensionAlertsStateModel): boolean {
    return state.isLoading;
  }

  @Selector()
  static errors(state: ExtensionAlertsStateModel): string[] {
    return state.errors;
  }

  @Selector()
  static alerts(state: ExtensionAlertsStateModel): ExtensionAlert[] {
    return state.alerts;
  }

  @Selector()
  static unreadCount(state: ExtensionAlertsStateModel): number {
    return state.unreadCount;
  }

  @Selector()
  static alertsConfigs(state: ExtensionAlertsStateModel) {
    const { totalPages, pageIndex, pageSize, totalCount } = state;
    return { totalPages, pageIndex, pageSize, totalCount };
  }

  @Action(GetExtensionAlerts)
  getAlerts(ctx: StateContext<ExtensionAlertsStateModel>, { params }: GetExtensionAlerts) {
    ctx.patchState({ isLoading: true, errors: [] });

    let httpParams = new HttpParams();
    httpParams = httpParams.set('limit', String(params?.rows ?? 10));
    httpParams = httpParams.set('offset', String(params?.first ?? 0));

    return this.http.get<ExtensionAlertsResponse>(`${environment.api}/extension/alerts`, { params: httpParams }).pipe(
      tap((response) => {
        const data = normalizeListResponse(response.data);
        ctx.patchState({
          alerts: data.results,
          totalPages: data.totalPages,
          pageIndex: data.pageIndex,
          pageSize: data.pageSize,
          totalCount: data.totalCount,
          unreadCount: response.data.unreadCount ?? 0,
          isLoading: false,
        });
      }),
      catchError((error: unknown) => {
        ctx.patchState({
          isLoading: false,
          errors: [extractErrorMessage(error, 'Unable to load alerts.')],
        });
        return of(error);
      }),
    );
  }

  @Action(MarkExtensionAlertsRead)
  markAllRead(ctx: StateContext<ExtensionAlertsStateModel>) {
    ctx.patchState({ isMarkingRead: true });

    return this.http.post<{ message?: string; data: { updatedCount: number } }>(
      `${environment.api}/extension/alerts/mark-all-read`,
      {},
    ).pipe(
      tap(() => {
        const alerts = ctx.getState().alerts.map((alert) => ({ ...alert, readAt: alert.readAt ?? new Date().toISOString() }));
        ctx.patchState({ alerts, unreadCount: 0, isMarkingRead: false });
      }),
      catchError((error: unknown) => {
        ctx.patchState({
          isMarkingRead: false,
          errors: [extractErrorMessage(error, 'Unable to mark alerts as read.')],
        });
        return of(error);
      }),
    );
  }
}
