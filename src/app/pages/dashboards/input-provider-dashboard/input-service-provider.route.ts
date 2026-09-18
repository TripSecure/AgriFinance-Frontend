import { Routes } from '@angular/router';
import { authGuard } from '../../../guards/auth.guard';

export const inputServiceProviderRoutes: Routes = [
  {
    path: 'input-provider',
    canActivate: [authGuard],
    data: {
      roles: [
        'input_provider',
        'tractor_provider',
        'soil_testing_provider',
        'irrigation_provider',
        'logistics_provider',
      ],
    },
    loadComponent: () =>
      import('./input-provider-dashboard.component').then((m) => m.InputProviderDashboardComponent),
    title: 'Input Provider Dashboard',
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () =>
          import('./components/dashboard/dashboard.component').then((m) => m.ProviderDashboardComponent),
        title: 'Home',
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./components/orders/orders.component').then((m) => m.OrdersComponent),
        title: 'Order Fulfillment',
      },
      {
        path: 'redeem',
        loadComponent: () =>
          import('./components/redeem-voucher/redeem-voucher.component').then(
            (m) => m.RedeemVoucherComponent,
          ),
        title: 'Redeem Voucher',
      },
    ],
  },
];
