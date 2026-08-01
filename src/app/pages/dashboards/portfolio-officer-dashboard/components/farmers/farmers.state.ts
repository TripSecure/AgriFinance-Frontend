import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../../../environment/environment';

export interface Farmer extends Record<string, unknown> {
  id: string;
  fullName?: string | null;
  full_name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  nationalId?: string | null;
  nationalIdNumber?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  email?: string | null;
  phone?: string | null;
  phoneNumber?: string | null;
  community?: string | null;
  location?: string | null;
  region?: string | null;
  status?: string | null;
  approvalStatus?: string | null;
  createdAt?: string | null;
  dateCreated?: string | null;
}

interface FarmersResponse {
  message?: string;
  code?: number;
  success?: boolean;
  isSuccessful?: boolean;
  data: FarmersData | Farmer[];
  errors?: unknown;
}

interface FarmerMutationResponse {
  message?: string;
  success?: boolean;
  isSuccessful?: boolean;
  data?: Farmer | Record<string, unknown>;
  errors?: unknown;
}

interface FarmerDetailsResponse {
  message?: string;
  success?: boolean;
  isSuccessful?: boolean;
  data?: Farmer | Record<string, unknown>;
  errors?: unknown;
}

export interface CreateFarmerPayload {
  submitForReview: boolean;
  fullName: string;
  nationalId: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  gender: string;
  farmDetails: {
    farmerCode: string;
    farmSizeHectares: number;
    primaryCrop: string;
    farmAddressRegion: string;
    district: string;
    community: string;
    gpsLocation: {
      latitude: number;
      longitude: number;
    };
    cooperativeName: string;
  };
  productionHistory: {
    yearsOfFarmingExperience: number;
    lastSeasonCrop: string;
    yieldKg: number;
    revenueGhs: number;
    secondaryCrop: string;
    irrigationMethod: string;
  };
  financialInformation: {
    bankName: string;
    accountNumber: string;
    mobileMoneyProvider: string;
    mobileMoneyNumber: string;
    estimatedAnnualIncome: number;
    existingLoans: string;
  };
  documentUpload: {
    nationalIdFront: string;
    nationalIdBack: string;
    passportPhoto: string;
    farmOwnershipDocument: string;
  };
  consentDeclarations: {
    dataPrivacyConsent: boolean;
    accuracyConsent: boolean;
    thirdPartyCreditVerificationConsent: boolean;
  };
}

interface FarmersData {
  totalPages?: number;
  pageIndex?: number;
  pageSize?: number;
  totalCount?: number;
  results?: Farmer[];
  items?: Farmer[];
  data?: Farmer[];
}

export interface FarmersQueryParams {
  first?: number;
  rows?: number;
  globalFilter?: string;
  sortField?: string;
  sortOrder?: number;
  status?: string;
}

export interface FarmersStateModel {
  totalPages: number;
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  isLoading: boolean;
  isDetailLoading: boolean;
  isCreating: boolean;
  message: string | null;
  errors: string[];
  farmers: Farmer[];
  selectedFarmer: Farmer | null;
}

export class GetPortfolioFarmers {
  static readonly type = '[Portfolio Farmers] Get Farmers';
  constructor(public params?: FarmersQueryParams) {}
}

export class GetPortfolioFarmerDetails {
  static readonly type = '[Portfolio Farmers] Get Farmer Details';
  constructor(public farmerId: string) {}
}

export class CreatePortfolioFarmer {
  static readonly type = '[Portfolio Farmers] Create Farmer';
  constructor(public payload: CreateFarmerPayload) {}
}

export class UpdatePortfolioFarmer {
  static readonly type = '[Portfolio Farmers] Update Farmer';
  constructor(
    public farmerId: string,
    public payload: CreateFarmerPayload,
  ) {}
}

@State<FarmersStateModel>({
  name: 'portfolioFarmers',
  defaults: {
    farmers: [],
    selectedFarmer: null,
    totalPages: 0,
    pageIndex: 0,
    pageSize: 10,
    totalCount: 0,
    isLoading: false,
    isDetailLoading: false,
    isCreating: false,
    message: null,
    errors: [],
  },
})
@Injectable()
export class FarmersState {
  private readonly http = inject(HttpClient);

