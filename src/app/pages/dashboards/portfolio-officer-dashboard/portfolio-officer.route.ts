import { Routes } from '@angular/router';
import { authGuard } from '../../../guards/auth.guard';

export const portfolioOfficerRoutes: Routes = [
  {
    path: 'portfolio-officer',
    canActivate: [authGuard],
    data: { roles: ['portfolio_officer'] },
    loadComponent: () =>
      import('./portfolio-officer-dashboard.component').then(
        (m) => m.PortfolioOfficerDashboardComponent,
      ),
    title: 'Portfolio Officer Dashboard',
    children: [
      { path: '', redirectTo: 'farmers', pathMatch: 'full' },
      { path: 'home', redirectTo: 'farmers', pathMatch: 'full' },
      {
        path: 'farmers',
        title: 'Farmers',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./components/farmers/farmers.component').then((m) => m.FarmersComponent),
          },
          {
            path: 'add',
            loadComponent: () =>
              import('./components/add-farmer/add-farmer.component').then(
                (m) => m.AddFarmerComponent,
              ),
            title: 'Add Farmer',
          },
          {
            path: ':farmerId',
            loadComponent: () =>
              import('./components/add-farmer/add-farmer.component').then(
                (m) => m.AddFarmerComponent,
              ),
            title: 'Edit Farmer',
          },
        ],
      },

      {
        path: 'extension-officers',
        loadComponent: () =>
          import('./components/extension-officers/extension-officers.component').then(
            (m) => m.ExtensionOfficersComponent,
          ),
        title: 'Extension Officers',
      },
      {
        path: 'input-service-providers',
        loadComponent: () =>
          import('./components/input-service-providers/input-service-providers.component').then(
            (m) => m.InputServiceProvidersComponent,
          ),
        title: 'Input Service Providers',
      },
      {
        path: 'loans',
        loadComponent: () =>
          import('./components/loans/loans.component').then((m) => m.LoansComponent),
        title: 'Loans',
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./components/visits-reports/visits-reports.component').then((m) => m.VisitsReportsComponent),
        title: 'Monitoring Visits',
      },
    ],
  },
];
