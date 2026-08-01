import { Routes } from '@angular/router';
import { dashboardRedirectGuard } from '../../guards/auth.guard';
import { extensionOfficerRoutes } from './extension-officer-dashboard/extension-officer.route';
import { inputServiceProviderRoutes } from './input-provider-dashboard/input-service-provider.route';
import { portfolioOfficerRoutes } from './portfolio-officer-dashboard/portfolio-officer.route';
import { superAdminRoutes } from './super-admin-dashboard/super-admin.route';

export const routes: Routes = [
  { path: '', pathMatch: 'full', canMatch: [dashboardRedirectGuard], children: [] },
  ...superAdminRoutes,
  ...portfolioOfficerRoutes,
  ...extensionOfficerRoutes,
  ...inputServiceProviderRoutes,
];
