import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { RequestPasswordResetOtp, ResetPassword } from '../services/auth/auth.actions';
import { AuthState } from '../services/auth/auth.states';
import { ToastrService } from '../../../shared/toastr/toastr.service';

type ResetControlName = 'identity' | 'otpCode' | 'newPassword' | 'confirmPassword';

function passwordMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('newPassword')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    if (password && confirmPassword && password !== confirmPassword) {
      return { passwordMismatch: true };
    }
    return null;
  };
}

@Component({
  selector: 'app-reset-password',
  imports: [NgOptimizedImage, RouterLink, ReactiveFormsModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordComponent implements OnInit {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly toastr = inject(ToastrService);

  protected readonly showNewPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);
  protected readonly authLoading = this.store.selectSignal(AuthState.isLoading);
  protected readonly authErrors = this.store.selectSignal(AuthState.getErrors);
  protected readonly authMessage = this.store.selectSignal(AuthState.message);

  protected readonly pageTitle = computed(() => 'Reset password');
  protected readonly pageHelpText = computed(
    () => 'Enter the 6-digit verification code and your new password.',
  );
  protected readonly submitButtonText = computed(() => 'Reset Password');

  protected readonly resetForm = this.formBuilder.group(
    {
      identity: ['', [Validators.required]],
      otpCode: ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator() },
  );

  protected readonly resetControls = this.resetForm.controls;

  ngOnInit(): void {
    const identityParam = this.route.snapshot.queryParamMap.get('identity');
    if (identityParam) {
      this.resetForm.patchValue({ identity: identityParam });
    }
  }

  protected toggleNewPasswordVisibility(): void {
    this.showNewPassword.update((visible) => !visible);
  }

  protected toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((visible) => !visible);
  }

  protected getFieldError(controlName: ResetControlName): string | null {
    const control = this.resetControls[controlName];
    if (!control.touched || control.valid) {
      return null;
    }
    if (control.hasError('required')) {
      switch (controlName) {
        case 'identity':
          return 'Enter your phone number or email.';
        case 'otpCode':
          return 'Enter the 6-digit verification code.';
        case 'newPassword':
          return 'Enter a new password.';
        case 'confirmPassword':
          return 'Confirm your new password.';
      }
    }
    if (control.hasError('pattern') && controlName === 'otpCode') {
      return 'Verification code must be 6 digits.';
    }
    if (control.hasError('minlength') && controlName === 'newPassword') {
      return 'Password must be at least 6 characters.';
    }
    return null;
  }

  protected getPasswordMismatchError(): string | null {
    if (
      this.resetControls.confirmPassword.touched &&
      this.resetForm.hasError('passwordMismatch')
    ) {
      return 'Passwords do not match.';
    }
    return null;
  }

  protected resendOtp(): void {
    const identity = this.resetControls.identity.value.trim();
    if (!identity) {
      this.resetControls.identity.markAsTouched();
      this.toastr.triggerToastr('error', 'Please enter your phone number or email first.');
      return;
    }

    this.store.dispatch(new RequestPasswordResetOtp({ identity })).subscribe(() => {
      const errors = this.store.selectSnapshot(AuthState.getErrors);
      if (errors && errors.length > 0) {
        this.toastr.triggerToastr('error', errors[0] || 'Unable to resend reset code.');
        return;
      }
      this.toastr.triggerToastr(
        'success',
        this.store.selectSnapshot(AuthState.message) || 'Verification code resent successfully.',
      );
    });
  }

  protected submitResetPassword(): void {
    if (this.resetForm.invalid) {
      Object.values(this.resetControls).forEach((ctrl) => ctrl.markAsTouched());
      return;
    }

    const { identity, otpCode, newPassword, confirmPassword } = this.resetForm.getRawValue();

    this.store
      .dispatch(
        new ResetPassword({
          identity: identity.trim(),
          otpCode: otpCode.trim(),
          newPassword,
          confirmPassword,
        }),
      )
      .subscribe(() => {
        const errors = this.store.selectSnapshot(AuthState.getErrors);
        if (errors && errors.length > 0) {
          this.toastr.triggerToastr('error', errors[0] || 'Password reset failed.');
          return;
        }

        const msg =
          this.store.selectSnapshot(AuthState.message) ||
          'Password reset successfully. Please log in.';
        this.toastr.triggerToastr('success', msg);
        void this.router.navigate(['/auth/login']);
      });
  }
}
