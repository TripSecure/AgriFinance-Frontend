import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../../../environment/environment';
import { extractErrorMessage, normalizeListResponse } from '../../../../../shared/request.utils';

export interface ProviderOrder extends Record<string, unknown> {
  id: string;
  status: 'pending' | 'accepted' | 'in_transit' | 'pending_review' | 'delivered' | 'rejected' | 'cancelled';
  farmerId: string;
  farmerName: string;
  voucherId: string;
  voucherCode: string | null;
  inputType: string;
  amountGhs: number;
  deliveryNotes: string | null;
  proofOfDelivery: string[];
  deliveredAt: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderOrderFarmer {
  id: string;
  fullName: string;
  phone: string | null;
}

export interface ProviderOrderVoucher {
  id: string;
  voucherCode: string;
  inputType: string;
  status: string;
  expiresAt: string | null;
}

export interface ProviderDashboardSummary {
  totalOrders: number;
  pendingCount: number;
  acceptedCount: number;
  inTransitCount: number;
  pendingReviewCount: number;
  deliveredCount: number;
  rejectedCount: number;
  cancelledCount: number;
  totalValueDeliveredGhs: number;
  totalValuePendingGhs: number;
  lastActivityAt: string | null;
}

interface ProviderOrdersResponse {
  message?: string;
  success?: boolean;
  data: { items?: ProviderOrder[]; pagination?: Record<string, unknown> };
}

interface ProviderOrderDetailResponse {
  message?: string;
  success?: boolean;
  data: { order: ProviderOrder; farmer: ProviderOrderFarmer | null; voucher: ProviderOrderVoucher | null };
}

interface ProviderDashboardResponse {
  message?: string;
  success?: boolean;
  data: { summary: ProviderDashboardSummary; recentOrders: ProviderOrder[] };
}

export interface ProviderOrdersQueryParams {
  first?: number;
  rows?: number;
  status?: 'all' | 'pending' | 'accepted' | 'in_transit' | 'pending_review' | 'delivered' | 'rejected' | 'cancelled';
}

export interface DeliverOrderPayload {
  deliveryNotes?: string | null;
  proofOfDelivery: string[];
}

export interface RedeemVoucherPayload {
  qrPayload: string;
  deliveryNotes?: string | null;
  proofOfDelivery: string[];
}

export interface ProviderOrdersStateModel {
  orders: ProviderOrder[];
  totalPages: number;
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  isLoading: boolean;
  isMutating: boolean;
  message: string | null;
  errors: string[];
  dashboardSummary: ProviderDashboardSummary | null;
  dashboardRecentOrders: ProviderOrder[];
  isDashboardLoading: boolean;
  redeemResult: { order: ProviderOrder; voucher: ProviderOrderVoucher } | null;
  isRedeeming: boolean;
  redeemErrors: string[];
}

export class GetProviderOrders {
  static readonly type = '[Provider Orders] Get Orders';
  constructor(public params?: ProviderOrdersQueryParams) {}
}

export class AcceptProviderOrder {
  static readonly type = '[Provider Orders] Accept Order';
  constructor(public orderId: string) {}
}

export class DispatchProviderOrder {
  static readonly type = '[Provider Orders] Dispatch Order';
  constructor(public orderId: string, public deliveryNotes?: string | null) {}
}

export class DeliverProviderOrder {
  static readonly type = '[Provider Orders] Deliver Order';
  constructor(public orderId: string, public payload: DeliverOrderPayload) {}
}

export class CancelProviderOrder {
  static readonly type = '[Provider Orders] Cancel Order';
  constructor(public orderId: string, public reason?: string | null) {}
}

export class GetProviderDashboard {
  static readonly type = '[Provider Orders] Get Dashboard';
}

export class RedeemVoucher {
  static readonly type = '[Provider Orders] Redeem Voucher';
  constructor(public payload: RedeemVoucherPayload) {}
}

@State<ProviderOrdersStateModel>({
  name: 'providerOrders',
  defaults: {
    orders: [],
    totalPages: 0,
    pageIndex: 0,
    pageSize: 10,
    totalCount: 0,
    isLoading: false,
    isMutating: false,
    message: null,
    errors: [],
    dashboardSummary: null,
    dashboardRecentOrders: [],
    isDashboardLoading: false,
    redeemResult: null,
    isRedeeming: false,
    redeemErrors: [],
  },
})
@Injectable()
export class ProviderOrdersState {
  private readonly http = inject(HttpClient);

  @Selector()
  static isLoading(state: ProviderOrdersStateModel): boolean {
    return state.isLoading;
  }

  @Selector()
  static isMutating(state: ProviderOrdersStateModel): boolean {
    return state.isMutating;
  }

  @Selector()
  static message(state: ProviderOrdersStateModel): string | null {
    return state.message;
  }

  @Selector()
  static errors(state: ProviderOrdersStateModel): string[] {
    return state.errors;
  }

  @Selector()
  static orders(state: ProviderOrdersStateModel): ProviderOrder[] {
    return state.orders;
  }

  @Selector()
  static ordersConfigs(state: ProviderOrdersStateModel) {
    const { totalPages, pageIndex, pageSize, totalCount } = state;
    return { totalPages, pageIndex, pageSize, totalCount };
  }

  @Selector()
  static dashboardSummary(state: ProviderOrdersStateModel): ProviderDashboardSummary | null {
    return state.dashboardSummary;
  }

  @Selector()
  static dashboardRecentOrders(state: ProviderOrdersStateModel): ProviderOrder[] {
    return state.dashboardRecentOrders;
  }

  @Selector()
  static isDashboardLoading(state: ProviderOrdersStateModel): boolean {
    return state.isDashboardLoading;
  }

