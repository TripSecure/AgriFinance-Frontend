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
  farmerId?: string;
  first?: number;
  rows?: number;
  globalFilter?: string;
  status?: string;
  cropType?: string;
}

export interface CreatePortfolioFarmPayload {
  sizeHectares?: number;
  sizeAcres?: number;
  cropType?: string;
  primaryCrop?: string;
  secondaryCrop?: string;
  farmerCode?: string;
  region?: string;
  farmAddressRegion?: string;
  district?: string;
  community?: string;
  gpsAddress?: string;
  farmAddress?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsLocation?: {
    latitude?: number;
    longitude?: number;
  };
  cooperativeName?: string;
  [key: string]: unknown;
}

export interface PortfolioFarmsStateModel {
  totalPages: number;
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  isLoading: boolean;
  isCreating: boolean;
  message: string | null;
  errors: string[];
  farms: PortfolioFarm[];
}

export class GetPortfolioFarms {
  static readonly type = '[Portfolio Farms] Get Farms';
  constructor(public params?: PortfolioFarmsQueryParams) {}
}

export class CreatePortfolioFarm {
  static readonly type = '[Portfolio Farms] Create Farm';
  constructor(public farmerId: string, public payload: CreatePortfolioFarmPayload) {}
}

export class DeletePortfolioFarm {
  static readonly type = '[Portfolio Farms] Delete Farm';
  constructor(public farmId: string, public farmerId?: string | null) {}
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
    isCreating: false,
    message: null,
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
  static isCreating(state: PortfolioFarmsStateModel): boolean {
    return state.isCreating;
  }

  @Selector()
  static message(state: PortfolioFarmsStateModel): string | null {
    return state.message;
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

    const endpoint = params?.farmerId
      ? `${environment.api}/portfolio/farmers/${params.farmerId}/farms`
      : `${environment.api}/portfolio/farms`;

    return this.http
      .get<PortfolioFarmsResponse>(endpoint, {
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

  @Action(CreatePortfolioFarm)
  createFarm(ctx: StateContext<PortfolioFarmsStateModel>, { farmerId, payload }: CreatePortfolioFarm) {
    ctx.patchState({ isCreating: true, message: null, errors: [] });

    return this.http
      .post<{ message?: string; success?: boolean; isSuccessful?: boolean; data?: unknown }>(
        `${environment.api}/portfolio/farmers/${farmerId}/farms`,
        payload,
      )
      .pipe(
        tap((response) => {
          ctx.patchState({
            isCreating: false,
            message: response.message ?? 'Farm added successfully.',
            errors: [],
          });
        }),
        catchError((error: unknown) => {
          const message = extractErrorMessage(
            error,
            'Unable to add farm. Please review the form and try again.',
          );
          ctx.patchState({
            isCreating: false,
            message: null,
            errors: [message],
          });
          return of(error);
        }),
      );
  }

  @Action(DeletePortfolioFarm)
  deleteFarm(ctx: StateContext<PortfolioFarmsStateModel>, { farmId, farmerId }: DeletePortfolioFarm) {
    ctx.patchState({ isLoading: true, errors: [] });

    const endpoint = farmerId
      ? `${environment.api}/portfolio/farmers/${farmerId}/farms/${farmId}`
      : `${environment.api}/portfolio/farms/${farmId}`;

    return this.http
      .delete<{ message?: string; success?: boolean; isSuccessful?: boolean }>(endpoint)
      .pipe(
        tap((response) => {
          const currentFarms = ctx.getState().farms.filter((farm) => farm.id !== farmId);
          ctx.patchState({
            farms: currentFarms,
            totalCount: Math.max(0, ctx.getState().totalCount - 1),
            isLoading: false,
            message: response.message ?? 'Farm deleted successfully.',
            errors: [],
          });
        }),
        catchError((error: unknown) => {
          ctx.patchState({
            isLoading: false,
            errors: [extractErrorMessage(error, 'Unable to delete farm.')],
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
