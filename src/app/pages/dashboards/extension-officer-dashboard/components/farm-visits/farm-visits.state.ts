import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../../../environment/environment';
import { extractErrorMessage, normalizeListResponse } from '../../../../../shared/request.utils';

export interface FarmVisitFarm {
  id: string;
  locationLabel?: string | null;
  cropType?: string | null;
  sizeHectares?: number | null;
}

export interface FarmVisitFarmer {
  id: string;
  fullName?: string | null;
  phone?: string | null;
}

export interface FarmVisitOfficer {
  id?: string | null;
  fullName?: string | null;
  region?: string | null;
}

export interface FarmVisit extends Record<string, unknown> {
  id: string;
  farm?: FarmVisitFarm | null;
  farmer?: FarmVisitFarmer | null;
  officer?: FarmVisitOfficer | null;
  visitDate?: string | null;
  instructions?: string | null;
  yieldEstimate?: number | null;
  riskNotes?: string | null;
  alertGenerated?: boolean;
  status?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  lastActivityLabel?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface FarmVisitsResponse {
  message?: string;
  success?: boolean;
  isSuccessful?: boolean;
  data: FarmVisitsData | FarmVisit[];
  errors?: unknown;
}

interface FarmVisitsData {
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
  results?: FarmVisit[];
  items?: FarmVisit[];
  data?: FarmVisit[];
}

export interface FarmVisitsQueryParams {
  first?: number;
  rows?: number;
  globalFilter?: string;
  status?: string;
  timeframeDays?: number;
}

export interface FarmVisitsStateModel {
  totalPages: number;
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  isLoading: boolean;
  errors: string[];
  visits: FarmVisit[];
}

export class GetExtensionFarmVisits {
  static readonly type = '[Extension Farm Visits] Get Visits';
  constructor(public params?: FarmVisitsQueryParams) {}
}

@State<FarmVisitsStateModel>({
  name: 'extensionFarmVisits',
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
export class FarmVisitsState {
  private readonly http = inject(HttpClient);

  @Selector()
  static isLoading(state: FarmVisitsStateModel): boolean {
    return state.isLoading;
  }

  @Selector()
  static errors(state: FarmVisitsStateModel): string[] {
    return state.errors;
  }

  @Selector()
  static visits(state: FarmVisitsStateModel): FarmVisit[] {
    return state.visits;
  }

  @Selector()
  static visitsConfigs(state: FarmVisitsStateModel) {
    const { totalPages, pageIndex, pageSize, totalCount } = state;
    return { totalPages, pageIndex, pageSize, totalCount };
  }

  @Action(GetExtensionFarmVisits)
  getVisits(ctx: StateContext<FarmVisitsStateModel>, { params }: GetExtensionFarmVisits) {
    ctx.patchState({ isLoading: true, errors: [] });

    return this.http
      .get<FarmVisitsResponse>(`${environment.api}/extension/visits`, {
        params: this.buildParams(params),
      })
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
            errors: [extractErrorMessage(error, 'Unable to load farm visits.')],
          });
          return of(error);
        }),
      );
  }

  private buildParams(params?: FarmVisitsQueryParams): HttpParams {
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
