import { inject } from '@angular/core';
import { CanMatchFn, Route, Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { MeService } from './services/me.service';

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

const requireOfficeAdmin: CanMatchFn = () => {
  const me = inject(MeService);
  const role = me.role();
  if (role === 'admin' || role === 'super_admin') return true;
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
  {
    path: 'kantoor',
    canMatch: [requireSession, requireOfficeAdmin],
    children: [
      {
        path: 'gebruikers',
        loadComponent: () =>
          import('./pages/kantoor/users.page').then((p) => p.KantoorUsersPage),
      },
      {
        path: 'api-sleutel',
        loadComponent: () =>
          import('./pages/kantoor/api-key.page').then(
            (p) => p.KantoorApiKeyPage,
          ),
      },
      { path: '', pathMatch: 'full', redirectTo: 'gebruikers' },
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
