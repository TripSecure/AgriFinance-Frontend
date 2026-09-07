import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../../../environment/environment';
import { extractErrorMessage, normalizeListResponse } from '../../../../../shared/request.utils';

export interface InputProviderBusinessDetails {
  businessName?: string | null;
  registrationNumber?: string | null;
  tinNumber?: string | null;
  businessAddress?: string | null;
  contactPerson?: string | null;
  phoneNumber?: string | null;
  emailAddress?: string | null;
}

export interface InputProviderActivityItem extends Record<string, unknown> {
  id: string;
  providerId?: string | null;
  businessName?: string | null;
  name?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  serviceTypes?: string[];
  operationalJurisdictions?: string[];
  region?: string | null;
  status?: string | null;
  approvalStatus?: string | null;
  fulfilledOrdersCount?: number;
  activeOrdersCount?: number;
  totalOrdersCount?: number;
  businessDetails?: InputProviderBusinessDetails | null;
  lastActiveAt?: string | null;
  lastActivityAt?: string | null;
  lastActivityLabel?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface InputProvidersResponse {
  message?: string;
  success?: boolean;
  isSuccessful?: boolean;
  data: InputProvidersData | InputProviderActivityItem[];
  errors?: unknown;
}

interface InputProvidersData {
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
  results?: InputProviderActivityItem[];
  items?: InputProviderActivityItem[];
  data?: InputProviderActivityItem[];
}

export interface InputProvidersQueryParams {
  first?: number;
  rows?: number;
  globalFilter?: string;
  status?: string;
  serviceType?: string;
}

export interface PortfolioInputProvidersStateModel {
  totalPages: number;
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  isLoading: boolean;
  errors: string[];
  providers: InputProviderActivityItem[];
}

export class GetPortfolioInputProviders {
  static readonly type = '[Portfolio Input Providers] Get Providers Activity';
  constructor(public params?: InputProvidersQueryParams) {}
}

@State<PortfolioInputProvidersStateModel>({
  name: 'portfolioInputProviders',
  defaults: {
    providers: [],
    totalPages: 0,
    pageIndex: 0,
    pageSize: 10,
    totalCount: 0,
    isLoading: false,
    errors: [],
  },
})
@Injectable()
export class PortfolioInputProvidersState {
  private readonly http = inject(HttpClient);

  @Selector()
  static isLoading(state: PortfolioInputProvidersStateModel): boolean {
    return state.isLoading;
  }

  @Selector()
  static errors(state: PortfolioInputProvidersStateModel): string[] {
    return state.errors;
  }

  @Selector()
  static providers(state: PortfolioInputProvidersStateModel): InputProviderActivityItem[] {
    return state.providers;
  }

  @Selector()
  static providersConfigs(state: PortfolioInputProvidersStateModel) {
    const { totalPages, pageIndex, pageSize, totalCount } = state;
    return { totalPages, pageIndex, pageSize, totalCount };
  }

  @Action(GetPortfolioInputProviders)
  getProviders(
    ctx: StateContext<PortfolioInputProvidersStateModel>,
    { params }: GetPortfolioInputProviders,
  ) {
    ctx.patchState({ isLoading: true, errors: [] });

    return this.http
      .get<InputProvidersResponse>(
        `${environment.api}/portfolio/input-providers/activity`,
        {
          params: this.buildParams(params),
        },
      )
      .pipe(
        tap((response) => {
          const data = normalizeListResponse(response.data);
          ctx.patchState({
            providers: data.results,
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
            errors: [extractErrorMessage(error, 'Unable to load input service providers activity.')],
          });
          return of(error);
        }),
      );
  }

  private buildParams(params?: InputProvidersQueryParams): HttpParams {
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

    if (params.serviceType) {
      httpParams = httpParams.set('serviceType', params.serviceType);
    }

    return httpParams;
  }
}
