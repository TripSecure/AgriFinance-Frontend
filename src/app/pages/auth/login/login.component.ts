import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import {
  LoginWithOtp,
  PersistState,
  RequestLoginOtp,
  ResetLoginOtpRequest,
  SetRememberDevice,
} from '../services/auth/auth.actions';
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
    otpCode: 'Enter your verification code.',
  };

  // Step 1 checks the password and asks the backend to issue a login code. On staging and local
  // the backend runs in bypass mode and returns the code, so sign-in completes straight away;
  // on production it texts the code and step 2 asks the user to type it.
  protected readonly step = signal<'credentials' | 'code'>('credentials');
  protected readonly loginOtp = this.store.selectSignal(AuthState.loginOtp);
  private readonly otpInput = viewChild<ElementRef<HTMLInputElement>>('otpInput');

  protected readonly maskedPhone = computed(() => {
    const digits = (this.loginOtp()?.phone ?? '').replace(/\D/g, '');
    return digits.length >= 4 ? `the number ending ${digits.slice(-4)}` : 'your phone';
  });

  protected readonly showPassword = signal(false);
  protected readonly authLoading = this.store.selectSignal(AuthState.isLoading);
  protected readonly authErrors = this.store.selectSignal(AuthState.getErrors);
  protected readonly authMessage = this.store.selectSignal(AuthState.message);
  protected readonly loginTitle = computed(() => (this.step() === 'code' ? 'Enter your code' : 'Welcome back'));
  protected readonly loginHelpText = computed(() =>
    this.step() === 'code'
      ? `We sent a 6-digit code to ${this.maskedPhone()}. It expires in 10 minutes.`
      : 'Enter your phone number or email and password.',
  );
  protected readonly submitButtonText = computed(() => (this.step() === 'code' ? 'Sign In' : 'Continue'));
  protected readonly loginForm = this.formBuilder.group({
    identity: ['', Validators.required],
    password: ['', Validators.required],
    otpCode: ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]],
    rememberDevice: false,
  });
  protected readonly loginControls = this.loginForm.controls;

  constructor() {
    this.store.dispatch(new ResetLoginOtpRequest());

    if (this.route.snapshot.queryParamMap.get('reason') === 'session-expired') {
      this.toastr.triggerToastr('info', 'Your session expired. Please sign in again.');
    }
  }

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
    if (this.step() === 'code') {
      if (!this.markControlsAsTouched(['otpCode'])) {
        return;
      }
      this.completeLogin(this.buildLoginValue().otpCode);
      return;
    }

    if (!this.markControlsAsTouched(['identity', 'password'])) {
      return;
    }

    const { identity, password, rememberDevice } = this.buildLoginValue();
    this.store
      .dispatch([new SetRememberDevice(rememberDevice), new RequestLoginOtp({ identity, password })])
      .subscribe(() => {
        const challenge = this.store.selectSnapshot(AuthState.loginOtp);
        if (!challenge) {
          this.showAuthError('Login failed. Check your details and try again.');
          return;
        }

        // Only staging and local run in bypass mode; anything else must use the code the user received.
        if (challenge.mode === 'bypass' && challenge.devCode) {
          this.completeLogin(challenge.devCode);
          return;
        }

        this.loginControls.otpCode.reset('');
        this.step.set('code');
        setTimeout(() => this.otpInput()?.nativeElement.focus());
      });
  }

  protected resendCode(): void {
    const { identity, password } = this.buildLoginValue();
    this.store.dispatch(new RequestLoginOtp({ identity, password })).subscribe(() => {
      if (this.store.selectSnapshot(AuthState.loginOtp)) {
        this.toastr.triggerToastr('success', `A new code was sent to ${this.maskedPhone()}.`);
        return;
      }
      this.showAuthError('Unable to send a new code. Try again in a few minutes.');
    });
  }

  protected useDifferentAccount(): void {
    this.store.dispatch(new ResetLoginOtpRequest());
    this.loginControls.otpCode.reset('');
    this.step.set('credentials');
  }

  private completeLogin(otpCode: string): void {
    const { identity, password } = this.buildLoginValue();
    this.store
      .dispatch(new LoginWithOtp({ identity, password, otpCode }))
      .subscribe(() => {
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