  @Selector()
  static isLoading(state: FarmersStateModel): boolean {
    return state.isLoading;
  }

  @Selector()
  static isDetailLoading(state: FarmersStateModel): boolean {
    return state.isDetailLoading;
  }

  @Selector()
  static isCreating(state: FarmersStateModel): boolean {
    return state.isCreating;
  }

  @Selector()
  static message(state: FarmersStateModel): string | null {
    return state.message;
  }

  @Selector()
  static errors(state: FarmersStateModel): string[] {
    return state.errors;
  }

  @Selector()
  static farmers(state: FarmersStateModel): Farmer[] {
    return state.farmers;
  }

  @Selector()
  static selectedFarmer(state: FarmersStateModel): Farmer | null {
    return state.selectedFarmer;
  }

  @Selector()
  static farmersConfigs(state: FarmersStateModel) {
    const { totalPages, pageIndex, pageSize, totalCount } = state;
    return { totalPages, pageIndex, pageSize, totalCount };
  }

  @Action(GetPortfolioFarmers)
  getFarmers(ctx: StateContext<FarmersStateModel>, { params }: GetPortfolioFarmers) {
    ctx.patchState({ isLoading: true });

    return this.http
      .get<FarmersResponse>(`${environment.api}/portfolio/farmers`, {
        params: this.toHttpParams(params),
      })
      .pipe(
        tap((response) => {
          const data = this.normalizeFarmersData(response.data);
          ctx.patchState({
            farmers: data.results,
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
            errors: [this.getErrorMessage(error, 'Unable to load farmers.')],
          });
          return of(error);
        }),
      );
  }

  @Action(GetPortfolioFarmerDetails)
  getFarmerDetails(ctx: StateContext<FarmersStateModel>, { farmerId }: GetPortfolioFarmerDetails) {
    ctx.patchState({ isDetailLoading: true, selectedFarmer: null, message: null, errors: [] });

    return this.http
      .get<FarmerDetailsResponse>(`${environment.api}/portfolio/farmers/${farmerId}`)
      .pipe(
        tap((response) => {
          ctx.patchState({
            selectedFarmer: this.normalizeFarmerDetail(response.data, farmerId),
            isDetailLoading: false,
            message: response.message ?? null,
          });
        }),
        catchError((error: unknown) => {
          ctx.patchState({
            selectedFarmer: null,
            isDetailLoading: false,
            errors: [this.getErrorMessage(error, 'Unable to load farmer details.')],
          });
          return of(error);
        }),
      );
  }

