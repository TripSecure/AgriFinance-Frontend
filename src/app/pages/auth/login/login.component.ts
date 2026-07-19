import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import {
  LoginWithOtp,
  PersistState,
  RequestLoginOtp,
  ResetLoginOtpRequest,
} from '../services/auth/auth.actions';
import { AuthState } from '../services/auth/auth.states';

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
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly loginErrorMessages: Record<LoginControlName, string> = {
    identity: 'Enter your phone number or email.',
    password: 'Enter your password.',
    otpCode: 'Enter your 6-digit verification code.',
  };

  protected readonly showPassword = signal(false);
  protected readonly isOtpStep = this.store.selectSignal(AuthState.isLoginOtpRequested);
  protected readonly authLoading = this.store.selectSignal(AuthState.isLoading);
  protected readonly authErrors = this.store.selectSignal(AuthState.getErrors);
  protected readonly authMessage = this.store.selectSignal(AuthState.message);
  protected readonly loginTitle = computed(() =>
    this.isOtpStep() ? 'Enter verification code' : 'Welcome back',
  );
  protected readonly loginHelpText = computed(() =>
    this.isOtpStep()
      ? 'We sent a 6-digit code to your account. Enter it below to complete sign in.'
      : 'Enter your phone number or email and password. We will send a verification code to finish sign in.',
  );
  protected readonly submitButtonText = computed(() =>
    this.isOtpStep() ? 'Sign In' : 'Send Verification Code',
  );
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
    if (this.isOtpStep()) {
      this.submitLoginWithOtp();
      return;
    }

    this.requestOtp();
  }

  protected editLoginDetails(): void {
    this.store.dispatch(new ResetLoginOtpRequest()).subscribe();
    this.loginControls.otpCode.reset('');
    this.loginControls.otpCode.markAsUntouched();
  }

  private requestOtp(): void {
    if (!this.markControlsAsTouched(['identity', 'password'])) {
      return;
    }

    const { identity, password } = this.buildLoginValue();
    this.store.dispatch(new RequestLoginOtp({ identity, password })).subscribe(() => {
      if (this.store.selectSnapshot(AuthState.isLoginOtpRequested)) {
        this.loginControls.otpCode.reset('');
        this.loginControls.otpCode.markAsUntouched();
      }
    });
  }

  private submitLoginWithOtp(): void {
    if (!this.markControlsAsTouched(['otpCode'])) {
      return;
    }

    const { identity, password, otpCode } = this.buildLoginValue();
    this.store.dispatch(new LoginWithOtp({ identity, password, otpCode })).subscribe(() => {
      if (this.store.selectSnapshot(AuthState.isAuthenticated)) {
        this.store.dispatch(new PersistState()).subscribe();
        void this.router.navigateByUrl('/home');
      }
    });
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
