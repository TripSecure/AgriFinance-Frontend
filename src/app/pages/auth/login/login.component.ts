import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';

interface LoginFormModel {
  identity: string;
  password: string;
  rememberDevice: boolean;
}

@Component({
  selector: 'app-login',
  imports: [NgOptimizedImage, RouterLink, FormField],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly loginModel = signal<LoginFormModel>({
    identity: '',
    password: '',
    rememberDevice: false,
  });

  protected readonly showPassword = signal(false);
  protected readonly loginForm = form(this.loginModel, (fields) => {
    required(fields.identity, { message: 'Enter your email or username.' });
    required(fields.password, { message: 'Enter your password.' });
  });

  protected togglePasswordVisibility(): void {
    this.showPassword.update((isVisible) => !isVisible);
  }

  protected async signIn(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    await submit(this.loginForm, async (submittedForm) => {
      console.log('Login:', submittedForm().value());
    });
  }
}
