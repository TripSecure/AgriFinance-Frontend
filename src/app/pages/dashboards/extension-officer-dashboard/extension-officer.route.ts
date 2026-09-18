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
        path: 'farms',
        loadComponent: () =>
          import('./components/farms/farms.component').then((m) => m.FarmsComponent),
        title: 'Farms',
      },
      {
        path: 'visits',
        loadComponent: () =>
          import('./components/farm-visits/farm-visits.component').then((m) => m.FarmVisitsComponent),
        title: 'Farm Visits',
      },
      {
        path: 'visits/:visitId/report',
        loadComponent: () =>
          import('./components/farm-visits/visit-report/visit-report.component').then(
            (m) => m.VisitReportComponent,
          ),
        title: 'Log Visit Report',
      },
      {
        path: 'alerts',
        loadComponent: () =>
          import('./components/alerts/alerts.component').then((m) => m.AlertsComponent),
        title: 'Alerts',
      },
    ],
  },
];
