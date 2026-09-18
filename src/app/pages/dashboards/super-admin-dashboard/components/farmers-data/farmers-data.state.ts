import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../../../environment/environment';
import { extractErrorMessage, normalizeListResponse } from '../../../../../shared/request.utils';

export interface AdminFarmer extends Record<string, unknown> {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  region: string | null;
  farmSizeHectares: number | null;
  primaryCrop: string | null;
  status: string;
  createdAt: string;
}

interface AdminFarmersSummary {
  totalFarmers: number;
  newThisMonth: number;
  verifiedFarmers: number;
  flaggedAccounts: number;
}

export interface AdminFarmerDocument {
  label: string;
  fileName: string;
  url: string | null;
}

export interface AdminFarmerDetail {
  farmer: {
    id: string;
    fullName: string;
    nationalId: string | null;
    phone: string | null;
    email: string | null;
    gender: string | null;
    dateOfBirth: string | null;
    gpsLocation: unknown;
    farmSizeHectares: number | null;
    primaryCrop: string | null;
    status: string;
    consentDataSharing: boolean;
    consentBundle: boolean;
    createdAt: string;
  };
  portfolioOfficer: { id: string; fullName: string; phone: string | null; email: string | null } | null;
  farms: Array<{ id: string; locationLabel: string | null; cropType: string | null; sizeHectares: number | null }>;
  documents: AdminFarmerDocument[];
  adminReview: { reviewedBy: string | null; reviewedAt: string | null; reviewNotes: string | null } | null;
}

interface AdminFarmersResponse {
  message?: string;
  success?: boolean;
  data: {
    summary?: AdminFarmersSummary;
    filters?: { regions?: string[] };
    items?: AdminFarmer[];
    pagination?: Record<string, unknown>;
  };
}

export interface AdminFarmersQueryParams {
  first?: number;
  rows?: number;
  globalFilter?: string;
  status?: string;
  region?: string;
}

export interface AdminFarmersStateModel {
  farmers: AdminFarmer[];
  totalPages: number;
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  isLoading: boolean;
  errors: string[];
  summary: AdminFarmersSummary | null;
  regions: string[];
  isReviewing: boolean;
  reviewMessage: string | null;
  reviewErrors: string[];
  farmerDetail: AdminFarmerDetail | null;
  isDetailLoading: boolean;
  detailErrors: string[];
}

export class GetAdminFarmers {
  static readonly type = '[Admin Farmers] Get Farmers';
  constructor(public params?: AdminFarmersQueryParams) {}
}

export class ReviewAdminFarmer {
  static readonly type = '[Admin Farmers] Review Farmer';
  constructor(
    public farmerId: string,
    public action: 'approve' | 'reject',
    public reason?: string | null,
  ) {}
}

export class GetAdminFarmerDetail {
  static readonly type = '[Admin Farmers] Get Farmer Detail';
  constructor(public farmerId: string) {}
}

@State<AdminFarmersStateModel>({
  name: 'adminFarmers',
  defaults: {
    farmers: [],
    totalPages: 0,
    pageIndex: 0,
    pageSize: 10,
    totalCount: 0,
    isLoading: false,
    errors: [],
    summary: null,
    regions: [],
    isReviewing: false,
    reviewMessage: null,
    reviewErrors: [],
    farmerDetail: null,
    isDetailLoading: false,
    detailErrors: [],
  },
})
@Injectable()
export class AdminFarmersState {
  private readonly http = inject(HttpClient);

  @Selector()
  static isLoading(state: AdminFarmersStateModel): boolean {
    return state.isLoading;
  }

  @Selector()
  static errors(state: AdminFarmersStateModel): string[] {
    return state.errors;
  }

  @Selector()
  static farmers(state: AdminFarmersStateModel): AdminFarmer[] {
    return state.farmers;
  }

  @Selector()
  static farmersConfigs(state: AdminFarmersStateModel) {
    const { totalPages, pageIndex, pageSize, totalCount } = state;
    return { totalPages, pageIndex, pageSize, totalCount };
  }

