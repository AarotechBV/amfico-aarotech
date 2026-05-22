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

const ACTIVE_OFFICE_STORAGE_KEY = 'ap.active-office';

/**
 * Holds backend-derived identity: role, visible offices, and the
 * currently active office. Owns the X-Active-Office persistence layer
 * (localStorage) and the per-role default-office logic.
 *
 *   - admin/user: activeOfficeId is always their homeOfficeId
 *   - super_admin: activeOfficeId is persisted across reloads; null
 *     until the user picks one
 */
@Injectable({ providedIn: 'root' })
export class MeService {
  readonly #http = inject(HttpClient);
  readonly #base = inject(API_BASE_URL);
  readonly #auth = inject(AuthService);

  readonly #me = signal<MeResponse | null>(null);
  readonly #loading = signal(false);
  readonly #activeOfficeId = signal<string | null>(
    typeof localStorage !== 'undefined'
      ? localStorage.getItem(ACTIVE_OFFICE_STORAGE_KEY)
      : null,
  );

  readonly me = this.#me.asReadonly();
  readonly loading = this.#loading.asReadonly();
  readonly role = computed<AppRole | null>(() => this.#me()?.role ?? null);
  readonly offices = computed<OfficeSummary[]>(
    () => this.#me()?.offices ?? [],
  );
  readonly homeOfficeId = computed<string | null>(
    () => this.#me()?.homeOfficeId ?? null,
  );
  readonly activeOfficeId = this.#activeOfficeId.asReadonly();
  readonly activeOffice = computed<OfficeSummary | null>(() => {
    const id = this.#activeOfficeId();
    if (!id) return null;
    return this.offices().find((o) => o.id === id) ?? null;
  });

  /**
   * Triggers a fresh /api/auth/me when the access token changes (login,
   * refresh, sign-out). Clears me on sign-out.
   */
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

  /**
   * Keeps activeOfficeId consistent with role + offices:
   *   - admin/user: always equal to homeOfficeId
   *   - super_admin: keep current selection if it's still a visible
   *     office; otherwise null (forces them to pick)
   */
  reconcileActiveOffice = effect(() => {
    const me = this.#me();
    untracked(() => {
      if (!me) {
        this.#setActive(null);
        return;
      }
      if (me.role === 'super_admin') {
        const stored = this.#activeOfficeId();
        const stillVisible =
          stored && me.offices.some((o) => o.id === stored);
        if (!stillVisible) this.#setActive(null);
      } else {
        this.#setActive(me.homeOfficeId);
      }
    });
  });

  async refresh(): Promise<void> {
    this.#loading.set(true);
    try {
      const me = await firstValueFrom(
        this.#http.get<MeResponse>(`${this.#base}/auth/me`),
      );
      this.#me.set(me);
    } catch {
      this.#me.set(null);
    } finally {
      this.#loading.set(false);
    }
  }

  setActiveOffice(officeId: string | null) {
    // Only super_admin should be calling this; for admin/user the
    // reconcile effect immediately resets to homeOfficeId on change.
    this.#setActive(officeId);
  }

  #setActive(officeId: string | null) {
    this.#activeOfficeId.set(officeId);
    if (typeof localStorage === 'undefined') return;
    if (officeId) {
      localStorage.setItem(ACTIVE_OFFICE_STORAGE_KEY, officeId);
    } else {
      localStorage.removeItem(ACTIVE_OFFICE_STORAGE_KEY);
    }
  }
}
