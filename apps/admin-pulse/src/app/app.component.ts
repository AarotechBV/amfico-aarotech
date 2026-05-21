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
import { AppHeaderComponent } from './components/app-header/app-header.component';

@Component({
  selector: 'ap-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AppHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (showChrome()) {
      <ap-app-header />
      <div class="shell" [class.shell--with-sidebar]="showRapportenSidebar()">
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
        <main class="content">
          <router-outlet />
        </main>
      </div>
    } @else {
      <router-outlet />
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
  `,
})
export class AppComponent {
  readonly #auth = inject(AuthService);
  readonly #router = inject(Router);

  readonly #currentUrl = toSignal(
    this.#router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.#router.url },
  );

  showChrome = computed(() => !!this.#auth.accessToken());

  showRapportenSidebar = computed(
    () => this.showChrome() && this.#currentUrl().startsWith('/rapporten'),
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