  @Selector()
  static summary(state: AdminFarmersStateModel): AdminFarmersSummary | null {
    return state.summary;
  }

  @Selector()
  static regions(state: AdminFarmersStateModel): string[] {
    return state.regions;
  }

  @Selector()
  static isReviewing(state: AdminFarmersStateModel): boolean {
    return state.isReviewing;
  }

  @Selector()
  static reviewMessage(state: AdminFarmersStateModel): string | null {
    return state.reviewMessage;
  }

  @Selector()
  static reviewErrors(state: AdminFarmersStateModel): string[] {
    return state.reviewErrors;
  }

  @Selector()
  static farmerDetail(state: AdminFarmersStateModel): AdminFarmerDetail | null {
    return state.farmerDetail;
  }

  @Selector()
  static isDetailLoading(state: AdminFarmersStateModel): boolean {
    return state.isDetailLoading;
  }

  @Action(GetAdminFarmers)
  getFarmers(ctx: StateContext<AdminFarmersStateModel>, { params }: GetAdminFarmers) {
    ctx.patchState({ isLoading: true, errors: [] });

    let httpParams = new HttpParams();
    httpParams = httpParams.set('limit', String(params?.rows ?? 10)).set('offset', String(params?.first ?? 0));
    if (params?.globalFilter) httpParams = httpParams.set('search', params.globalFilter);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.region) httpParams = httpParams.set('region', params.region);

    return this.http.get<AdminFarmersResponse>(`${environment.api}/admin/farmers`, { params: httpParams }).pipe(
      tap((response) => {
        const data = normalizeListResponse(response.data);
        ctx.patchState({
          farmers: data.results,
          totalPages: data.totalPages,
          pageIndex: data.pageIndex,
          pageSize: data.pageSize,
          totalCount: data.totalCount,
          summary: response.data.summary ?? null,
          regions: response.data.filters?.regions ?? [],
          isLoading: false,
        });
      }),
      catchError((error: unknown) => {
        ctx.patchState({
          isLoading: false,
          errors: [extractErrorMessage(error, 'Unable to load farmers.')],
        });
        return of(error);
      }),
    );
  }

  @Action(ReviewAdminFarmer)
  reviewFarmer(ctx: StateContext<AdminFarmersStateModel>, { farmerId, action, reason }: ReviewAdminFarmer) {
    ctx.patchState({ isReviewing: true, reviewMessage: null, reviewErrors: [] });

    return this.http
      .post<{ message?: string; data: { id: string; status: string } }>(
        `${environment.api}/admin/farmers/${farmerId}/review`,
        { action, reason: reason || null },
      )
      .pipe(
        tap((response) => {
          const farmers = ctx.getState().farmers.map((farmer) =>
            farmer.id === farmerId ? { ...farmer, status: response.data.status } : farmer,
          );
          ctx.patchState({
            farmers,
            isReviewing: false,
            reviewMessage: response.message ?? 'Review recorded successfully.',
            reviewErrors: [],
          });
        }),
        catchError((error: unknown) => {
          ctx.patchState({
            isReviewing: false,
            reviewMessage: null,
            reviewErrors: [extractErrorMessage(error, 'Unable to review this farmer.')],
          });
          return of(error);
        }),
      );
  }

  @Action(GetAdminFarmerDetail)
  getFarmerDetail(ctx: StateContext<AdminFarmersStateModel>, { farmerId }: GetAdminFarmerDetail) {
    ctx.patchState({ isDetailLoading: true, detailErrors: [], farmerDetail: null });

    return this.http.get<{ data: AdminFarmerDetail }>(`${environment.api}/admin/farmers/${farmerId}`).pipe(
      tap((response) => {
        ctx.patchState({ farmerDetail: response.data, isDetailLoading: false });
      }),
      catchError((error: unknown) => {
        ctx.patchState({
          isDetailLoading: false,
          detailErrors: [extractErrorMessage(error, 'Unable to load farmer details.')],
        });
        return of(error);
      }),
    );
  }
}
