import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../../../environment/environment';
import { extractErrorMessage } from '../../../../../shared/request.utils';

export interface ExtensionOfficerPersonal {
  fullName?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface ExtensionOfficerEmployment {
  staffId?: string | null;
  regionDistrict?: string | null;
  supervisorName?: string | null;
}

export interface ExtensionOfficerMetrics {
  assignedFarmersCount?: number;
  completedVisitsCount?: number;
  pendingVisitsCount?: number;
  totalVisitsCount?: number;
}

export interface ExtensionOfficerActivityItem extends Record<string, unknown> {
  id: string;
  officerId?: string | null;
  name?: string | null;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  staffId?: string | null;
  region?: string | null;
  regionDistrict?: string | null;
  status?: string | null;
  approvalStatus?: string | null;
  assignedFarmersCount?: number;
  completedVisitsCount?: number;
  pendingVisitsCount?: number;
  totalVisitsCount?: number;
  personalInformation?: ExtensionOfficerPersonal | null;
  employmentDetails?: ExtensionOfficerEmployment | null;
  metrics?: ExtensionOfficerMetrics | null;
  lastActiveAt?: string | null;
  lastActivityAt?: string | null;
  lastActivityLabel?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  officerName?: string | null;
  initials?: string | null;
  farmsMonitored?: number;
  reportsSubmitted?: number;
  assignedFarmCount?: number;
  riskFlagsRaised?: { total?: number; high?: number; medium?: number; low?: number; label?: string; tone?: string } | null;
  lastVisitAt?: string | null;
  lastVisitLabel?: string | null;
  action?: { canViewDetail?: boolean; detailEndpoint?: string; actionsEndpoint?: string } | null;
}

interface ExtensionOfficersResponse {
  message?: string;
  success?: boolean;
  isSuccessful?: boolean;
  data: ExtensionOfficersData | ExtensionOfficerActivityItem[];
  errors?: unknown;
}

interface ExtensionOfficersData {
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
  results?: ExtensionOfficerActivityItem[];
  items?: ExtensionOfficerActivityItem[];
  data?: ExtensionOfficerActivityItem[];
  summary?: {
    totalFieldOfficers?: { total?: number; newThisMonth?: number };
    totalFarmVisits?: { total?: number; changePercentVsLastCycle?: number };
    averageMonitoringAccuracy?: { percent?: number; label?: string };
  };
  filters?: {
    options?: {
      officers?: Array<{ id: string; label: string; region?: string | null }>;
      activities?: Array<{ value: string; label: string }>;
      farmTypes?: Array<{ value: string; label: string }>;
    };
  };
  table?: {
    items?: ExtensionOfficerActivityItem[];
    pagination?: {
      totalPages?: number;
      page?: number;
      pageSize?: number;
      limit?: number;
      offset?: number;
      total?: number;
    };
  };
}

export interface ExtensionOfficersQueryParams {
  first?: number;
  rows?: number;
  globalFilter?: string;
  status?: string;
  region?: string;
  timeframeDays?: number;
  activity?: string;
  officerId?: string;
  farmerSearch?: string;
  farmType?: string;
}

export interface PortfolioExtensionOfficersStateModel {
  totalPages: number;
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  isLoading: boolean;
  errors: string[];
  officers: ExtensionOfficerActivityItem[];
  availableOfficers: ExtensionOfficerActivityItem[];
  farmTypes: Array<{ value: string; label: string }>;
  summary: {
    totalFieldOfficers: { total: number; newThisMonth: number };
    totalFarmVisits: { total: number; changePercentVsLastCycle: number };
    averageMonitoringAccuracy: { percent: number; label: string };
  };
}

export class GetPortfolioExtensionOfficers {
  static readonly type = '[Portfolio Extension Officers] Get Officers Activity';
  constructor(public params?: ExtensionOfficersQueryParams) {}
}

export class GetAvailablePortfolioExtensionOfficers {
  static readonly type = '[Portfolio Extension Officers] Get Available Officers';
  constructor(public params?: ExtensionOfficersQueryParams) {}
}

@State<PortfolioExtensionOfficersStateModel>({
  name: 'portfolioExtensionOfficers',
  defaults: {
    officers: [],
    availableOfficers: [],
    totalPages: 0,
    pageIndex: 0,
    pageSize: 10,
    totalCount: 0,
    isLoading: false,
    errors: [],
    farmTypes: [],
    summary: {
      totalFieldOfficers: { total: 0, newThisMonth: 0 },
      totalFarmVisits: { total: 0, changePercentVsLastCycle: 0 },
      averageMonitoringAccuracy: { percent: 0, label: 'Needs Attention' },
    },
  },
})
@Injectable()
export class PortfolioExtensionOfficersState {
  private readonly http = inject(HttpClient);

  @Selector()
  static isLoading(state: PortfolioExtensionOfficersStateModel): boolean {
    return state.isLoading;
  }

