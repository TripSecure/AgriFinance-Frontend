import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface LoginFormValue {
  identity: string;
  password: string;
  rememberDevice: boolean;
}

@Component({
  selector: 'app-login',
  imports: [NgOptimizedImage, RouterLink, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly loginErrorMessages: Record<'identity' | 'password', string> = {
    identity: 'Enter your email or username.',
    password: 'Enter your password.',
  };

  protected readonly showPassword = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly loginForm = this.formBuilder.group({
    identity: ['', Validators.required],
    password: ['', Validators.required],
    rememberDevice: false,
  });
  protected readonly loginControls = this.loginForm.controls;

  protected togglePasswordVisibility(): void {
    this.showPassword.update((isVisible) => !isVisible);
  }

  protected getLoginFieldError(controlName: 'identity' | 'password'): string | null {
    const control = this.loginControls[controlName];

    if (!control.touched || control.valid) {
      return null;
    }

    if (control.hasError('required')) {
      return this.loginErrorMessages[controlName];
    }

    return null;
  }

  protected async signIn(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    try {
      const submittedForm: LoginFormValue = this.loginForm.getRawValue();
      console.log('Login:', submittedForm);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
