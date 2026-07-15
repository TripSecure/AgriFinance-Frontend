import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then((m) => m.LoginComponent),
    title: 'Login',
  },
  { path: 'register', redirectTo: 'sign-up', pathMatch: 'full' },
  {
    path: 'register/provider',
    loadComponent: () =>
      import('./register/provider-register/provider-register.component').then(
        (m) => m.ProviderRegisterComponent,
      ),
    title: 'Input Service Provider Registration',
  },
  {
    path: 'register/finance',
    loadComponent: () =>
      import('./register/finance-register/finance-register.component').then(
        (m) => m.FinanceRegisterComponent,
      ),
    title: 'Finance Partner Registration',
  },
  {
    path: 'register/portfolio',
    loadComponent: () =>
      import('./register/portfolio-register/portfolio-register.component').then(
        (m) => m.PortfolioRegisterComponent,
      ),
    title: 'Portfolio Officer Registration',
  },
  {
    path: 'register/extension',
    loadComponent: () =>
      import('./register/extension-register/extension-register.component').then(
        (m) => m.ExtensionRegisterComponent,
      ),
    title: 'Extension Officer Registration',
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./forget-password/forget-password.component').then((m) => m.ForgetPasswordComponent),
    title: 'Forgot Password',
  },
  {
    path: 'sign-up',
    loadComponent: () =>
      import('./register-gateway/register-gateway.component').then(
        (m) => m.RegisterGatewayComponent,
      ),
    title: 'Sign Up',
  },
];
