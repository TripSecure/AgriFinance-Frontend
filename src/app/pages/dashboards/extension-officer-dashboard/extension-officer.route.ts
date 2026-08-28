import { Routes } from '@angular/router';
import { authGuard } from '../../../guards/auth.guard';

export const extensionOfficerRoutes: Routes = [
  {
    path: 'extension-officer',
    canActivate: [authGuard],
    data: { roles: ['extension_officer'] },
    loadComponent: () =>
      import('./extension-officer-dashboard.component').then(
        (m) => m.ExtensionOfficerDashboardComponent,
      ),
    title: 'Extension Officer Dashboard',
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () =>
          import('./components/dashboard/dashboard.component').then((m) => m.DashboardComponent),
        title: 'Home',
      },
      {
        path: 'farmers',
        loadComponent: () =>
          import('./components/farmers/farmers.component').then((m) => m.FarmersComponent),
        title: 'Farmers',
      },
      {
        path: 'visits',
        loadComponent: () =>
          import('./components/farm-visits/farm-visits.component').then((m) => m.FarmVisitsComponent),
        title: 'Farm Visits',
      }
    ],
  },
];
