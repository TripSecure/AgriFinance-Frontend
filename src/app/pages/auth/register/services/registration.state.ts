import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { catchError, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { ResetRegistrationState, SubmitRegistration } from './registration.actions';
import { RegistrationService } from './registration.service';
import {
  registrationInitialState,
  RegistrationApiResponse,
  RegistrationStateModel,
} from './registration.state.model';

@State<RegistrationStateModel>({
  name: 'registration',
  defaults: registrationInitialState,
})
@Injectable()
export class RegistrationState {
  constructor(private readonly registrationService: RegistrationService) {}

  @Selector()
  static isLoading(state: RegistrationStateModel): boolean {
    return state.loading;
  }

  @Selector()
  static isSuccessful(state: RegistrationStateModel): boolean {
    return state.success;
  }

  @Selector()
  static message(state: RegistrationStateModel): string | null {
    return state.message;
  }

  @Selector()
  static errors(state: RegistrationStateModel): string[] {
    return state.errors;
  }

  @Selector()
  static response(state: RegistrationStateModel): RegistrationApiResponse | null {
    return state.response;
  }

  @Action(SubmitRegistration)
  submit(ctx: StateContext<RegistrationStateModel>, action: SubmitRegistration) {
    ctx.patchState({
      loading: true,
      success: false,
      message: null,
      errors: [],
      response: null,
    });

    return this.registrationService.completeRegistration(action.payload).pipe(
      tap((response) => {
        ctx.patchState({
          loading: false,
          success: response.success,
          message: response.message,
          errors: response.success ? [] : [response.message],
          response,
        });
      }),
      catchError((error: unknown) => {
        const message = this.getErrorMessage(error);
        ctx.patchState({
          loading: false,
          success: false,
          message,
          errors: [message],
          response: null,
        });

        return of(error);
      }),
    );
  }

  @Action(ResetRegistrationState)
  reset(ctx: StateContext<RegistrationStateModel>): void {
    ctx.setState(registrationInitialState);
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (this.hasMessage(error.error)) {
        return error.error.message;
      }

      if (error.message) {
        return error.message;
      }
    }

    return 'Registration failed. Please review the form and try again.';
  }

  private hasMessage(value: unknown): value is { message: string } {
    return (
      typeof value === 'object' &&
      value !== null &&
      'message' in value &&
      typeof value.message === 'string'
    );
  }
}
