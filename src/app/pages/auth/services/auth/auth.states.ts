// state/auth.state.ts
import { inject, Injectable } from '@angular/core';
import { State, Action, StateContext, Selector, NgxsOnInit } from '@ngxs/store';
import { of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import {
  authInitialState,
  AuthProfile,
  AuthStateModel,
  AuthUser,
  CurrentSessionResponse,
  LoginResponse,
  OtpResponse,
} from './auth.state.model';
import { AuthService } from './auth.service';
import {
  LoadLoggedInUser,
  Logout,
  PersistState,
  RequestLoginOtp,
  LoginWithOtp,
  ResetLoginOtpRequest,
  SetRememberDevice,
} from './auth.actions';
import { extractErrorMessage, extractResponseErrors } from '../../../../shared/request.utils';

const AUTHENTICATION_FAILED_MESSAGE = 'Authentication failed. Please try again.';

const AUTH_STORAGE_KEY = 'authState';

@State<AuthStateModel>({
  name: 'auth',
  defaults: authInitialState,
})
@Injectable()
export class AuthState implements NgxsOnInit {
  private readonly authService = inject(AuthService);

  ngxsOnInit(ctx: StateContext<AuthStateModel>) {
    const state = localStorage.getItem(AUTH_STORAGE_KEY) ?? sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (state) {
      ctx.setState(JSON.parse(state));
    }
  }

  @Selector()
  static isAuthenticated(state: AuthStateModel): boolean {
    return state.isAuthenticated;
  }

  @Selector()
  static getToken(state: AuthStateModel): string | null {
    return state.token;
  }

  @Selector()
  static getUserId(state: AuthStateModel): string | null {
    return state.userId;
  }

  @Selector()
  static getCurrentUser(state: AuthStateModel): AuthUser | null {
    return state.currentUser;
  }

  @Selector()
  static getProfile(state: AuthStateModel): AuthProfile | null {
    return state.profile;
  }

  @Selector()
  static canAccessDashboard(state: AuthStateModel): boolean {
    return state.canAccessDashboard;
  }

  @Selector()
  static getPrefix(state: AuthStateModel): string | null {
    return state.prefix || '';
  }

  @Selector()
  static getRequestId(state: AuthStateModel): string | null {
    return state.requestId || '';
  }

  @Selector()
  static getErrors(state: AuthStateModel): string[] {
    return state.errors;
  }

  @Selector()
  static lastLogin(state: AuthStateModel): string | null {
    return state.lastLogin;
  }

  @Selector()
  static isLoading(state: AuthStateModel): boolean {
    return state.loading;
  }

  @Selector()
  static message(state: AuthStateModel): string | null {
    return state.message;
  }

  @Selector()
  static isLoginOtpRequested(state: AuthStateModel): boolean {
    return state.loginOtpRequested;
  }

  @Action(RequestLoginOtp)
  requestLoginOtp(ctx: StateContext<AuthStateModel>, action: RequestLoginOtp) {
    ctx.patchState({
      loading: true,
      errors: [],
      message: null,
      loginOtpRequested: false,
      isAuthenticated: false,
      currentUser: null,
      profile: null,
      canAccessDashboard: false,
    });

    return this.authService.requestLoginOtp(action.payload).pipe(
      tap((response: OtpResponse) => {
        if (this.isSuccessfulResponse(response)) {
          ctx.patchState({
            requestId: response.data?.requestId ?? null,
            prefix: response.data?.prefix ?? null,
            loading: false,
            loginOtpRequested: true,
            message: response.message,
            errors: [],
          });
        } else {
          ctx.patchState({
            loading: false,
            loginOtpRequested: false,
            errors: extractResponseErrors(response, AUTHENTICATION_FAILED_MESSAGE),
            message: response.message,
          });
        }
      }),
      catchError((error: unknown) => {
        const message = extractErrorMessage(error, 'Unable to send the verification code.');
        ctx.patchState({
          loading: false,
          loginOtpRequested: false,
          errors: [message],
          message,
          isAuthenticated: false,
        });
        return of(error);
      }),
    );
  }

  @Action(LoginWithOtp)
  loginWithOtp(ctx: StateContext<AuthStateModel>, action: LoginWithOtp) {
    ctx.patchState({ loading: true, errors: [], message: null });

    return this.authService.login(action.payload).pipe(
      switchMap((response: LoginResponse) => {
        if (!this.isSuccessfulResponse(response)) {
          ctx.patchState({
            isAuthenticated: false,
            loading: false,
            errors: extractResponseErrors(response, AUTHENTICATION_FAILED_MESSAGE),
            message: response.message,
          });
          return of(response);
        }

        const accessToken = this.getAccessToken(response);
        const decodedToken = accessToken ? this.decodeJWT(accessToken) : {};

        ctx.patchState({
          isAuthenticated: true,
          token: accessToken,
          expiry: response.data.expiry ?? null,
          loginOtpRequested: false,
          requestId: null,
          prefix: null,
          message: response.message,
          errors: [],
          userId:
            this.getProfileUserId(response.data.profile) ??
            this.getTokenClaim(decodedToken, 'UserId'),
          profile: response.data.profile ?? null,
          lastLogin: response.data.lastLogin ?? this.getTokenClaim(decodedToken, 'LastLoggedIn'),
        });

        return ctx.dispatch(new LoadLoggedInUser(accessToken ?? undefined));
      }),
      catchError((error: unknown) => {
        const message = extractErrorMessage(error, 'Login failed. Check the code and try again.');
        ctx.patchState({
          loading: false,
          errors: [message],
          message,
          isAuthenticated: false,
        });
        return of(error);
      }),
    );
  }

  @Action(LoadLoggedInUser)
  loadLoggedInUser(ctx: StateContext<AuthStateModel>, action: LoadLoggedInUser) {
    ctx.patchState({ loading: true, errors: [], message: null });

    return this.authService.loadLoggedInUser(action.accessToken).pipe(
      tap((response: CurrentSessionResponse) => {
        if (this.isSuccessfulResponse(response)) {
          ctx.patchState({
            loading: false,
            isAuthenticated: true,
            currentUser: response.data.user,
            profile: response.data.profile,
            canAccessDashboard: response.data.canAccessDashboard,
            userId: response.data.user.id || response.data.profile.id,
            message: response.message,
            errors: [],
          });
        } else {
          ctx.patchState({
            loading: false,
            errors: extractResponseErrors(response, AUTHENTICATION_FAILED_MESSAGE),
            message: response.message,
          });
        }
      }),
      catchError((error: unknown) => {
        const message = extractErrorMessage(error, 'Unable to load the logged-in user.');
        ctx.patchState({
          loading: false,
          errors: [message],
          message,
        });
        return of(error);
      }),
    );
  }

  @Action(ResetLoginOtpRequest)
  resetLoginOtpRequest(ctx: StateContext<AuthStateModel>): void {
    ctx.patchState({
      loginOtpRequested: false,
      requestId: null,
      prefix: null,
      errors: [],
      message: null,
    });
  }

  @Action(Logout)
  signOut(ctx: StateContext<AuthStateModel>) {
    ctx.setState(authInitialState);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  }

  @Action(SetRememberDevice)
  setRememberDevice(ctx: StateContext<AuthStateModel>, action: SetRememberDevice) {
    ctx.patchState({ rememberDevice: action.rememberDevice });
  }

  @Action(PersistState)
  saveState(ctx: StateContext<AuthStateModel>) {
    const state = ctx.getState();
    const serialized = JSON.stringify(state);

    if (state.rememberDevice) {
      localStorage.setItem(AUTH_STORAGE_KEY, serialized);
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    } else {
      sessionStorage.setItem(AUTH_STORAGE_KEY, serialized);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }

  public decodeJWT(token: string): Record<string, unknown> {
    const base64Url = token.split('.')[1];

    if (!base64Url) {
      return {};
    }

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );

    return JSON.parse(jsonPayload) as Record<string, unknown>;
  }

  private isSuccessfulResponse(response: { success?: boolean; isSuccessful?: boolean }): boolean {
    return response.success === true || response.isSuccessful === true;
  }

  private getAccessToken(response: LoginResponse): string | null {
    return response.data.accessToken ?? response.data.token ?? null;
  }

  private getProfileUserId(profile: AuthProfile | undefined): string | null {
    return profile?.id ?? null;
  }

  private getTokenClaim(token: Record<string, unknown>, claimName: string): string | null {
    const value = token[claimName];
    return typeof value === 'string' ? value : null;
  }

}
