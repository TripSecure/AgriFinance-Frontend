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
import { FarmersState } from './pages/dashboards/portfolio-officer-dashboard/components/farmers/farmers.state';
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
    provideStore([AuthState, RegistrationState, UsersState, FarmersState], ...ngxsFeatures),
  ],
};