  @Selector()
  static errors(state: PortfolioExtensionOfficersStateModel): string[] {
    return state.errors;
  }

  @Selector()
  static officers(state: PortfolioExtensionOfficersStateModel): ExtensionOfficerActivityItem[] {
    return state.officers;
  }

  @Selector()
  static availableOfficers(state: PortfolioExtensionOfficersStateModel): ExtensionOfficerActivityItem[] {
    return state.availableOfficers;
  }

  @Selector()
  static officersConfigs(state: PortfolioExtensionOfficersStateModel) {
    const { totalPages, pageIndex, pageSize, totalCount } = state;
    return { totalPages, pageIndex, pageSize, totalCount };
  }

  @Selector()
  static farmTypes(state: PortfolioExtensionOfficersStateModel): Array<{ value: string; label: string }> {
    return state.farmTypes;
  }

  @Selector()
  static summary(state: PortfolioExtensionOfficersStateModel): PortfolioExtensionOfficersStateModel['summary'] {
    return state.summary;
  }

  @Action(GetPortfolioExtensionOfficers)
  getOfficers(
    ctx: StateContext<PortfolioExtensionOfficersStateModel>,
    { params }: GetPortfolioExtensionOfficers,
  ) {
    ctx.patchState({ isLoading: true, errors: [] });

    return this.http
      .get<ExtensionOfficersResponse>(
        `${environment.api}/portfolio/extension-officers/activity`,
        {
          params: this.buildParams(params),
        },
      )
      .pipe(
        tap((response) => {
          const data = response.data as ExtensionOfficersData | ExtensionOfficerActivityItem[];
          const activityData = Array.isArray(data) ? null : data;
          const items = activityData?.table?.items ?? (Array.isArray(data) ? data : []);
          const pagination = activityData?.table?.pagination;
          ctx.patchState({
            officers: items,
            totalPages: pagination?.totalPages ?? 1,
            pageIndex: pagination?.page ?? 1,
            pageSize: pagination?.pageSize ?? pagination?.limit ?? items.length,
            totalCount: pagination?.total ?? items.length,
            farmTypes: activityData?.filters?.options?.farmTypes ?? [],
            summary: activityData?.summary
              ? {
                  totalFieldOfficers: {
                    total: activityData.summary.totalFieldOfficers?.total ?? 0,
                    newThisMonth: activityData.summary.totalFieldOfficers?.newThisMonth ?? 0,
                  },
                  totalFarmVisits: {
                    total: activityData.summary.totalFarmVisits?.total ?? 0,
                    changePercentVsLastCycle: activityData.summary.totalFarmVisits?.changePercentVsLastCycle ?? 0,
                  },
                  averageMonitoringAccuracy: {
                    percent: activityData.summary.averageMonitoringAccuracy?.percent ?? 0,
                    label: activityData.summary.averageMonitoringAccuracy?.label ?? 'Needs Attention',
                  },
                }
              : undefined,
            isLoading: false,
          });
        }),
        catchError((error: unknown) => {
          ctx.patchState({
            isLoading: false,
            errors: [extractErrorMessage(error, 'Unable to load extension officers activity.')],
          });
          return of(error);
        }),
      );
  }

  @Action(GetAvailablePortfolioExtensionOfficers)
  getAvailableOfficers(
    ctx: StateContext<PortfolioExtensionOfficersStateModel>,
    { params }: GetAvailablePortfolioExtensionOfficers,
  ) {
    return this.http
      .get<ExtensionOfficersResponse>(`${environment.api}/portfolio/extension-officers/available`, {
        params: this.buildParams(params),
      })
      .pipe(
        tap((response) => {
          const raw = response.data;
          const data = Array.isArray(raw) ? raw : (raw as ExtensionOfficersData);
          const items = Array.isArray(data) ? data : data.items ?? data.results ?? data.data ?? [];
          ctx.patchState({ availableOfficers: items });
        }),
        catchError((error: unknown) => {
          ctx.patchState({ errors: [extractErrorMessage(error, 'Unable to load available extension officers.')] });
          return of(error);
        }),
      );
  }

  private buildParams(params?: ExtensionOfficersQueryParams): HttpParams {
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

    if (params.region) {
      httpParams = httpParams.set('region', params.region);
    }

    if (params.timeframeDays) {
      httpParams = httpParams.set('timeframeDays', String(params.timeframeDays));
    }

    if (params.activity) {
      httpParams = httpParams.set('activity', params.activity);
    }

    if (params.officerId) {
      httpParams = httpParams.set('officerId', params.officerId);
    }

    if (params.farmerSearch) {
      httpParams = httpParams.set('farmerSearch', params.farmerSearch);
    }

    if (params.farmType) {
      httpParams = httpParams.set('farmType', params.farmType);
    }

    return httpParams;
  }
}
