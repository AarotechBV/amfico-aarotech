import { HttpClient } from '@angular/common/http';
import {
  computed,
  effect,
  inject,
  Injectable,
  signal,
  untracked,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../api-base-url.token';
import { AuthService } from './auth.service';

export type AppRole = 'user' | 'admin' | 'super_admin';

export interface OfficeSummary {
  id: string;
  name: string;
  isActive: boolean;
  hasApiKey: boolean;
}

export interface MeResponse {
  userId: string;
  email: string;
  fullName: string | null;
  role: AppRole;
  homeOfficeId: string | null;
  offices: OfficeSummary[];
}

/**
 * Fetches and caches /api/auth/me whenever the access token changes.
 * The back-office uses this to enforce the "super_admin only" gate.
 */
@Injectable({ providedIn: 'root' })
export class MeService {
  readonly #http = inject(HttpClient);
  readonly #base = inject(API_BASE_URL);
  readonly #auth = inject(AuthService);

  readonly #me = signal<MeResponse | null>(null);
  readonly #loading = signal(false);

  readonly me = this.#me.asReadonly();
  readonly loading = this.#loading.asReadonly();
  readonly role = computed<AppRole | null>(() => this.#me()?.role ?? null);

  syncOnSessionChange = effect(() => {
    const token = this.#auth.accessToken();
    untracked(() => {
      if (!token) {
        this.#me.set(null);
        return;
      }
      void this.refresh();
    });
  });

  async refresh(): Promise<MeResponse | null> {
    this.#loading.set(true);
    try {
      const me = await firstValueFrom(
        this.#http.get<MeResponse>(`${this.#base}/auth/me`),
      );
      this.#me.set(me);
      return me;
    } catch {
      this.#me.set(null);
      return null;
    } finally {
      this.#loading.set(false);
    }
  }
}
