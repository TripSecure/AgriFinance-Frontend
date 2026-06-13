import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then((m) => m.LoginComponent),
    title: 'Login',
  },
  {
    path: 'register',
    loadComponent: () => import('./register/register.component').then((m) => m.RegisterComponent),
    title: 'Register',
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
      import('./register-gateway/register-gateway.component').then((m) => m.RegisterGatewayComponent),
    title: 'Sign Up',
  },
];