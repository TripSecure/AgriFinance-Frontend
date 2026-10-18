import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../../../environment/environment';
import { extractErrorMessage, normalizeListResponse } from '../../../../../shared/request.utils';

export interface AdminLoan extends Record<string, unknown> {
  id: string;
  farmerId: string;
  farmerName: string;
  requestedAmountGhs: number;
  approvedAmountGhs: number | null;
  riskScore: number | null;
  riskCategory: string | null;
  status: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

interface AdminLoansSummary {
  totalPortfolioGhs: number;
  pendingApplications: number;
  approvedThisWeek: number;
  repaymentRatePercent: number;
}

export interface AdminLoanDetail {
  loan: {
    id: string;
    farmerId: string;
    farmerName: string;
    farmerContact: string | null;
    eligibleAmountGhs: number;
    requestedAmountGhs: number;
    approvedAmountGhs: number | null;
    interestRatePercent: number;
    embeddedInsurancePremiumGhs: number;
    insuranceAcceptance: boolean;
    cropPlan: Record<string, unknown>;
    repaymentSchedule: Record<string, unknown>;
    inputBundle: unknown[];
    status: string;
    rejectionReason: string | null;
    statusHistory: unknown[];
    submittedAt: string | null;
    reviewedAt: string | null;
    createdAt: string;
    canReview: boolean;
  };
  vouchers: AdminLoanVoucher[];
  riskProfile: { id: string; score: number; riskCategory: string; premiumCategory: string } | null;
}

export interface AdminLoanVoucher {
  id: string;
  voucherCode: string;
  service: string;
  amountGhs: number;
  status: string;
  expiresAt: string | null;
  provider: { id: string; name: string } | null;
  order: { id: string; status: string } | null;
  lastSmsAt: string | null;
}

export interface ReviewAdminLoanPayload {
  decision: 'approve' | 'reject';
  approvedAmount?: number | null;
  reason?: string | null;
}

interface AdminLoansResponse {
  message?: string;
  success?: boolean;
  data: {
    summary?: AdminLoansSummary;
    queue?: AdminLoan[];
    portfolio?: { items?: AdminLoan[]; pagination?: Record<string, unknown> };
  };
}

export interface AdminLoansQueryParams {
  first?: number;
  rows?: number;
  globalFilter?: string;
  status?: string;
}

export interface AdminLoansStateModel {
  loans: AdminLoan[];
  totalPages: number;
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  isLoading: boolean;
  errors: string[];
  summary: AdminLoansSummary | null;
  queue: AdminLoan[];
  loanDetail: AdminLoanDetail | null;
  isDetailLoading: boolean;
  detailErrors: string[];
  isReviewing: boolean;
  reviewMessage: string | null;
}

export class GetAdminLoans {
  static readonly type = '[Admin Loans] Get Loans';
  constructor(public params?: AdminLoansQueryParams) {}
}

export class GetAdminLoanDetail {
  static readonly type = '[Admin Loans] Get Loan Detail';
  constructor(public loanId: string) {}
}

export class ReviewAdminLoan {
  static readonly type = '[Admin Loans] Review Loan';
  constructor(
    public loanId: string,
    public payload: ReviewAdminLoanPayload,
  ) {}
}

@State<AdminLoansStateModel>({
  name: 'adminLoans',
  defaults: {
    loans: [],
    totalPages: 0,
    pageIndex: 0,
    pageSize: 10,
    totalCount: 0,
    isLoading: false,
    errors: [],
    summary: null,
    queue: [],
    loanDetail: null,
    isDetailLoading: false,
    detailErrors: [],
    isReviewing: false,
    reviewMessage: null,
  },
})
@Injectable()
export class AdminLoansState {
  private readonly http = inject(HttpClient);

  @Selector()
  static isLoading(state: AdminLoansStateModel): boolean {
    return state.isLoading;
  }

  @Selector()
  static errors(state: AdminLoansStateModel): string[] {
    return state.errors;
  }

  @Selector()
  static loans(state: AdminLoansStateModel): AdminLoan[] {
    return state.loans;
  }

