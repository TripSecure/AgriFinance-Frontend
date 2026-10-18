import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../../../environment/environment';
import { extractErrorMessage } from '../../../../../shared/request.utils';

export interface LoanVoucher {
  id: string;
  voucherCode: string;
  qrPayload: string;
  service: string;
  providerRole: string | null;
  amountGhs: number;
  status: 'generated' | 'assigned' | 'redeemed' | 'expired' | 'cancelled';
  expiresAt: string | null;
  redeemedAt: string | null;
  provider: { id: string; name: string } | null;
  order: { id: string; status: string } | null;
  canAssign: boolean;
}

export interface VoucherProviderOption {
  id: string;
  name: string;
}

interface LoanDetailResponse {
  data: {
    application: { id: string; farmerName: string; status: string; approvedAmount: number | null };
    vouchers?: LoanVoucher[];
  };
}

export interface LoanVouchersStateModel {
  loanId: string | null;
  farmerName: string | null;
  loanStatus: string | null;
  approvedAmount: number | null;
  vouchers: LoanVoucher[];
  isLoading: boolean;
  providers: VoucherProviderOption[];
  isProvidersLoading: boolean;
  isAssigning: boolean;
  errors: string[];
}

export class GetLoanVouchers {
  static readonly type = '[Loan Vouchers] Get Vouchers';
  constructor(public loanId: string) {}
}

export class GetVoucherProviders {
  static readonly type = '[Loan Vouchers] Get Providers';
  constructor(public voucherId: string) {}
}

export class AssignVoucher {
  static readonly type = '[Loan Vouchers] Assign Voucher';
  constructor(
    public voucherId: string,
    public providerId: string,
  ) {}
}

@State<LoanVouchersStateModel>({
  name: 'loanVouchers',
  defaults: {
    loanId: null,
    farmerName: null,
    loanStatus: null,
    approvedAmount: null,
    vouchers: [],
    isLoading: false,
    providers: [],
    isProvidersLoading: false,
    isAssigning: false,
    errors: [],
  },
})
@Injectable()
export class LoanVouchersState {
  private readonly http = inject(HttpClient);

  @Selector()
  static vouchers(state: LoanVouchersStateModel): LoanVoucher[] {
    return state.vouchers;
  }

  @Selector()
  static loan(state: LoanVouchersStateModel) {
    return {
      id: state.loanId,
      farmerName: state.farmerName,
      status: state.loanStatus,
      approvedAmount: state.approvedAmount,
    };
  }

  @Selector()
  static isLoading(state: LoanVouchersStateModel): boolean {
    return state.isLoading;
  }

  @Selector()
  static providers(state: LoanVouchersStateModel): VoucherProviderOption[] {
    return state.providers;
  }

  @Selector()
  static isProvidersLoading(state: LoanVouchersStateModel): boolean {
    return state.isProvidersLoading;
  }

  @Selector()
  static isAssigning(state: LoanVouchersStateModel): boolean {
    return state.isAssigning;
  }

  @Selector()
  static errors(state: LoanVouchersStateModel): string[] {
    return state.errors;
  }

  @Action(GetLoanVouchers)
  getVouchers(ctx: StateContext<LoanVouchersStateModel>, { loanId }: GetLoanVouchers) {
    ctx.patchState({ isLoading: true, errors: [], loanId, vouchers: [] });

    return this.http.get<LoanDetailResponse>(`${environment.api}/portfolio/loans/${loanId}`).pipe(
      tap((response) => {
        ctx.patchState({
          farmerName: response.data.application.farmerName,
          loanStatus: response.data.application.status,
          approvedAmount: response.data.application.approvedAmount,
          vouchers: response.data.vouchers ?? [],
          isLoading: false,
        });
      }),
      catchError((error: unknown) => {
        ctx.patchState({
          isLoading: false,
          errors: [extractErrorMessage(error, 'Unable to load vouchers for this loan.')],
        });
        return of(error);
      }),
    );
  }

  @Action(GetVoucherProviders)
  getProviders(ctx: StateContext<LoanVouchersStateModel>, { voucherId }: GetVoucherProviders) {
    ctx.patchState({ isProvidersLoading: true, providers: [], errors: [] });

    return this.http
      .get<{ data: { providers: VoucherProviderOption[] } }>(
        `${environment.api}/portfolio/vouchers/${voucherId}/providers`,
      )
      .pipe(
        tap((response) => {
          ctx.patchState({ providers: response.data.providers, isProvidersLoading: false });
        }),
        catchError((error: unknown) => {
          ctx.patchState({
            isProvidersLoading: false,
            errors: [extractErrorMessage(error, 'Unable to load providers for this voucher.')],
          });
          return of(error);
        }),
      );
  }

  @Action(AssignVoucher)
  assignVoucher(ctx: StateContext<LoanVouchersStateModel>, { voucherId, providerId }: AssignVoucher) {
    ctx.patchState({ isAssigning: true, errors: [] });

    return this.http
      .post<{ data: { voucher: LoanVoucher | null } }>(`${environment.api}/portfolio/vouchers/${voucherId}/assign`, {
        providerId,
      })
      .pipe(
        tap((response) => {
          const updated = response.data.voucher;
          ctx.patchState({
            isAssigning: false,
            vouchers: updated
              ? ctx.getState().vouchers.map((voucher) => (voucher.id === updated.id ? updated : voucher))
              : ctx.getState().vouchers,
          });
        }),
        catchError((error: unknown) => {
          ctx.patchState({
            isAssigning: false,
            errors: [extractErrorMessage(error, 'Unable to assign this voucher.')],
          });
          return of(error);
        }),
      );
  }
}
