import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { RequestPasswordResetOtp } from '../services/auth/auth.actions';
import { AuthState } from '../services/auth/auth.states';
import { ToastrService } from '../../../shared/toastr/toastr.service';

@Component({
  selector: 'app-forget-password',
  imports: [NgOptimizedImage, RouterLink, ReactiveFormsModule],
  templateUrl: './forget-password.component.html',
  styleUrl: './forget-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgetPasswordComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly toastr = inject(ToastrService);

  protected readonly authLoading = this.store.selectSignal(AuthState.isLoading);
  protected readonly authErrors = this.store.selectSignal(AuthState.getErrors);
  protected readonly authMessage = this.store.selectSignal(AuthState.message);

  protected readonly pageTitle = computed(() => 'Forgot password?');
  protected readonly pageHelpText = computed(
    () => 'Enter your registered phone number or email to receive a password reset code.',
  );
  protected readonly submitButtonText = computed(() => 'Send Reset Code');

  protected readonly forgotForm = this.formBuilder.group({
    identity: ['', [Validators.required]],
  });

  protected readonly forgotControls = this.forgotForm.controls;

  protected getIdentityError(): string | null {
    const control = this.forgotControls.identity;
    if (!control.touched || control.valid) {
      return null;
    }
    if (control.hasError('required')) {
      return 'Enter your phone number or email.';
    }
    return null;
  }

  protected submitForgotPassword(): void {
    if (this.forgotForm.invalid) {
      this.forgotControls.identity.markAsTouched();
      return;
    }

    const identity = this.forgotControls.identity.value.trim();
    if (!identity) {
      this.forgotControls.identity.markAsTouched();
      return;
    }

    this.store.dispatch(new RequestPasswordResetOtp({ identity })).subscribe(() => {
      const errors = this.store.selectSnapshot(AuthState.getErrors);
      if (errors && errors.length > 0) {
        this.toastr.triggerToastr('error', errors[0] || 'Unable to send password reset code.');
        return;
      }

      const msg = this.store.selectSnapshot(AuthState.message) || 'Reset code sent successfully.';
      this.toastr.triggerToastr('success', msg);
      void this.router.navigate(['/auth/reset-password'], {
        queryParams: { identity },
      });
    });
  }
}
