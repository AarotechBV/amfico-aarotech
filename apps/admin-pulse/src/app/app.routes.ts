import { inject } from '@angular/core';
import { CanMatchFn, Route, Router } from '@angular/router';
import { TokenService } from './services/token.service';

const requireToken: CanMatchFn = () => {
  const tokenService = inject(TokenService);
  if (tokenService.token()) return true;
  return inject(Router).parseUrl('/login');
};

const requireNoToken: CanMatchFn = () => {
  const tokenService = inject(TokenService);
  if (!tokenService.token()) return true;
  return inject(Router).parseUrl('/registrations');
};

export const appRoutes: Route[] = [
  {
    path: 'login',
    canMatch: [requireNoToken],
    loadComponent: () =>
      import('./pages/login/login.page').then((p) => p.LoginPage),
  },
  {
    path: 'registrations',
    canMatch: [requireToken],
    loadComponent: () =>
      import('./pages/registrations-overview/registrations-overview.page').then(
        (p) => p.RegistrationsOverviewPage,
      ),
  },
  { path: '', pathMatch: 'full', redirectTo: 'registrations' },
];
