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
import { extractErrorMessage } from '../../../../shared/request.utils';

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
        const message = extractErrorMessage(
          error,
          'Registration failed. Please review the form and try again.',
        );
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
}
