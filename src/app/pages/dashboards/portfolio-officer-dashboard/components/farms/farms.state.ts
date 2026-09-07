import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../../../environment/environment';
import { extractErrorMessage, normalizeListResponse } from '../../../../../shared/request.utils';

export interface PortfolioFarmFarmer {
  id: string;
  fullName?: string | null;
  name?: string | null;
  phone?: string | null;
  primaryCrop?: string | null;
  status?: string | null;
}

export interface PortfolioFarmAssignment {
  officerId?: string | null;
  officerName?: string | null;
  officerRegion?: string | null;
  status?: string | null;
  notes?: string | null;
}

export interface PortfolioFarmLatestVisit {
  id?: string;
  visitDate?: string | null;
  status?: string | null;
  yieldEstimate?: number | null;
}

export interface PortfolioFarm extends Record<string, unknown> {
  id: string;
  farmerId?: string | null;
  farmer?: PortfolioFarmFarmer | null;
  locationLabel?: string | null;
  location?: string | null;
  farmName?: string | null;
  region?: string | null;
  community?: string | null;
  cropType?: string | null;
  primaryCrop?: string | null;
  sizeHectares?: number | null;
  sizeAcres?: number | null;
  status?: string | null;
  assignment?: PortfolioFarmAssignment | null;
  assignedOfficerName?: string | null;
  latestVisit?: PortfolioFarmLatestVisit | null;
  lastVisitDate?: string | null;
  lastActivityLabel?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface PortfolioFarmsResponse {
  message?: string;
  success?: boolean;
  isSuccessful?: boolean;
  data: PortfolioFarmsData | PortfolioFarm[];
  errors?: unknown;
}

interface PortfolioFarmsData {
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
  results?: PortfolioFarm[];
  items?: PortfolioFarm[];
  data?: PortfolioFarm[];
}

export interface PortfolioFarmsQueryParams {
  first?: number;
  rows?: number;
  globalFilter?: string;
  status?: string;
  cropType?: string;
}

export interface PortfolioFarmsStateModel {
  totalPages: number;
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  isLoading: boolean;
  errors: string[];
  farms: PortfolioFarm[];
}

export class GetPortfolioFarms {
  static readonly type = '[Portfolio Farms] Get Farms';
  constructor(public params?: PortfolioFarmsQueryParams) {}
}

@State<PortfolioFarmsStateModel>({
  name: 'portfolioFarms',
  defaults: {
    farms: [],
    totalPages: 0,
    pageIndex: 0,
    pageSize: 10,
    totalCount: 0,
    isLoading: false,
    errors: [],
  },
})
@Injectable()
export class PortfolioFarmsState {
  private readonly http = inject(HttpClient);

  @Selector()
  static isLoading(state: PortfolioFarmsStateModel): boolean {
    return state.isLoading;
  }

  @Selector()
  static errors(state: PortfolioFarmsStateModel): string[] {
    return state.errors;
  }

  @Selector()
  static farms(state: PortfolioFarmsStateModel): PortfolioFarm[] {
    return state.farms;
  }

  @Selector()
  static farmsConfigs(state: PortfolioFarmsStateModel) {
    const { totalPages, pageIndex, pageSize, totalCount } = state;
    return { totalPages, pageIndex, pageSize, totalCount };
  }

  @Action(GetPortfolioFarms)
  getFarms(ctx: StateContext<PortfolioFarmsStateModel>, { params }: GetPortfolioFarms) {
    ctx.patchState({ isLoading: true, errors: [] });

    return this.http
      .get<PortfolioFarmsResponse>(`${environment.api}/portfolio/farms`, {
        params: this.buildParams(params),
      })
      .pipe(
        tap((response) => {
          const data = normalizeListResponse(response.data);
          ctx.patchState({
            farms: data.results,
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
            errors: [extractErrorMessage(error, 'Unable to load farms.')],
          });
          return of(error);
        }),
      );
  }

  private buildParams(params?: PortfolioFarmsQueryParams): HttpParams {
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

    if (params.cropType) {
      httpParams = httpParams.set('cropType', params.cropType);
    }

    return httpParams;
  }
}
