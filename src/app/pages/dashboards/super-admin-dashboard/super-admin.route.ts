import { Routes } from '@angular/router';
import { authGuard } from '../../../guards/auth.guard';

export const superAdminRoutes: Routes = [
  {
    path: 'super-admin',
    canActivate: [authGuard],
    data: { roles: ['super_admin'] },
    loadComponent: () =>
      import('./super-admin-dashboard.component').then((m) => m.SuperAdminDashboardComponent),
    title: 'Super Admin Dashboard',
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () =>
          import('./components/dashboard/dashboard.component').then((m) => m.DashboardComponent),
        title: 'Home',
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./components/users/users.component').then((m) => m.UsersComponent),
        title: 'Users',
      },
      {
        path: 'users/:userId',
        loadComponent: () =>
          import('./components/users/user-details/user-details.component').then(
            (m) => m.UserDetailsComponent,
          ),
        title: 'User Details',
      },
      {
        path: 'audit-log',
        loadComponent: () =>
          import('./components/audit-logs/audit-logs.component').then(
            (m) => m.AuditLogsComponent,
          ),
        title: 'Audit Log',
      },
      {
        path: 'audit-logs',
        redirectTo: 'audit-log',
        pathMatch: 'full',
      },
    ],
  },
];
