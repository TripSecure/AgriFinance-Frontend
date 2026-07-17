// state/auth.state.ts
import { State, Action, StateContext, Selector, NgxsOnInit } from '@ngxs/store';
import { Injectable } from '@angular/core';
import { tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import {
  authInitialState,
  AuthStateModel,
  LoginResponse,
  OtpResponse,
} from './auth.state.model';
import { AuthService } from './auth.service';
import {
  LoginWithEmail,
  LoginWithPhone,
  LoginWithUsername,
  Logout,
  VerificationPhone,
  VerificationEmail,
  PersistState,
} from './auth.actions';

@State<AuthStateModel>({
  name: 'auth',
  defaults: authInitialState,
})
@Injectable()
export class AuthState implements NgxsOnInit {
  constructor(private readonly authService: AuthService) {}

  ngxsOnInit(ctx: StateContext<AuthStateModel>) {
    const state = localStorage.getItem('authState');
    if (state) {
      ctx.setState(JSON.parse(state));
      localStorage.removeItem('authState');
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
  static isLoading(state: AuthStateModel) {
    return state.loading;
  }

  @Action(LoginWithUsername)
  signIn(ctx: StateContext<AuthStateModel>, action: LoginWithUsername) {
    ctx.patchState({ loading: true, errors: [], message: null });

    return this.authService.signinWithUsername(action.payload).pipe(
      tap((response: LoginResponse) => {
        if (response.isSuccessful) {
          ctx.patchState({
            isAuthenticated: true,
            token: response.data.token,
            expiry: response.data.expiry,
            loading: false,
            message: response.message,
            errors: [],
            userId: this.decodeJWT(response.data.token).UserId,
            lastLogin: response.data.lastLogin,
          });
          
        } else {
          ctx.patchState({
            isAuthenticated: false,
            loading: false,
            errors: response.errors,
            message: response.message,
          });
        }
      }),
      catchError((error) => {
        ctx.patchState({
          loading: false,
          errors: [error.message],
          isAuthenticated: false,
        });
        return of(error);
      })
    );
  }

  @Action(LoginWithPhone)
  signInPhone(ctx: StateContext<AuthStateModel>, action: LoginWithPhone) {
    ctx.patchState({ loading: true, errors: [], message: null });

    return this.authService.signinWithPhone(action.payload).pipe(
      tap((response: OtpResponse) => {
        if (response.isSuccessful) {
          ctx.patchState({
            requestId: response.data.requestId,
            prefix: response.data.prefix,
            loading: false,
            message: response.message,

            errors: [],
          });
        } else {
          ctx.patchState({
            loading: false,
            errors: response.errors,
            message: response.message,
          });
        }
      })
    );
  }

  @Action(LoginWithEmail)
  signInEmail(ctx: StateContext<AuthStateModel>, action: LoginWithEmail) {
    ctx.patchState({ loading: true, errors: [], message: null });

    return this.authService.signinWithEmail(action.payload).pipe(
      tap((response: OtpResponse) => {
        if (response.isSuccessful) {
          ctx.patchState({
            requestId: response.data.requestId,
            prefix: response.data.prefix,
            loading: false,
            message: response.message,
            errors: [],
          });
        } else {
          ctx.patchState({
            loading: false,
            errors: response.errors,
            message: response.message,
          });
        }
      })
    );
  }

  @Action(VerificationPhone)
  verifyPhone(ctx: StateContext<AuthStateModel>, action: VerificationPhone) {
    ctx.patchState({ loading: true, errors: [], message: null });

    return this.authService.verifyPhone(action.payload).pipe(
      tap((response: LoginResponse) => {
        if (response.isSuccessful) {
          ctx.patchState({
            isAuthenticated: true,
            token: response.data.token,
            expiry: response.data.expiry,
            loading: false,
            message: response.message,
            errors: [],
            userId: this.decodeJWT(response.data.token).UserId,
            lastLogin: this.decodeJWT(response.data.token).LastLoggedIn,
          });
        } else {
          ctx.patchState({
            isAuthenticated: false,
            loading: false,
            errors: response.errors,
            message: response.message,
          });
        }
      })
    );
  }

  @Action(VerificationEmail)
  verifyEmail(ctx: StateContext<AuthStateModel>, action: VerificationEmail) {
    ctx.patchState({ loading: true, errors: [], message: null });

    return this.authService.verifyEmail(action.payload).pipe(
      tap((response: LoginResponse) => {
        if (response.isSuccessful) {
          ctx.patchState({
            isAuthenticated: true,
            token: response.data.token,
            expiry: response.data.expiry,
            loading: false,
            message: response.message,
            errors: [],
            userId: this.decodeJWT(response.data.token).UserId,
            lastLogin: this.decodeJWT(response.data.token).LastLoggedIn,
          });
        } else {
          ctx.patchState({
            isAuthenticated: false,
            loading: false,
            errors: response.errors,
            message: response.message,
          });
        }
      })
    );
  }

  @Action(Logout)
  signOut(ctx: StateContext<AuthStateModel>) {
    ctx.setState(authInitialState);
    localStorage.clear();
  }

  @Action(PersistState)
  saveState(ctx: StateContext<AuthStateModel>) {
    localStorage.setItem('authState', JSON.stringify(ctx.getState()));
  }

  public decodeJWT(token: string) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );

    return JSON.parse(jsonPayload);
  }
}
