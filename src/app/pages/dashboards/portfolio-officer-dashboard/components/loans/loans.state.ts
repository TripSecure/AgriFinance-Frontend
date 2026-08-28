import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../../../environment/environment';
import { extractErrorMessage, normalizeListResponse } from '../../../../../shared/request.utils';

export interface PortfolioLoanFarmer {
  id: string;
  fullName?: string | null;
  primaryCrop?: string | null;
}

export interface PortfolioLoanStatus {
  code?: string | null;
  label?: string | null;
  tone?: 'success' | 'warning' | 'danger' | 'neutral' | string | null;
}

export interface PortfolioLoanRiskProfile {
  score?: number | null;
  category?: string | null;
}

export interface PortfolioLoanFulfillmentReadiness {
  stage?: string | null;
  label?: string | null;
}

export interface PortfolioLoanApplication extends Record<string, unknown> {
  id: string;
  farmer?: PortfolioLoanFarmer | null;
  status?: PortfolioLoanStatus | null;
  requestedAmount?: number | null;
  eligibleAmount?: number | null;
  approvedAmount?: number | null;
  insuranceIncluded?: boolean;
  selectedServices?: string[];
  selectedServiceCount?: number;
  riskProfile?: PortfolioLoanRiskProfile | null;
  fulfillmentReadiness?: PortfolioLoanFulfillmentReadiness | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  updatedAt?: string | null;
  lastActivityAt?: string | null;
  lastActivityLabel?: string | null;
  decisioning?: Record<string, unknown> | null;
}

interface PortfolioLoansResponse {
  message?: string;
  success?: boolean;
  isSuccessful?: boolean;
  data: PortfolioLoansData | PortfolioLoanApplication[];
  errors?: unknown;
}

interface PortfolioLoansData {
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
  results?: PortfolioLoanApplication[];
  items?: PortfolioLoanApplication[];
  data?: PortfolioLoanApplication[];
}

export interface PortfolioLoansQueryParams {
  first?: number;
  rows?: number;
  globalFilter?: string;
  status?: string;
}

export interface PortfolioLoansStateModel {
  totalPages: number;
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  isLoading: boolean;
  errors: string[];
  loans: PortfolioLoanApplication[];
}

export class GetPortfolioLoans {
  static readonly type = '[Portfolio Loans] Get Loans';
  constructor(public params?: PortfolioLoansQueryParams) {}
}

@State<PortfolioLoansStateModel>({
  name: 'portfolioLoans',
  defaults: {
    loans: [],
    totalPages: 0,
    pageIndex: 0,
    pageSize: 10,
    totalCount: 0,
    isLoading: false,
    errors: [],
  },
})
@Injectable()
export class PortfolioLoansState {
  private readonly http = inject(HttpClient);

  @Selector()
  static isLoading(state: PortfolioLoansStateModel): boolean {
    return state.isLoading;
  }

  @Selector()
  static errors(state: PortfolioLoansStateModel): string[] {
    return state.errors;
  }

  @Selector()
  static loans(state: PortfolioLoansStateModel): PortfolioLoanApplication[] {
    return state.loans;
  }

  @Selector()
  static loansConfigs(state: PortfolioLoansStateModel) {
    const { totalPages, pageIndex, pageSize, totalCount } = state;
    return { totalPages, pageIndex, pageSize, totalCount };
  }

  @Action(GetPortfolioLoans)
  getLoans(ctx: StateContext<PortfolioLoansStateModel>, { params }: GetPortfolioLoans) {
    ctx.patchState({ isLoading: true, errors: [] });

    return this.http
      .get<PortfolioLoansResponse>(`${environment.api}/portfolio/loans`, {
        params: this.buildParams(params),
      })
      .pipe(
        tap((response) => {
          const data = normalizeListResponse(response.data);
          ctx.patchState({
            loans: data.results,
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
            errors: [extractErrorMessage(error, 'Unable to load loan applications.')],
          });
          return of(error);
        }),
      );
  }

  private buildParams(params?: PortfolioLoansQueryParams): HttpParams {
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

    return httpParams;
  }
}
