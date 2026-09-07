import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../../../environment/environment';
import { extractErrorMessage, normalizeListResponse } from '../../../../../shared/request.utils';

export interface AuditLogActor {
  id?: string | null;
  fullName?: string | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
}

export interface AuditLog extends Record<string, unknown> {
  id: string;
  action?: string | null;
  actor?: AuditLogActor | null;
  actorName?: string | null;
  actorEmail?: string | null;
  performedBy?: string | null;
  userId?: string | null;
  resource?: string | null;
  resourceType?: string | null;
  entityType?: string | null;
  resourceId?: string | null;
  entityId?: string | null;
  details?: string | Record<string, unknown> | null;
  description?: string | null;
  ipAddress?: string | null;
  ip?: string | null;
  status?: string | null;
  createdAt?: string | null;
  timestamp?: string | null;
  updatedAt?: string | null;
}

interface AuditLogsResponse {
  message?: string;
  success?: boolean;
  isSuccessful?: boolean;
  data: AuditLogsData | AuditLog[];
  errors?: unknown;
}

interface AuditLogsData {
  totalPages?: number;
  pageIndex?: number;
  pageSize?: number;
  totalCount?: number;
  pagination?: {
    totalPages?: number;
    page?: number;
    pageSize?: number;
    limit?: number;
    total?: number;
  };
  results?: AuditLog[];
  items?: AuditLog[];
  data?: AuditLog[];
}

export interface AuditLogsQueryParams {
  first?: number;
  rows?: number;
  globalFilter?: string;
  status?: string;
  action?: string;
  resource?: string;
}

export interface AuditLogsStateModel {
  totalPages: number;
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  isLoading: boolean;
  errors: string[];
  logs: AuditLog[];
}

export class GetAuditLogs {
  static readonly type = '[Audit Logs] Get Audit Logs';
  constructor(public params?: AuditLogsQueryParams) {}
}

@State<AuditLogsStateModel>({
  name: 'auditLogs',
  defaults: {
    logs: [],
    totalPages: 0,
    pageIndex: 0,
    pageSize: 10,
    totalCount: 0,
    isLoading: false,
    errors: [],
  },
})
@Injectable()
export class AuditLogsState {
  private readonly http = inject(HttpClient);

  @Selector()
  static isLoading(state: AuditLogsStateModel): boolean {
    return state.isLoading;
  }

  @Selector()
  static errors(state: AuditLogsStateModel): string[] {
    return state.errors;
  }

  @Selector()
  static logs(state: AuditLogsStateModel): AuditLog[] {
    return state.logs;
  }

  @Selector()
  static logsConfigs(state: AuditLogsStateModel) {
    const { totalPages, pageIndex, pageSize, totalCount } = state;
    return { totalPages, pageIndex, pageSize, totalCount };
  }

  @Action(GetAuditLogs)
  getAuditLogs(ctx: StateContext<AuditLogsStateModel>, { params }: GetAuditLogs) {
    ctx.patchState({ isLoading: true, errors: [] });

    return this.http
      .get<AuditLogsResponse>(`${environment.api}/admin/audit-logs`, {
        params: this.buildParams(params),
      })
      .pipe(
        tap((response) => {
          const data = normalizeListResponse(response.data);
          ctx.patchState({
            logs: data.results,
            totalPages: data.totalPages,
            pageIndex: data.pageIndex,
            pageSize: data.pageSize,
            totalCount: data.totalCount,
            isLoading: false,
          });
        }),
        catchError((error: unknown) => {
          ctx.patchState({
            isLoading: false,
            errors: [extractErrorMessage(error, 'Unable to load audit logs.')],
          });
          return of(error);
        }),
      );
  }

  private buildParams(params?: AuditLogsQueryParams): HttpParams {
    let httpParams = new HttpParams();

    if (!params) {
      return httpParams;
    }

    const limit = params.rows ?? 10;
    const offset = params.first ?? 0;

    httpParams = httpParams.set('limit', String(limit));
    httpParams = httpParams.set('offset', String(offset));

    if (params.globalFilter) {
      httpParams = httpParams.set('search', params.globalFilter);
    }

    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }

    if (params.action) {
      httpParams = httpParams.set('action', params.action);
    }

    if (params.resource) {
      httpParams = httpParams.set('resource', params.resource);
    }

    return httpParams;
  }
}
