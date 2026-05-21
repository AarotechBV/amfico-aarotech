import { inject } from '@angular/core';
import { CanMatchFn, Route, Router } from '@angular/router';
import { AuthService } from './services/auth.service';

const DEFAULT_AUTHENTICATED_ROUTE = '/gebruikers';

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
    path: 'gebruikers',
    canMatch: [requireSession],
    loadComponent: () =>
      import('./pages/users/users.page').then((p) => p.UsersPage),
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: DEFAULT_AUTHENTICATED_ROUTE,
  },
];
