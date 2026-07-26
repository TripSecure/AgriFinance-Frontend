import { Routes } from '@angular/router';
import { authGuard, dashboardRedirectGuard } from '../../guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', canMatch: [dashboardRedirectGuard], children: [] },
  {
    path: 'super-admin',
    canActivate: [authGuard],
    data: { roles: ['super_admin'] },
    loadComponent: () =>
      import('./super-admin-dashboard/super-admin-dashboard.component').then(
        (m) => m.SuperAdminDashboardComponent,
      ),
    title: 'Super Admin Dashboard',
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () =>
          import('./super-admin-dashboard/components/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
        title: 'Home',
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./super-admin-dashboard/components/users/users.component').then(
            (m) => m.UsersComponent,
          ),
        title: 'Users',
      },
      {
        path: 'users/:userId',
        loadComponent: () =>
          import('./super-admin-dashboard/components/users/user-details/user-details.component').then(
            (m) => m.UserDetailsComponent,
          ),
        title: 'User Details',
      },
    ],
  },
  {
    path: 'portfolio-officer',
    canActivate: [authGuard],
    data: { roles: ['portfolio_officer'] },
    loadComponent: () =>
      import('./portfolio-officer-dashboard/portfolio-officer-dashboard.component').then(
        (m) => m.PortfolioOfficerDashboardComponent,
      ),
    title: 'Portfolio Officer Dashboard',
  },
  {
    path: 'extension-officer',
    canActivate: [authGuard],
    data: { roles: ['extension_officer'] },
    loadComponent: () =>
      import('./extension-officer-dashboard/extension-officer-dashboard.component').then(
        (m) => m.ExtensionOfficerDashboardComponent,
      ),
    title: 'Extension Officer Dashboard',
  },
];