  @Selector()
  static redeemResult(state: ProviderOrdersStateModel) {
    return state.redeemResult;
  }

  @Selector()
  static isRedeeming(state: ProviderOrdersStateModel): boolean {
    return state.isRedeeming;
  }

  @Selector()
  static redeemErrors(state: ProviderOrdersStateModel): string[] {
    return state.redeemErrors;
  }

  @Action(GetProviderOrders)
  getOrders(ctx: StateContext<ProviderOrdersStateModel>, { params }: GetProviderOrders) {
    ctx.patchState({ isLoading: true, errors: [] });

    let httpParams = new HttpParams();
    const limit = params?.rows ?? 10;
    const offset = params?.first ?? 0;
    httpParams = httpParams.set('limit', String(limit)).set('offset', String(offset));
    if (params?.status) {
      httpParams = httpParams.set('status', params.status);
    }

    return this.http.get<ProviderOrdersResponse>(`${environment.api}/provider/orders`, { params: httpParams }).pipe(
      tap((response) => {
        const data = normalizeListResponse(response.data);
        ctx.patchState({
          orders: data.results,
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
          errors: [extractErrorMessage(error, 'Unable to load your orders.')],
        });
        return of(error);
      }),
    );
  }

  @Action(AcceptProviderOrder)
  acceptOrder(ctx: StateContext<ProviderOrdersStateModel>, { orderId }: AcceptProviderOrder) {
    return this.runMutation(
      ctx,
      this.http.post<ProviderOrderDetailResponse>(`${environment.api}/provider/orders/${orderId}/accept`, {}),
      'Order accepted successfully.',
      'Unable to accept this order.',
    );
  }

  @Action(DispatchProviderOrder)
  dispatchOrder(ctx: StateContext<ProviderOrdersStateModel>, { orderId, deliveryNotes }: DispatchProviderOrder) {
    return this.runMutation(
      ctx,
      this.http.post<ProviderOrderDetailResponse>(`${environment.api}/provider/orders/${orderId}/dispatch`, {
        deliveryNotes: deliveryNotes || null,
      }),
      'Order marked in transit.',
      'Unable to mark this order in transit.',
    );
  }

  @Action(DeliverProviderOrder)
  deliverOrder(ctx: StateContext<ProviderOrdersStateModel>, { orderId, payload }: DeliverProviderOrder) {
    return this.runMutation(
      ctx,
      this.http.post<ProviderOrderDetailResponse>(`${environment.api}/provider/orders/${orderId}/deliver`, {
        deliveryNotes: payload.deliveryNotes || null,
        proofOfDelivery: payload.proofOfDelivery,
      }),
      'Order submitted for portfolio officer review.',
      'Unable to mark this order delivered.',
    );
  }

  @Action(CancelProviderOrder)
  cancelOrder(ctx: StateContext<ProviderOrdersStateModel>, { orderId, reason }: CancelProviderOrder) {
    return this.runMutation(
      ctx,
      this.http.post<ProviderOrderDetailResponse>(`${environment.api}/provider/orders/${orderId}/cancel`, {
        reason: reason || null,
      }),
      'Order cancelled successfully.',
      'Unable to cancel this order.',
    );
  }

  @Action(GetProviderDashboard)
  getDashboard(ctx: StateContext<ProviderOrdersStateModel>) {
    ctx.patchState({ isDashboardLoading: true });

    return this.http.get<ProviderDashboardResponse>(`${environment.api}/provider/dashboard`).pipe(
      tap((response) => {
        ctx.patchState({
          dashboardSummary: response.data.summary,
          dashboardRecentOrders: response.data.recentOrders,
          isDashboardLoading: false,
        });
      }),
      catchError((error: unknown) => {
        ctx.patchState({
          isDashboardLoading: false,
          errors: [extractErrorMessage(error, 'Unable to load your dashboard.')],
        });
        return of(error);
      }),
    );
  }

  @Action(RedeemVoucher)
  redeemVoucher(ctx: StateContext<ProviderOrdersStateModel>, { payload }: RedeemVoucher) {
    ctx.patchState({ isRedeeming: true, redeemErrors: [], redeemResult: null });

    return this.http
      .post<{ message?: string; data: { order: ProviderOrder; voucher: ProviderOrderVoucher } }>(
        `${environment.api}/vouchers/redeem`,
        payload,
      )
      .pipe(
        tap((response) => {
          ctx.patchState({
            isRedeeming: false,
            redeemResult: response.data,
            redeemErrors: [],
          });
        }),
        catchError((error: unknown) => {
          ctx.patchState({
            isRedeeming: false,
            redeemResult: null,
            redeemErrors: [extractErrorMessage(error, 'Unable to redeem this voucher.')],
          });
          return of(error);
        }),
      );
  }

  private runMutation(
    ctx: StateContext<ProviderOrdersStateModel>,
    request: import('rxjs').Observable<ProviderOrderDetailResponse>,
    defaultMessage: string,
    fallbackErrorMessage: string,
  ) {
    ctx.patchState({ isMutating: true, message: null, errors: [] });

    return request.pipe(
      tap((response) => {
        const updated = response.data.order;
        const orders = ctx.getState().orders.map((order) => (order.id === updated.id ? { ...order, ...updated } : order));
        ctx.patchState({
          orders,
          isMutating: false,
          message: response.message ?? defaultMessage,
          errors: [],
        });
      }),
      catchError((error: unknown) => {
        ctx.patchState({
          isMutating: false,
          message: null,
          errors: [extractErrorMessage(error, fallbackErrorMessage)],
        });
        return of(error);
      }),
    );
  }
}
