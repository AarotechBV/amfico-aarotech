import { inject } from '@angular/core';
import { CanMatchFn, Route, Router } from '@angular/router';
import { AuthService } from './services/auth.service';

const DEFAULT_AUTHENTICATED_ROUTE = '/rapporten/registraties';

const requireSession: CanMatchFn = () => {
  const auth = inject(AuthService);
  if (auth.accessToken()) return true;
  return inject(Router).parseUrl('/login');
};

const requireNoSession: CanMatchFn = () => {
  const auth = inject(AuthService);
  if (!auth.accessToken()) return true;
  return inject(Router).parseUrl(DEFAULT_AUTHENTICATED_ROUTE);
};

export const appRoutes: Route[] = [
  {
    path: 'login',
    canMatch: [requireNoSession],
    loadComponent: () =>
      import('./pages/login/login.page').then((p) => p.LoginPage),
  },
  {
    path: 'rapporten',
    canMatch: [requireSession],
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
  // Legacy URL — redirect for bookmarks
  { path: 'registrations', redirectTo: DEFAULT_AUTHENTICATED_ROUTE },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: DEFAULT_AUTHENTICATED_ROUTE,
  },
];
