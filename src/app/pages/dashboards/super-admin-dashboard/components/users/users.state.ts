import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs/operators';
import { environment } from '../../../../../../environment/environment';
import { buildListParams, normalizeListResponse } from '../../../../../shared/request.utils';

export type UserReviewAction = 'approved' | 'rejected' | 'suspended';

export interface UserApprovalOption {
  label: string;
  value: UserReviewAction;
  icon: string;
  successMessage: string;
}

export interface User extends Record<string, unknown> {
  id: string;
  fullName?: string | null;
  full_name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  phoneNumber?: string | null;
  role?: string | null;
  status?: string | null;
  approvalStatus?: string | null;
  createdAt?: string | null;
  dateCreated?: string | null;
}

export const userApprovalOptions: readonly UserApprovalOption[] = [
  {
    label: 'Approve',
    value: 'approved',
    icon: 'check_circle',
    successMessage: 'User approved successfully.',
  },
  {
    label: 'Deny',
    value: 'rejected',
    icon: 'cancel',
    successMessage: 'User denied successfully.',
  },
  {
    label: 'Suspend',
    value: 'suspended',
    icon: 'block',
    successMessage: 'User suspended successfully.',
  },
];

interface UsersResponse {
  message?: string;
  code?: number;
  success?: boolean;
  isSuccessful?: boolean;
  data: UsersData | User[];
  errors?: unknown;
}

interface UserDetailResponse {
  message?: string;
  data?: unknown;
}

interface UsersData {
  totalPages?: number;
  pageIndex?: number;
  pageSize?: number;
  totalCount?: number;
  results?: User[];
  items?: User[];
  data?: User[];
}

interface UserMutationResponse {
  message?: string;
  data?: User;
}

export interface UsersQueryParams {
  first?: number;
  rows?: number;
  globalFilter?: string;
  sortField?: string;
  sortOrder?: number;
  status?: string;
}

export interface UsersStateModel {
  totalPages: number;
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  isLoading: boolean;
  isDetailLoading: boolean;
  approvingUserId: string | null;
  selectedUser: User | null;
  users: User[];
}

export class GetUsers {
  static readonly type = '[Users] Get Users';
  constructor(public params?: UsersQueryParams) {}
}

export class GetUserDetails {
  static readonly type = '[Users] Get User Details';
  constructor(public userId: string) {}
}

export class UpdateUserApproval {
  static readonly type = '[Users] Update User Approval';
  constructor(
    public userId: string,
    public action: UserReviewAction,
  ) {}
}

@State<UsersStateModel>({
  name: 'users',
  defaults: {
    users: [],
    totalPages: 0,
    pageIndex: 0,
    pageSize: 10,
    totalCount: 0,
    isLoading: false,
    isDetailLoading: false,
    approvingUserId: null,
    selectedUser: null,
  },
})
@Injectable()
export class UsersState {
  constructor(private readonly http: HttpClient) {}

  @Selector()
  static isLoading(state: UsersStateModel): boolean {
    return state.isLoading;
  }

  @Selector()
  static isDetailLoading(state: UsersStateModel): boolean {
    return state.isDetailLoading;
  }

  @Selector()
  static approvingUserId(state: UsersStateModel): string | null {
    return state.approvingUserId;
  }

  @Selector()
  static selectedUser(state: UsersStateModel): User | null {
    return state.selectedUser;
  }

  @Selector()
  static users(state: UsersStateModel): User[] {
    return state.users;
  }

  @Selector()
  static usersConfigs(state: UsersStateModel) {
    const { totalPages, pageIndex, pageSize, totalCount } = state;
    return { totalPages, pageIndex, pageSize, totalCount };
  }

  @Action(GetUsers)
  getUsers(ctx: StateContext<UsersStateModel>, { params }: GetUsers) {
    ctx.patchState({ isLoading: true });

    return this.http
      .get<UsersResponse>(`${environment.api}/admin/users`, { params: buildListParams(params) })
      .pipe(
        tap({
          next: (response) => {
            const data = normalizeListResponse(response.data);
            ctx.patchState({
              users: data.results,
              totalPages: data.totalPages,
              pageIndex: data.pageIndex,
              pageSize: data.pageSize,
              totalCount: data.totalCount,
              isLoading: false,
            });
          },
          error: () => ctx.patchState({ isLoading: false }),
        }),
      );
  }

  @Action(GetUserDetails)
  getUserDetails(ctx: StateContext<UsersStateModel>, { userId }: GetUserDetails) {
    ctx.patchState({ isDetailLoading: true, selectedUser: null });

    return this.http.get<UserDetailResponse>(`${environment.api}/admin/users/${userId}`).pipe(
      tap({
        next: (response) => {
          ctx.patchState({
            selectedUser: this.normalizeUserDetail(response.data),
            isDetailLoading: false,
          });
        },
        error: () => ctx.patchState({ isDetailLoading: false }),
      }),
    );
  }

  @Action(UpdateUserApproval)
  updateUserApproval(
    ctx: StateContext<UsersStateModel>,
    { userId, action }: UpdateUserApproval,
  ) {
    ctx.patchState({ approvingUserId: userId });

    const reason = this.getReviewReason(action);

    return this.http
      .post<UserMutationResponse>(`${environment.api}/admin/users/${userId}/review`, {
        userId,
        action,
        ...(reason ? { reason } : {}),
      })
      .pipe(
        tap({
          next: (response) => {
            const state = ctx.getState();
            const updatedUser = response.data;
            ctx.patchState({
              approvingUserId: null,
              users: state.users.map((user) =>
                user.id === userId
                  ? {
                      ...user,
                      ...(updatedUser ?? {}),
                      status: updatedUser?.status ?? action,
                      approvalStatus: updatedUser?.approvalStatus ?? action,
                    }
                  : user,
              ),
              selectedUser:
                state.selectedUser?.id === userId
                  ? {
                      ...state.selectedUser,
                      ...(updatedUser ?? {}),
                      status: updatedUser?.status ?? action,
                      approvalStatus: updatedUser?.approvalStatus ?? action,
                    }
                  : state.selectedUser,
            });
          },
          error: () => ctx.patchState({ approvingUserId: null }),
        }),
      );
  }

  private getReviewReason(action: UserReviewAction): string | null {
    if (action === 'approved') {
      return null;
    }

    return action === 'rejected' ? 'Rejected by super admin.' : 'Suspended by super admin.';
  }

  private normalizeUserDetail(data: unknown): User | null {
    if (!this.isRecord(data)) {
      return null;
    }

    const nestedKeys = ['user', 'profile', 'account'];
    for (const key of nestedKeys) {
      const nested = data[key];
      if (this.isUserRecord(nested)) {
        return { ...data, ...nested };
      }
    }

    return this.isUserRecord(data) ? data : null;
  }

  private isUserRecord(value: unknown): value is User {
    return this.isRecord(value) && typeof value['id'] === 'string';
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}

