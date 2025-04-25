import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: 'registrations',
    loadComponent: () =>
      import('./pages/registrations-overview/registrations-overview.page').then(
        (p) => p.RegistrationsOverviewPage
      ),
  },
  { path: '', pathMatch: 'full', redirectTo: 'registrations' },
];
