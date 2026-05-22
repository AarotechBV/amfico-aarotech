import { HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { MeService } from '../services/me.service';

export const authenticationInterceptor = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const auth = inject(AuthService);
  const me = inject(MeService);

  const headers: Record<string, string> = {};
  const token = auth.accessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const officeId = me.activeOfficeId();
  if (officeId) headers['X-Active-Office'] = officeId;

  if (Object.keys(headers).length === 0) return next(req);
  return next(req.clone({ setHeaders: headers }));
};
