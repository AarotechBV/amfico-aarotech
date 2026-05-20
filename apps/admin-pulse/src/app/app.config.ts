import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withHashLocation,
} from '@angular/router';
import { appRoutes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authenticationInterceptor } from './interceptors/authentication.interceptor';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { DATE_PIPE_DEFAULT_OPTIONS } from '@angular/common';
import { environment } from '../environments/environment';
import { API_BASE_URL } from './api-base-url.token';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes, withHashLocation(), withComponentInputBinding()),
    provideHttpClient(withInterceptors([authenticationInterceptor])),
    provideAnimationsAsync(),
    { provide: API_BASE_URL, useValue: environment.apiBaseUrl },
    {
      provide: DATE_PIPE_DEFAULT_OPTIONS,
      useValue: { dateFormat: 'dd-MM-yyyy' },
    },
  ],
};
