import { inject } from '@angular/core';
import { CanMatchFn, Route, Router } from '@angular/router';
import { TokenService } from './services/token.service';

const DEFAULT_AUTHENTICATED_ROUTE = '/rapporten/registraties';

const requireToken: CanMatchFn = () => {
  const tokenService = inject(TokenService);
  if (tokenService.token()) return true;
  return inject(Router).parseUrl('/login');
};

const requireNoToken: CanMatchFn = () => {
  const tokenService = inject(TokenService);
  if (!tokenService.token()) return true;
  return inject(Router).parseUrl(DEFAULT_AUTHENTICATED_ROUTE);
};

export const appRoutes: Route[] = [
  {
    path: 'login',
    canMatch: [requireNoToken],
    loadComponent: () =>
      import('./pages/login/login.page').then((p) => p.LoginPage),
  },
  {
    path: 'rapporten',
    canMatch: [requireToken],
    children: [
      {
        path: 'registraties',
        loadComponent: () =>
          import(
            './pages/registrations-overview/registrations-overview.page'
          ).then((p) => p.RegistrationsOverviewPage),
      },
      { path: '', pathMatch: 'full', redirectTo: 'registraties' },
    ],
  },
  // Keep the legacy URL working for anyone with a bookmark
  { path: 'registrations', redirectTo: DEFAULT_AUTHENTICATED_ROUTE },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: DEFAULT_AUTHENTICATED_ROUTE,
  },
];
