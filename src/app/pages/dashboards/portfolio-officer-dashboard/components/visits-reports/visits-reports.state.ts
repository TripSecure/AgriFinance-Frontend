import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../../../environment/environment';
import { extractErrorMessage, normalizeListResponse } from '../../../../../shared/request.utils';

export interface PortfolioMonitoringVisitFarm {
  id?: string;
  locationLabel?: string | null;
  cropType?: string | null;
  sizeHectares?: number | null;
}

export interface PortfolioMonitoringVisitFarmer {
  id?: string;
  fullName?: string | null;
  name?: string | null;
  phone?: string | null;
}

export interface PortfolioMonitoringVisitOfficer {
  id?: string;
  fullName?: string | null;
  name?: string | null;
  region?: string | null;
  staffId?: string | null;
}

export interface PortfolioMonitoringVisit extends Record<string, unknown> {
  id: string;
  farm?: PortfolioMonitoringVisitFarm | null;
  farmer?: PortfolioMonitoringVisitFarmer | null;
  officer?: PortfolioMonitoringVisitOfficer | null;
  farmerName?: string | null;
  officerName?: string | null;
  farmLocation?: string | null;
  cropType?: string | null;
  visitDate?: string | null;
  instructions?: string | null;
  yieldEstimate?: number | null;
  riskNotes?: string | null;
  alertGenerated?: boolean;
  status?: string | null;
  approvalStatus?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  lastActivityLabel?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface MonitoringVisitsResponse {
  message?: string;
  success?: boolean;
  isSuccessful?: boolean;
  data: MonitoringVisitsData | PortfolioMonitoringVisit[];
  errors?: unknown;
}

interface MonitoringVisitsData {
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
  results?: PortfolioMonitoringVisit[];
  items?: PortfolioMonitoringVisit[];
  data?: PortfolioMonitoringVisit[];
}

export interface MonitoringVisitsQueryParams {
  first?: number;
  rows?: number;
  globalFilter?: string;
  status?: string;
  timeframeDays?: number;
}

export interface PortfolioMonitoringVisitsStateModel {
  totalPages: number;
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  isLoading: boolean;
  errors: string[];
  visits: PortfolioMonitoringVisit[];
}

export class GetPortfolioMonitoringVisits {
  static readonly type = '[Portfolio Monitoring Visits] Get Monitoring Visits';
  constructor(public params?: MonitoringVisitsQueryParams) {}
}

@State<PortfolioMonitoringVisitsStateModel>({
  name: 'portfolioMonitoringVisits',
  defaults: {
    visits: [],
    totalPages: 0,
    pageIndex: 0,
    pageSize: 10,
    totalCount: 0,
    isLoading: false,
    errors: [],
  },
})
@Injectable()
export class PortfolioMonitoringVisitsState {
  private readonly http = inject(HttpClient);

  @Selector()
  static isLoading(state: PortfolioMonitoringVisitsStateModel): boolean {
    return state.isLoading;
  }

  @Selector()
  static errors(state: PortfolioMonitoringVisitsStateModel): string[] {
    return state.errors;
  }

  @Selector()
  static visits(state: PortfolioMonitoringVisitsStateModel): PortfolioMonitoringVisit[] {
    return state.visits;
  }

  @Selector()
  static visitsConfigs(state: PortfolioMonitoringVisitsStateModel) {
    const { totalPages, pageIndex, pageSize, totalCount } = state;
    return { totalPages, pageIndex, pageSize, totalCount };
  }

  @Action(GetPortfolioMonitoringVisits)
  getVisits(
    ctx: StateContext<PortfolioMonitoringVisitsStateModel>,
    { params }: GetPortfolioMonitoringVisits,
  ) {
    ctx.patchState({ isLoading: true, errors: [] });

    return this.http
      .get<MonitoringVisitsResponse>(
        `${environment.api}/portfolio/monitoring-visits`,
        {
          params: this.buildParams(params),
        },
      )
      .pipe(
        tap((response) => {
          const data = normalizeListResponse(response.data);
          ctx.patchState({
            visits: data.results,
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
            errors: [extractErrorMessage(error, 'Unable to load monitoring visits.')],
          });
          return of(error);
        }),
      );
  }

  private buildParams(params?: MonitoringVisitsQueryParams): HttpParams {
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

    if (params.timeframeDays) {
      httpParams = httpParams.set('timeframeDays', String(params.timeframeDays));
    }

    return httpParams;
  }
}
