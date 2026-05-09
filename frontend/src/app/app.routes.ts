import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/pages/registr/register').then((m) => m.Register),
  },
  {
    path: 'forbidden',
    loadComponent: () =>
      import('./features/forbidden/forbidden.page').then((m) => m.ForbiddenPage),
  },
  {
    path: 'pending',
    loadComponent: () =>
      import('./features/auth/pages/pending/pending.page').then((m) => m.PendingPage),
  },
  {
    path: 'select-store',
    loadComponent: () =>
      import('./features/auth/pages/select-store/select-store.page').then((m) => m.SelectStorePage),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'business-pulse' },

      {
        path: 'business-pulse',
        loadComponent: () =>
          import('./features/business-pulse/business-pulse.page').then(
            (m) => m.BusinessPulsePage,
          ),
      },

      {
        path: 'owner',
        canActivate: [roleGuard('owner')],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'financials' },
          {
            path: 'financials',
            loadComponent: () =>
              import('./features/owner/financials/financials.page').then(
                (m) => m.OwnerFinancialsPage,
              ),
          },
          {
            path: 'inventory',
            loadComponent: () =>
              import('./features/owner/inventory/inventory-valuation.page').then(
                (m) => m.OwnerInventoryValuationPage,
              ),
          },
          {
            path: 'suppliers',
            loadComponent: () =>
              import('./features/owner/suppliers/suppliers.page').then(
                (m) => m.OwnerSuppliersPage,
              ),
          },
          {
            path: 'team',
            loadComponent: () =>
              import('./features/owner/team/team.page').then(
                (m) => m.OwnerTeamPage,
              ),
          },
          {
            path: 'sales',
            loadComponent: () =>
              import('./features/owner/sales/sales.page').then(
                (m) => m.OwnerSalesPage,
              ),
          },
          {
            path: 'live-inventory',
            loadComponent: () =>
              import('./features/admin/inventory/inventory.page').then(
                (m) => m.AdminInventoryPage,
              ),
          },
          {
            path: 'discounts',
            loadComponent: () =>
              import('./features/admin/discounts/discounts.page').then(
                (m) => m.AdminDiscountsPage,
              ),
          },
          {
            path: 'low-stock',
            loadComponent: () =>
              import('./features/admin/low-stock/low-stock.page').then(
                (m) => m.AdminLowStockPage,
              ),
          },
          {
            path: 'returns',
            loadComponent: () =>
              import('./features/returns/returns.page').then(
                (m) => m.ReturnsPage,
              ),
          },
        ],
      },

      {
        path: 'admin',
        canActivate: [roleGuard('admin')],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'inventory' },
          {
            path: 'inventory',
            loadComponent: () =>
              import('./features/admin/inventory/inventory.page').then(
                (m) => m.AdminInventoryPage,
              ),
          },
          {
            path: 'sales',
            loadComponent: () =>
              import('./features/admin/sales/sales.page').then(
                (m) => m.AdminSalesPage,
              ),
          },
          {
            path: 'discounts',
            loadComponent: () =>
              import('./features/admin/discounts/discounts.page').then(
                (m) => m.AdminDiscountsPage,
              ),
          },
          {
            path: 'low-stock',
            loadComponent: () =>
              import('./features/admin/low-stock/low-stock.page').then(
                (m) => m.AdminLowStockPage,
              ),
          },
          {
            path: 'returns',
            loadComponent: () =>
              import('./features/returns/returns.page').then(
                (m) => m.ReturnsPage,
              ),
          },
        ],
      },

      {
        path: 'settings',
        canActivate: [roleGuard('owner')],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'store' },
          {
            path: 'store',
            loadComponent: () =>
              import('./features/settings/store/store-profile.page').then(
                (m) => m.SettingsStoreProfilePage,
              ),
          },
        ],
      },
    ],
  },

  { path: '', pathMatch: 'full', redirectTo: 'app' },
  { path: '**', redirectTo: 'app' },
];
