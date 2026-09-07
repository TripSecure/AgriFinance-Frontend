import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then((m) => m.LoginComponent),
    title: 'Login',
  },
  {
    path: 'register',
    children: [
      {
        path: '',
        redirectTo: '/sign-up',
        pathMatch: 'full',
      },
      {
        path: 'provider',
        loadComponent: () =>
          import('./register/provider-register/provider-register.component').then(
            (m) => m.ProviderRegisterComponent,
          ),
        title: 'Input Service Provider Registration',
      },
      {
        path: 'finance',
        loadComponent: () =>
          import('./register/finance-register/finance-register.component').then(
            (m) => m.FinanceRegisterComponent,
          ),
        title: 'Finance Partner Registration',
      },
      {
        path: 'portfolio',
        loadComponent: () =>
          import('./register/portfolio-register/portfolio-register.component').then(
            (m) => m.PortfolioRegisterComponent,
          ),
        title: 'Portfolio Officer Registration',
      },
      {
        path: 'extension',
        loadComponent: () =>
          import('./register/extension-register/extension-register.component').then(
            (m) => m.ExtensionRegisterComponent,
          ),
        title: 'Extension Officer Registration',
      },
    ],
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./forget-password/forget-password.component').then((m) => m.ForgetPasswordComponent),
    title: 'Forgot Password',
  },
  {
    path: 'forget-password',
    redirectTo: 'forgot-password',
    pathMatch: 'full',
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./reset-password/reset-password.component').then((m) => m.ResetPasswordComponent),
    title: 'Reset Password',
  },
  {
    path: 'sign-up',
    loadComponent: () =>
      import('./register-gateway/register-gateway.component').then(
        (m) => m.RegisterGatewayComponent,
      ),
    title: 'Sign Up',
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
