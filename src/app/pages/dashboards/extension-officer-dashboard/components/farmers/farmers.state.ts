import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../../../environment/environment';
import { extractErrorMessage, normalizeListResponse } from '../../../../../shared/request.utils';

export interface AssignedFarmFarmer {
  id: string;
  fullName?: string | null;
  phone?: string | null;
  primaryCrop?: string | null;
  status?: string | null;
}

export interface AssignedFarmAssignment {
  officerId?: string | null;
  officerName?: string | null;
  officerRegion?: string | null;
  status?: string | null;
  notes?: string | null;
}

export interface AssignedFarmLatestVisit {
  id: string;
  visitDate?: string | null;
  status?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
}

export interface AssignedFarm extends Record<string, unknown> {
  id: string;
  farmer?: AssignedFarmFarmer | null;
  locationLabel?: string | null;
  gpsLocation?: Record<string, unknown>;
  sizeHectares?: number | null;
  cropType?: string | null;
  assignment?: AssignedFarmAssignment | null;
  latestVisit?: AssignedFarmLatestVisit | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface ExtensionFarmsResponse {
  message?: string;
  success?: boolean;
  isSuccessful?: boolean;
  data: ExtensionFarmsData | AssignedFarm[];
  errors?: unknown;
}

interface ExtensionFarmsData {
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
  results?: AssignedFarm[];
  items?: AssignedFarm[];
  data?: AssignedFarm[];
}

export interface ExtensionFarmsQueryParams {
  first?: number;
  rows?: number;
  globalFilter?: string;
  sortField?: string;
  sortOrder?: number;
  assignmentStatus?: string;
}

export interface ExtensionFarmersStateModel {
  totalPages: number;
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  isLoading: boolean;
  errors: string[];
  farms: AssignedFarm[];
}

export class GetExtensionFarms {
  static readonly type = '[Extension Farmers] Get Assigned Farms';
  constructor(public params?: ExtensionFarmsQueryParams) {}
}

@State<ExtensionFarmersStateModel>({
  name: 'extensionFarmers',
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
export class ExtensionFarmersState {
  private readonly http = inject(HttpClient);

  @Selector()
  static isLoading(state: ExtensionFarmersStateModel): boolean {
    return state.isLoading;
  }

  @Selector()
  static errors(state: ExtensionFarmersStateModel): string[] {
    return state.errors;
  }

  @Selector()
  static farms(state: ExtensionFarmersStateModel): AssignedFarm[] {
    return state.farms;
  }

  @Selector()
  static farmersConfigs(state: ExtensionFarmersStateModel) {
    const { totalPages, pageIndex, pageSize, totalCount } = state;
    return { totalPages, pageIndex, pageSize, totalCount };
  }

  @Action(GetExtensionFarms)
  getFarms(ctx: StateContext<ExtensionFarmersStateModel>, { params }: GetExtensionFarms) {
    ctx.patchState({ isLoading: true, errors: [] });

    return this.http
      .get<ExtensionFarmsResponse>(`${environment.api}/extension/farms`, {
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
            errors: [extractErrorMessage(error, 'Unable to load assigned farmers.')],
          });
          return of(error);
        }),
      );
  }

  private buildParams(params?: ExtensionFarmsQueryParams): HttpParams {
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

    if (params.assignmentStatus) {
      httpParams = httpParams.set('assignmentStatus', params.assignmentStatus);
    }

    return httpParams;
  }
}
