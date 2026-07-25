import { Routes } from '@angular/router';
import { InputProviderDashboardComponent } from './pages/dashboards/input-provider-dashboard/input-provider-dashboard.component';
import { SuperAdminDashboardComponent } from './pages/dashboards/super-admin-dashboard/super-admin-dashboard.component';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  {
    path: '',
    loadComponent: () =>
      import('./pages/landing-page/landing-page.component').then((m) => m.LandingPageComponent),
    children: [
      {
        path: 'home',
        loadComponent: () =>
          import('./pages/landing-page/home/home.component').then((m) => m.HomeComponent),
        title: 'TripSecure - Home',
      },
      {
        path: 'our-solutions',
        loadComponent: () =>
          import('./pages/landing-page/our-solutions/our-solutions.component').then(
            (m) => m.OurSolutionsComponent,
          ),
        title: 'Our Solutions',
      },
      {
        path: 'contact-us',
        loadComponent: () =>
          import('./pages/landing-page/contact-us/contact-us.component').then(
            (m) => m.ContactUsComponent,
          ),
        title: 'Contact Us',
      },
    ],
  },
  {
    path: 'auth',
    loadChildren: () => import('./pages/auth/auth.route').then((m) => m.routes),
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./pages/dashboards/dashboard.route').then((m) => m.routes),
  },
];