  @Action(CreatePortfolioFarmer)
  createFarmer(ctx: StateContext<FarmersStateModel>, { payload }: CreatePortfolioFarmer) {
    ctx.patchState({ isCreating: true, message: null, errors: [] });

    return this.http
      .post<FarmerMutationResponse>(`${environment.api}/portfolio/farmers`, payload)
      .pipe(
        tap((response) => this.patchMutationResult(ctx, response, 'Farmer added successfully.')),
        catchError((error: unknown) => {
          const message = this.getErrorMessage(
            error,
            'Unable to add farmer. Please review the form and try again.',
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

  @Action(UpdatePortfolioFarmer)
  updateFarmer(ctx: StateContext<FarmersStateModel>, { farmerId, payload }: UpdatePortfolioFarmer) {
    ctx.patchState({ isCreating: true, message: null, errors: [] });

    return this.http
      .put<FarmerMutationResponse>(`${environment.api}/portfolio/farmers/${farmerId}`, payload)
      .pipe(
        tap((response) => {
          const farmer = this.normalizeFarmerDetail(response.data, farmerId);
          const isSuccessful = response.success === true || response.isSuccessful === true;

          ctx.patchState({
            isCreating: false,
            message: response.message ?? (isSuccessful ? 'Farmer updated successfully.' : null),
            errors: isSuccessful ? [] : this.getResponseErrors(response),
            selectedFarmer: farmer ?? ctx.getState().selectedFarmer,
            farmers: farmer
              ? this.replaceFarmer(ctx.getState().farmers, farmer)
              : ctx.getState().farmers,
          });
        }),
        catchError((error: unknown) => {
          const message = this.getErrorMessage(
            error,
            'Unable to update farmer. Please review the form and try again.',
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

  private patchMutationResult(
    ctx: StateContext<FarmersStateModel>,
    response: FarmerMutationResponse,
    successMessage: string,
  ): void {
    const isSuccessful = response.success === true || response.isSuccessful === true;
    ctx.patchState({
      isCreating: false,
      message: response.message ?? (isSuccessful ? successMessage : null),
      errors: isSuccessful ? [] : this.getResponseErrors(response),
    });
  }

  private replaceFarmer(farmers: Farmer[], farmer: Farmer): Farmer[] {
    return farmers.map((item) => (item.id === farmer.id ? farmer : item));
  }

  private toHttpParams(params?: FarmersQueryParams): HttpParams {
    let httpParams = new HttpParams();

    if (!params) {
      return httpParams;
    }

    const pageSize = params.rows ?? 10;
    const pageIndex = Math.floor((params.first ?? 0) / pageSize) + 1;

    httpParams = httpParams.set('pageIndex', String(pageIndex));
    httpParams = httpParams.set('pageSize', String(pageSize));

    if (params.globalFilter) {
      httpParams = httpParams.set('search', params.globalFilter);
    }

    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }

    if (params.sortField) {
      httpParams = httpParams.set('sortBy', params.sortField);
      httpParams = httpParams.set('sortOrder', params.sortOrder === -1 ? 'desc' : 'asc');
    }

    return httpParams;
  }

  private getErrorMessage(error: unknown, fallbackMessage: string): string {
    if (error instanceof HttpErrorResponse) {
      if (this.hasMessage(error.error)) {
        return error.error.message;
      }

      if (typeof error.error === 'string') {
        return error.error;
      }

      if (error.message) {
        return error.message;
      }
    }

    return fallbackMessage;
  }

  private getResponseErrors(response: FarmerMutationResponse): string[] {
    if (Array.isArray(response.errors)) {
      return response.errors.filter((error): error is string => typeof error === 'string');
    }

    if (typeof response.errors === 'string') {
      return [response.errors];
    }

    if (response.message) {
      return [response.message];
    }

    return ['Unable to save farmer. Please review the form and try again.'];
  }

  private hasMessage(value: unknown): value is { message: string } {
    return (
      typeof value === 'object' &&
      value !== null &&
      'message' in value &&
      typeof value.message === 'string'
    );
  }

  private normalizeFarmerDetail(data: unknown, fallbackId = ''): Farmer | null {
    if (!this.isRecord(data)) {
      return null;
    }

    for (const key of ['farmer', 'profile', 'record', 'data']) {
      const nested = data[key];
      if (this.isRecord(nested)) {
        return this.withFallbackId({ ...data, ...nested }, fallbackId);
      }
    }

    return this.withFallbackId(data, fallbackId);
  }

  private isFarmer(value: unknown): value is Farmer {
    return this.isRecord(value) && typeof value['id'] === 'string';
  }

  private withFallbackId(record: Record<string, unknown>, fallbackId: string): Farmer | null {
    if (this.isFarmer(record)) {
      return record;
    }

    if (!fallbackId) {
      return null;
    }

    return { ...record, id: fallbackId } as Farmer;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private normalizeFarmersData(data: FarmersData | Farmer[]): Required<
    Pick<FarmersData, 'totalPages' | 'pageIndex' | 'pageSize' | 'totalCount'>
  > & {
    results: Farmer[];
  } {
    if (Array.isArray(data)) {
      return {
        results: data,
        totalPages: 1,
        pageIndex: 1,
        pageSize: data.length,
        totalCount: data.length,
      };
    }

    const results = data.results ?? data.items ?? data.data ?? [];

    return {
      results,
      totalPages: data.totalPages ?? 1,
      pageIndex: data.pageIndex ?? 1,
      pageSize: data.pageSize ?? results.length,
      totalCount: data.totalCount ?? results.length,
    };
  }
}
