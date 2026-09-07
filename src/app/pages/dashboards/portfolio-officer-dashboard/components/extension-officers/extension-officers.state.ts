import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../../../environment/environment';
import { extractErrorMessage, normalizeListResponse } from '../../../../../shared/request.utils';

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
}

export interface ExtensionOfficersQueryParams {
  first?: number;
  rows?: number;
  globalFilter?: string;
  status?: string;
  region?: string;
}

export interface PortfolioExtensionOfficersStateModel {
  totalPages: number;
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  isLoading: boolean;
  errors: string[];
  officers: ExtensionOfficerActivityItem[];
}

export class GetPortfolioExtensionOfficers {
  static readonly type = '[Portfolio Extension Officers] Get Officers Activity';
  constructor(public params?: ExtensionOfficersQueryParams) {}
}

@State<PortfolioExtensionOfficersStateModel>({
  name: 'portfolioExtensionOfficers',
  defaults: {
    officers: [],
    totalPages: 0,
    pageIndex: 0,
    pageSize: 10,
    totalCount: 0,
    isLoading: false,
    errors: [],
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
  static officersConfigs(state: PortfolioExtensionOfficersStateModel) {
    const { totalPages, pageIndex, pageSize, totalCount } = state;
    return { totalPages, pageIndex, pageSize, totalCount };
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
          const data = normalizeListResponse(response.data);
          ctx.patchState({
            officers: data.results,
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
            errors: [extractErrorMessage(error, 'Unable to load extension officers activity.')],
          });
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

    return httpParams;
  }
}
