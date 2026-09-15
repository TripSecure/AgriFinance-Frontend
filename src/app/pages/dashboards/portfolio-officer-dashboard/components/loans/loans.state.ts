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
  farmerId?: string | null;
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
  farmerId?: string;
  first?: number;
  rows?: number;
  globalFilter?: string;
  status?: string;
}

export interface CropPlanPayload {
  plannedAcreageHa: number;
  expectedYieldMt: number;
  plantingDate: string;
  harvestDate: string;
}

export interface LoanParametersPayload {
  loanAmount: number;
  interestRateAnnual: number;
  repaymentPeriodMonths: number;
}

export interface TariaAssessmentPayload {
  assessmentId: string;
  farmerId?: string;
  farmId?: string;
  submittedAt?: string;
  persisted?: boolean;
  score: number;
  rawScore?: number;
  riskLevel?: string;
  loanRecommendationTier?: string;
  loanAmount?: number;
  insurancePremium?: number;
  sectionScores?: unknown[];
}

export interface CreatePortfolioLoanPayload {
  farmId: string;
  cropPlan: CropPlanPayload;
  loanParameters: LoanParametersPayload;
  selectedServices: string[];
  insuranceIncluded: boolean;
  submissionTarget: 'bank' | 'insurance' | string;
  bankUserId?: string;
  notes?: string;
  tariaAssessment?: TariaAssessmentPayload;
  [key: string]: unknown;
}

export interface PortfolioLoansStateModel {
  totalPages: number;
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  isLoading: boolean;
  isCreating: boolean;
  isLoadingRiskPreview: boolean;
  message: string | null;
  errors: string[];
  loans: PortfolioLoanApplication[];
}

export class GetPortfolioLoans {
  static readonly type = '[Portfolio Loans] Get Loans';
  constructor(public params?: PortfolioLoansQueryParams) {}
}

export class CreatePortfolioLoan {
  static readonly type = '[Portfolio Loans] Create Loan';
  constructor(public farmerId: string, public payload: CreatePortfolioLoanPayload) {}
}

export class CreatePortfolioLoanRiskPreview {
  static readonly type = '[Portfolio Loans] Create Risk Preview';
  constructor(public farmerId: string, public payload: CreatePortfolioLoanPayload) {}
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
    isCreating: false,
    isLoadingRiskPreview: false,
    message: null,
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
  static isCreating(state: PortfolioLoansStateModel): boolean {
    return state.isCreating;
  }

  @Selector()
  static isLoadingRiskPreview(state: PortfolioLoansStateModel): boolean {
    return state.isLoadingRiskPreview;
  }

  @Selector()
  static message(state: PortfolioLoansStateModel): string | null {
    return state.message;
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

    const endpoint = params?.farmerId
      ? `${environment.api}/portfolio/farmers/${params.farmerId}/loans`
      : `${environment.api}/portfolio/loans`;

    return this.http
      .get<PortfolioLoansResponse>(endpoint, {
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

  @Action(CreatePortfolioLoan)
  createLoan(
    ctx: StateContext<PortfolioLoansStateModel>,
    { farmerId, payload }: CreatePortfolioLoan,
  ) {
    ctx.patchState({ isCreating: true, message: null, errors: [] });

    return this.http
      .post<{ message?: string; success?: boolean; isSuccessful?: boolean; data?: unknown }>(
        `${environment.api}/portfolio/farmers/${farmerId}/loans`,
        payload,
      )
      .pipe(
        tap((response) => {
          ctx.patchState({
            isCreating: false,
            message: response.message ?? 'Loan application saved successfully.',
            errors: [],
          });
        }),
        catchError((error: unknown) => {
          const message = extractErrorMessage(
            error,
            'Unable to submit loan application. Please review the form and try again.',
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

  @Action(CreatePortfolioLoanRiskPreview)
  createRiskPreview(
    ctx: StateContext<PortfolioLoansStateModel>,
    { farmerId, payload }: CreatePortfolioLoanRiskPreview,
  ) {
    ctx.patchState({ isLoadingRiskPreview: true, message: null, errors: [] });

    return this.http
      .post<{ message?: string; success?: boolean; isSuccessful?: boolean; data?: unknown }>(
        `${environment.api}/portfolio/farmers/${farmerId}/loans/risk-preview`,
        payload,
      )
      .pipe(
        tap((response) => {
          ctx.patchState({
            isLoadingRiskPreview: false,
            message: response.message ?? 'Risk preview initialized successfully.',
            errors: [],
          });
        }),
        catchError((error: unknown) => {
          const message = extractErrorMessage(
            error,
            'Unable to initialize risk preview. Please try again.',
          );
          ctx.patchState({
            isLoadingRiskPreview: false,
            message: null,
            errors: [message],
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
