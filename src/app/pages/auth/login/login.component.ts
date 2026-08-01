import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { LoginWithOtp, PersistState } from '../services/auth/auth.actions';
import { AuthState } from '../services/auth/auth.states';
import { ToastrService } from '../../../shared/toastr/toastr.service';

interface LoginFormValue {
  identity: string;
  password: string;
  otpCode: string;
  rememberDevice: boolean;
}

type LoginControlName = 'identity' | 'password' | 'otpCode';

@Component({
  selector: 'app-login',
  imports: [NgOptimizedImage, RouterLink, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly toastr = inject(ToastrService);
  private readonly loginErrorMessages: Record<LoginControlName, string> = {
    identity: 'Enter your phone number or email.',
    password: 'Enter your password.',
    otpCode: 'Enter your 6-digit verification code.',
  };

  protected readonly showPassword = signal(false);
  protected readonly authLoading = this.store.selectSignal(AuthState.isLoading);
  protected readonly authErrors = this.store.selectSignal(AuthState.getErrors);
  protected readonly authMessage = this.store.selectSignal(AuthState.message);
  protected readonly loginTitle = computed(() => 'Welcome back');
  protected readonly loginHelpText = computed(
    () => 'Enter your phone number or email and password.',
  );
  protected readonly submitButtonText = computed(() => 'Sign In');
  protected readonly loginForm = this.formBuilder.group({
    identity: ['', Validators.required],
    password: ['', Validators.required],
    otpCode: ['', [Validators.required, Validators.pattern('[0-9]{6}')]],
    rememberDevice: false,
  });
  protected readonly loginControls = this.loginForm.controls;

  protected togglePasswordVisibility(): void {
    this.showPassword.update((isVisible) => !isVisible);
  }

  protected getLoginFieldError(controlName: LoginControlName): string | null {
    const control = this.loginControls[controlName];

    if (!control.touched || control.valid) {
      return null;
    }

    if (control.hasError('required') || control.hasError('pattern')) {
      return this.loginErrorMessages[controlName];
    }

    return null;
  }

  protected signIn(): void {
    if (!this.markControlsAsTouched(['identity', 'password'])) {
      return;
    }

    const { identity, password } = this.buildLoginValue();
    this.store.dispatch(new LoginWithOtp({ identity, password })).subscribe(() => {
      if (this.store.selectSnapshot(AuthState.isAuthenticated)) {
        this.store.dispatch(new PersistState()).subscribe();
        this.toastr.triggerToastr('success', this.getAuthFeedbackMessage('Login successful.'));
        void this.router.navigateByUrl(this.getPostLoginUrl());
        return;
      }

      this.showAuthError('Login failed. Check your details and try again.');
    });
  }

  private showAuthError(fallbackMessage: string): void {
    this.toastr.triggerToastr('error', this.getAuthFeedbackMessage(fallbackMessage));
  }

  private getAuthFeedbackMessage(fallbackMessage: string): string {
    const [firstError] = this.store.selectSnapshot(AuthState.getErrors);
    return firstError || this.store.selectSnapshot(AuthState.message) || fallbackMessage;
  }

  private getPostLoginUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

    if (
      returnUrl?.startsWith('/') &&
      !returnUrl.startsWith('//') &&
      !returnUrl.startsWith('/auth')
    ) {
      return returnUrl;
    }

    return '/dashboard';
  }

  private markControlsAsTouched(controlNames: LoginControlName[]): boolean {
    controlNames.forEach((controlName) => this.loginControls[controlName].markAsTouched());
    return controlNames.every((controlName) => this.loginControls[controlName].valid);
  }

  private buildLoginValue(): LoginFormValue {
    const formValue = this.loginForm.getRawValue();

    return {
      identity: formValue.identity.trim(),
      password: formValue.password,
      otpCode: formValue.otpCode.trim(),
      rememberDevice: formValue.rememberDevice,
    };
  }
}
