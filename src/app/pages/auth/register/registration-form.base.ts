import { inject, signal } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { getInvalidControlLabels } from './services/registration-form-validation';
import { SubmitRegistration } from './services/registration.actions';
import { RegistrationState } from './services/registration.state';
import { RegistrationPayload } from './services/registration.state.model';

export abstract class RegistrationFormBase<TPayload extends RegistrationPayload> {
  protected readonly store = inject(Store);
  protected readonly router = inject(Router);

  protected readonly registrationLoading = this.store.selectSignal(RegistrationState.isLoading);
  protected readonly registrationMessage = this.store.selectSignal(RegistrationState.message);
  protected readonly registrationErrors = this.store.selectSignal(RegistrationState.errors);
  protected readonly localSubmitError = signal<string | null>(null);

  protected abstract readonly registrationForm: FormGroup;

  protected abstract buildPayload(): TPayload;

  protected onSubmit(): void {
    this.registrationForm.markAllAsTouched();

    if (this.registrationForm.invalid) {
      this.localSubmitError.set(this.getInvalidFormMessage());
      return;
    }

    this.localSubmitError.set(null);
    this.store.dispatch(new SubmitRegistration(this.buildPayload())).subscribe({
      next: () => {
        if (this.store.selectSnapshot(RegistrationState.isSuccessful)) {
          void this.router.navigate(['/auth/login']);
        }
      },
    });
  }

  protected saveDraft(): void {}

  private getInvalidFormMessage(): string {
    const invalidFields = getInvalidControlLabels(this.registrationForm);
    const visibleFields = invalidFields.slice(0, 6);
    const remainingCount = invalidFields.length - visibleFields.length;
    const remainingMessage = remainingCount > 0 ? ` and ${remainingCount} more` : '';

    return `Please complete: ${visibleFields.join(', ')}${remainingMessage}.`;
  }
}
