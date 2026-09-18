import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../../../environment/environment';
import { extractErrorMessage } from '../../../../../shared/request.utils';

export interface AdminDashboardRoleCount {
  role: string;
  count: number;
}

export interface AdminDashboardOverview {
  totals: {
    totalUsers: number;
    totalCreatedUsers: number;
    onboardingUsers: number;
    pendingApprovals: number;
    activeUsers: number;
    rejectedUsers: number;
    suspendedUsers: number;
    recentUsersLast7Days: number;
    kycApprovedUsers: number;
    kycCompletionRate: number;
  };
  roleBreakdown: AdminDashboardRoleCount[];
  loginRule: {
    approvedStatuses: string[];
    onboardingStatuses: string[];
    approvalRequiredBeforeLogin: boolean;
  };
}

interface AdminDashboardOverviewResponse {
  message?: string;
  success?: boolean;
  data: AdminDashboardOverview;
}

export interface AdminDashboardStateModel {
  overview: AdminDashboardOverview | null;
  isLoading: boolean;
  errors: string[];
}

export class GetAdminDashboardOverview {
  static readonly type = '[Admin Dashboard] Get Overview';
}

@State<AdminDashboardStateModel>({
  name: 'adminDashboard',
  defaults: {
    overview: null,
    isLoading: false,
    errors: [],
  },
})
@Injectable()
export class AdminDashboardState {
  private readonly http = inject(HttpClient);

  @Selector()
  static overview(state: AdminDashboardStateModel): AdminDashboardOverview | null {
    return state.overview;
  }

  @Selector()
  static isLoading(state: AdminDashboardStateModel): boolean {
    return state.isLoading;
  }

  @Selector()
  static errors(state: AdminDashboardStateModel): string[] {
    return state.errors;
  }

  @Action(GetAdminDashboardOverview)
  getOverview(ctx: StateContext<AdminDashboardStateModel>) {
    ctx.patchState({ isLoading: true, errors: [] });

    return this.http.get<AdminDashboardOverviewResponse>(`${environment.api}/admin/dashboard/users`).pipe(
      tap((response) => {
        ctx.patchState({ overview: response.data, isLoading: false });
      }),
      catchError((error: unknown) => {
        ctx.patchState({
          isLoading: false,
          errors: [extractErrorMessage(error, 'Unable to load dashboard overview.')],
        });
        return of(error);
      }),
    );
  }
}