  @Selector()
  static loansConfigs(state: AdminLoansStateModel) {
    const { totalPages, pageIndex, pageSize, totalCount } = state;
    return { totalPages, pageIndex, pageSize, totalCount };
  }

  @Selector()
  static summary(state: AdminLoansStateModel): AdminLoansSummary | null {
    return state.summary;
  }

  @Selector()
  static queue(state: AdminLoansStateModel): AdminLoan[] {
    return state.queue;
  }

  @Selector()
  static loanDetail(state: AdminLoansStateModel): AdminLoanDetail | null {
    return state.loanDetail;
  }

  @Selector()
  static isDetailLoading(state: AdminLoansStateModel): boolean {
    return state.isDetailLoading;
  }

  @Selector()
  static detailErrors(state: AdminLoansStateModel): string[] {
    return state.detailErrors;
  }

  @Selector()
  static isReviewing(state: AdminLoansStateModel): boolean {
    return state.isReviewing;
  }

  @Selector()
  static reviewMessage(state: AdminLoansStateModel): string | null {
    return state.reviewMessage;
  }

  @Action(GetAdminLoans)
  getLoans(ctx: StateContext<AdminLoansStateModel>, { params }: GetAdminLoans) {
    ctx.patchState({ isLoading: true, errors: [] });

    let httpParams = new HttpParams();
    httpParams = httpParams.set('limit', String(params?.rows ?? 10)).set('offset', String(params?.first ?? 0));
    if (params?.globalFilter) httpParams = httpParams.set('search', params.globalFilter);
    if (params?.status) httpParams = httpParams.set('status', params.status);

    return this.http.get<AdminLoansResponse>(`${environment.api}/admin/loans`, { params: httpParams }).pipe(
      tap((response) => {
        const data = normalizeListResponse(response.data.portfolio ?? {});
        ctx.patchState({
          loans: data.results,
          totalPages: data.totalPages,
          pageIndex: data.pageIndex,
          pageSize: data.pageSize,
          totalCount: data.totalCount,
          summary: response.data.summary ?? null,
          queue: response.data.queue ?? [],
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

  @Action(GetAdminLoanDetail)
  getLoanDetail(ctx: StateContext<AdminLoansStateModel>, { loanId }: GetAdminLoanDetail) {
    ctx.patchState({ isDetailLoading: true, detailErrors: [], loanDetail: null });

    return this.http.get<{ data: AdminLoanDetail }>(`${environment.api}/admin/loans/${loanId}`).pipe(
      tap((response) => {
        ctx.patchState({ loanDetail: response.data, isDetailLoading: false });
      }),
      catchError((error: unknown) => {
        ctx.patchState({
          isDetailLoading: false,
          detailErrors: [extractErrorMessage(error, 'Unable to load loan application.')],
        });
        return of(error);
      }),
    );
  }

  @Action(ReviewAdminLoan)
  reviewLoan(ctx: StateContext<AdminLoansStateModel>, { loanId, payload }: ReviewAdminLoan) {
    ctx.patchState({ isReviewing: true, detailErrors: [], reviewMessage: null });

    return this.http
      .post<{ message?: string; data: AdminLoanDetail }>(`${environment.api}/admin/loans/${loanId}/review`, payload)
      .pipe(
        tap((response) => {
          const updated = response.data;
          ctx.patchState({
            isReviewing: false,
            loanDetail: updated,
            reviewMessage: response.message ?? null,
            loans: ctx.getState().loans.map((loan) =>
              loan.id === updated.loan.id
                ? {
                    ...loan,
                    status: updated.loan.status,
                    approvedAmountGhs: updated.loan.approvedAmountGhs,
                    reviewedAt: updated.loan.reviewedAt,
                  }
                : loan,
            ),
            queue: ctx.getState().queue.filter((loan) => loan.id !== updated.loan.id),
          });
        }),
        catchError((error: unknown) => {
          ctx.patchState({
            isReviewing: false,
            detailErrors: [extractErrorMessage(error, 'Unable to review this loan.')],
          });
          return of(error);
        }),
      );
  }
}
