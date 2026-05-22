import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from './services/auth.service';
import { MeService } from './services/me.service';
import { AppHeaderComponent } from './components/app-header/app-header.component';

@Component({
  selector: 'am-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AppHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (showChrome()) {
      <am-app-header />
      <div class="shell" [class.shell--with-sidebar]="showSidebar()">
        @if (showRapportenSidebar()) {
          <aside class="sidebar" aria-label="Rapporten">
            <p class="sidebar-heading">Rapporten</p>
            <nav>
              <a
                routerLink="/rapporten/registraties"
                routerLinkActive="active"
                [routerLinkActiveOptions]="{ exact: true }"
              >
                Registraties
              </a>
            </nav>
          </aside>
        }
        @if (showKantoorSidebar()) {
          <aside class="sidebar" aria-label="Kantoor">
            <p class="sidebar-heading">Kantoor</p>
            <nav>
              <a
                routerLink="/kantoor/gebruikers"
                routerLinkActive="active"
                [routerLinkActiveOptions]="{ exact: true }"
              >
                Gebruikers
              </a>
              <a
                routerLink="/kantoor/api-sleutel"
                routerLinkActive="active"
                [routerLinkActiveOptions]="{ exact: true }"
              >
                API-sleutel
              </a>
            </nav>
          </aside>
        }
        <main class="content">
          <router-outlet />
        </main>
      </div>
    } @else {
      <router-outlet />
    }
    @if (showOfficePicker()) {
      <div
        class="office-picker-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="office-picker-title"
      >
        <div class="office-picker">
          <h2 id="office-picker-title">Kies een kantoor</h2>
          <p class="office-picker-lead">
            U bent gekoppeld aan meerdere kantoren. Kies waarvoor u wilt
            werken — u kunt later wisselen via de header. Zonder keuze kunt
            u niet verder.
          </p>
          <ul class="office-list">
            @for (office of me.offices(); track office.id) {
              <li>
                <button
                  type="button"
                  class="office-option"
                  (click)="pickOffice(office.id)"
                >
                  {{ office.name }}
                </button>
              </li>
            }
          </ul>
          <div class="office-picker-actions">
            <button
              type="button"
              class="office-picker-logout"
              (click)="logoutFromPicker()"
            >
              Uitloggen
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    .shell {
      flex: 1;
      display: flex;
      flex-direction: row;
      min-height: 0;
    }

    .sidebar {
      width: 240px;
      flex-shrink: 0;
      background: var(--color-bg);
      border-right: 1px solid var(--color-border);
      padding: var(--space-6) var(--space-4);
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .sidebar-heading {
      margin: 0 0 var(--space-2);
      padding: 0 var(--space-3);
      font-size: var(--fs-xs);
      font-weight: var(--fw-semibold);
      text-transform: uppercase;
      letter-spacing: var(--tracking-wider);
      color: var(--color-fg-muted);
    }

    .sidebar nav {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }

    .sidebar a {
      display: block;
      padding: 10px var(--space-3);
      border-radius: var(--radius-md);
      font-size: var(--fs-sm);
      font-weight: var(--fw-medium);
      color: var(--color-fg);
      text-decoration: none;
      transition:
        background-color var(--dur-fast) var(--ease-out),
        color var(--dur-fast) var(--ease-out);
    }

    .sidebar a:hover {
      background: var(--color-bg-soft);
      color: var(--color-primary);
    }

    .sidebar a.active {
      background: rgba(46, 32, 129, 0.08);
      color: var(--color-primary);
      font-weight: var(--fw-semibold);
    }

    .content {
      flex: 1;
      min-width: 0;
      background: var(--color-bg-soft);
    }

    @media (max-width: 900px) {
      .shell {
        flex-direction: column;
      }

      .sidebar {
        width: 100%;
        border-right: 0;
        border-bottom: 1px solid var(--color-border);
        padding: var(--space-3) clamp(16px, 4vw, 32px);
        gap: var(--space-2);
      }

      .sidebar-heading {
        display: none;
      }

      .sidebar nav {
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--space-2);
        overflow-x: auto;
      }

      .sidebar a {
        padding: 8px 14px;
        white-space: nowrap;
      }
    }

    .office-picker-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(26, 19, 48, 0.55);
      display: grid;
      place-items: center;
      padding: var(--space-4);
      z-index: 1000;
    }

    .office-picker {
      background: var(--color-bg);
      border-radius: var(--radius-lg);
      padding: var(--space-6);
      width: 100%;
      max-width: 480px;
      box-shadow: var(--shadow-xl);
    }

    .office-picker h2 {
      margin: 0 0 var(--space-3);
      font-size: var(--fs-lg);
    }

    .office-picker-lead {
      margin: 0 0 var(--space-4);
      color: var(--color-fg-muted);
      font-size: var(--fs-sm);
    }

    .office-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      gap: var(--space-2);
    }

    .office-option {
      width: 100%;
      text-align: left;
      padding: 12px 16px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg);
      color: var(--color-fg);
      font: inherit;
      font-size: var(--fs-sm);
      font-weight: var(--fw-medium);
      cursor: pointer;
      transition:
        border-color var(--dur-fast) var(--ease-out),
        background-color var(--dur-fast) var(--ease-out);
    }

    .office-option:hover {
      border-color: var(--color-primary);
      background: var(--color-bg-soft);
    }

    .office-picker-actions {
      margin-top: var(--space-4);
      display: flex;
      justify-content: flex-end;
    }

    .office-picker-logout {
      background: transparent;
      border: 1px solid var(--color-border);
      color: var(--color-fg-muted);
      padding: 8px 16px;
      border-radius: var(--radius-pill);
      font: inherit;
      font-size: var(--fs-sm);
      cursor: pointer;
      transition:
        border-color var(--dur-fast) var(--ease-out),
        color var(--dur-fast) var(--ease-out);
    }

    .office-picker-logout:hover {
      border-color: var(--color-danger);
      color: var(--color-danger);
    }
  `,
})
export class AppComponent {
  readonly #auth = inject(AuthService);
  readonly #router = inject(Router);
  readonly me = inject(MeService);

  readonly #currentUrl = toSignal(
    this.#router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.#router.url },
  );

  showChrome = computed(
    () =>
      !!this.#auth.accessToken() && !this.#currentUrl().startsWith('/login'),
  );

  showOfficePicker = computed(
    () => this.showChrome() && this.me.needsOfficePick(),
  );

  pickOffice(officeId: string) {
    this.me.setActiveOffice(officeId);
  }

  logoutFromPicker() {
    this.#auth.signOut().subscribe(() => {
      this.#router.navigateByUrl('/login');
    });
  }

  showRapportenSidebar = computed(
    () => this.showChrome() && this.#currentUrl().startsWith('/rapporten'),
  );

  showKantoorSidebar = computed(
    () => this.showChrome() && this.#currentUrl().startsWith('/kantoor'),
  );

  showSidebar = computed(
    () => this.showRapportenSidebar() || this.showKantoorSidebar(),
  );

  redirectOnSessionChange = effect(() => {
    // Wait until Supabase has rehydrated the session from localStorage
    if (!this.#auth.initialised()) return;
    const hasSession = !!this.#auth.accessToken();
    const onLogin = this.#router.url.startsWith('/login');
    if (hasSession && onLogin) {
      this.#router.navigateByUrl('/rapporten/registraties');
    } else if (!hasSession && !onLogin) {
      this.#router.navigateByUrl('/login');
    }
  });
}
