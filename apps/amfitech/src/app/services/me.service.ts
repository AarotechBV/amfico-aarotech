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
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  role: AppRole;
  offices: OfficeSummary[];
}

const ACTIVE_OFFICE_STORAGE_KEY = 'am.active-office';

/**
 * Holds backend-derived identity: role, visible offices, and the
 * currently active office. Owns the X-Active-Office persistence layer
 * (localStorage) and the per-role default-office logic.
 *
 *   - single-office non-super_admin: activeOfficeId is always that one
 *     office (no switcher, no picker)
 *   - everyone else (multi-office non-super_admin, any super_admin):
 *     activeOfficeId is persisted across reloads; null until picked,
 *     which forces the picker modal
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
  readonly activeOfficeId = this.#activeOfficeId.asReadonly();
  readonly activeOffice = computed<OfficeSummary | null>(() => {
    const id = this.#activeOfficeId();
    if (!id) return null;
    return this.offices().find((o) => o.id === id) ?? null;
  });
  /**
   * True when the user has 2+ visible offices — drives the header
   * switcher. Single-office users (any role) see a static label.
   */
  readonly canSwitchOffice = computed(() => {
    const me = this.#me();
    return !!me && me.offices.length > 1;
  });
  /**
   * True when the user is signed in but has no active office. The
   * picker modal blocks the app until this clears. Single-office
   * non-super_admin users never hit this because reconcile auto-picks
   * for them. The offices.length === 0 guard prevents a fresh-install
   * super_admin from being stuck on an empty picker.
   */
  readonly needsOfficePick = computed(() => {
    const me = this.#me();
    if (!me || me.offices.length === 0) return false;
    return !this.#activeOfficeId();
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
   * Keeps activeOfficeId consistent with the visible offices:
   *   - signed out (no token): clear persisted selection
   *   - signed in but /me still loading: leave the persisted value
   *     alone so a refresh doesn't trigger the picker
   *   - exactly one visible office: auto-pick it (no modal, no switcher)
   *   - multiple visible offices: keep the persisted selection if it's
   *     still in the list; otherwise null (forces a pick)
   */
  reconcileActiveOffice = effect(() => {
    const me = this.#me();
    untracked(() => {
      if (!me) {
        if (!this.#auth.accessToken()) this.#setActive(null);
        return;
      }
      if (me.offices.length === 1) {
        this.#setActive(me.offices[0].id);
        return;
      }
      const stored = this.#activeOfficeId();
      const stillVisible = stored && me.offices.some((o) => o.id === stored);
      if (!stillVisible) this.#setActive(null);
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
