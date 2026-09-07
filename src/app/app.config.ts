import { ApplicationConfig, EnvironmentProviders, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

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
import { FarmersState } from './pages/dashboards/portfolio-officer-dashboard/components/farmers/farmers.state';
import { PortfolioLoansState } from './pages/dashboards/portfolio-officer-dashboard/components/loans/loans.state';
import { ExtensionFarmersState } from './pages/dashboards/extension-officer-dashboard/components/farmers/farmers.state';
import { ExtensionFarmsState } from './pages/dashboards/extension-officer-dashboard/components/farms/farms.state';
import { FarmVisitsState } from './pages/dashboards/extension-officer-dashboard/components/farm-visits/farm-visits.state';
import { PortfolioExtensionOfficersState } from './pages/dashboards/portfolio-officer-dashboard/components/extension-officers/extension-officers.state';
import { PortfolioInputProvidersState } from './pages/dashboards/portfolio-officer-dashboard/components/input-service-providers/input-service-providers.state';
import { PortfolioMonitoringVisitsState } from './pages/dashboards/portfolio-officer-dashboard/components/visits-reports/visits-reports.state';
import { PortfolioFarmsState } from './pages/dashboards/portfolio-officer-dashboard/components/farms/farms.state';
import { environment } from '../environment/environment';

const ngxsFeatures: EnvironmentProviders[] = [
  withNgxsFormPlugin(),
  ...(environment.production ? [] : [withNgxsReduxDevtoolsPlugin()]),
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
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
        FarmersState,
        PortfolioLoansState,
        ExtensionFarmersState,
        ExtensionFarmsState,
        FarmVisitsState,
        PortfolioExtensionOfficersState,
        PortfolioInputProvidersState,
        PortfolioMonitoringVisitsState,
        PortfolioFarmsState,
      ],
      ...ngxsFeatures,
    ),
  ],
};
