import { ApplicationConfig, EnvironmentProviders, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withRouterConfig } from '@angular/router';

import { routes } from './app.routes';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { withNgxsReduxDevtoolsPlugin } from '@ngxs/devtools-plugin';
import { withNgxsFormPlugin } from '@ngxs/form-plugin';
import { provideStore } from '@ngxs/store';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './interceptors/auth.interceptor';
import { AuthState } from './pages/auth/services/auth/auth.states';
import { RegistrationState } from './pages/auth/register/services/registration.state';
import { UsersState } from './pages/dashboards/super-admin-dashboard/components/users/users.state';
import { AuditLogsState } from './pages/dashboards/super-admin-dashboard/components/audit-logs/audit-logs.state';
import { AdminDashboardState } from './pages/dashboards/super-admin-dashboard/components/dashboard/dashboard.state';
import { AdminFarmersState } from './pages/dashboards/super-admin-dashboard/components/farmers-data/farmers-data.state';
import { AdminRiskScoresState } from './pages/dashboards/super-admin-dashboard/components/risk-scores/risk-scores.state';
import { AdminLoansState } from './pages/dashboards/super-admin-dashboard/components/agri-loans/agri-loans.state';
import { FarmersState } from './pages/dashboards/portfolio-officer-dashboard/components/farmers/farmers.state';
import { PortfolioLoansState } from './pages/dashboards/portfolio-officer-dashboard/components/loans/loans.state';
import { ExtensionFarmsState } from './pages/dashboards/extension-officer-dashboard/components/farms/farms.state';
import { FarmVisitsState } from './pages/dashboards/extension-officer-dashboard/components/farm-visits/farm-visits.state';
import { ExtensionAlertsState } from './pages/dashboards/extension-officer-dashboard/components/alerts/alerts.state';
import { PortfolioExtensionOfficersState } from './pages/dashboards/portfolio-officer-dashboard/components/extension-officers/extension-officers.state';
import { PortfolioInputProvidersState } from './pages/dashboards/portfolio-officer-dashboard/components/input-service-providers/input-service-providers.state';
import { PortfolioMonitoringVisitsState } from './pages/dashboards/portfolio-officer-dashboard/components/visits-reports/visits-reports.state';
import { PortfolioFarmsState } from './pages/dashboards/portfolio-officer-dashboard/components/farms/farms.state';
import { ProviderOrdersState } from './pages/dashboards/input-provider-dashboard/components/orders/orders.state';
import { environment } from '../environment/environment';

const ngxsFeatures: EnvironmentProviders[] = [
  withNgxsFormPlugin(),
  ...(environment.production ? [] : [withNgxsReduxDevtoolsPlugin()]),
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
    ),
    provideHttpClient(withInterceptors([authInterceptor])),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: false,
        },
      },
    }),
    provideStore(
      [
        AuthState,
        RegistrationState,
        UsersState,
        AuditLogsState,
        AdminDashboardState,
        AdminFarmersState,
        AdminRiskScoresState,
        AdminLoansState,
        FarmersState,
        PortfolioLoansState,
        ExtensionFarmsState,
        FarmVisitsState,
        ExtensionAlertsState,
        PortfolioExtensionOfficersState,
        PortfolioInputProvidersState,
        PortfolioMonitoringVisitsState,
        PortfolioFarmsState,
        ProviderOrdersState,
      ],
      ...ngxsFeatures,
    ),
  ],
};
