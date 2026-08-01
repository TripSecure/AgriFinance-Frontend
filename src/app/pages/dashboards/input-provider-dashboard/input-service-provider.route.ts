import { Routes } from '@angular/router';
import { authGuard } from '../../../guards/auth.guard';

export const inputServiceProviderRoutes: Routes = [
  {
    path: 'input-provider',
    canActivate: [authGuard],
    data: { roles: ['input_provider'] },
    loadComponent: () =>
      import('./input-provider-dashboard.component').then((m) => m.InputProviderDashboardComponent),
    title: 'Input Provider Dashboard',
  },
];
