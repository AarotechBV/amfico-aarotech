import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AppHeaderComponent } from './components/app-header/app-header.component';
import { AuthService } from './services/auth.service';
import { MeService } from './services/me.service';

@Component({
  selector: 'am-root',
  imports: [RouterOutlet, AppHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (rejectedReason(); as reason) {
      <div class="reject" role="alert">{{ reason }}</div>
    }
    @if (showChrome()) {
      <am-app-header />
    }
    <main class="content">
      <router-outlet />
    </main>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    .content {
      flex: 1;
      background: var(--color-bg-soft);
    }
    .reject {
      background: var(--color-danger);
      color: #fff;
      padding: var(--space-3) var(--space-4);
      text-align: center;
      font-weight: var(--fw-semibold);
    }
  `,
})
export class AppComponent {
  readonly #auth = inject(AuthService);
  readonly #me = inject(MeService);
  readonly #router = inject(Router);

  rejectedReason = signal<string | null>(null);

  readonly #currentUrl = toSignal(
    this.#router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.#router.url },
  );

  showChrome = computed(
    () =>
      !!this.#auth.accessToken() &&
      this.#me.role() === 'super_admin' &&
      !this.#currentUrl().startsWith('/login'),
  );

  /**
   * Routing + role gate combined:
   *  - No session → /login
   *  - Session + me not loaded yet → wait
   *  - Session + role !== super_admin → sign out + show "access denied"
   *  - Session + super_admin + on /login → /kantoren
   */
  enforceAccess = effect(() => {
    if (!this.#auth.initialised()) return;
    const hasSession = !!this.#auth.accessToken();
    const onLogin = this.#router.url.startsWith('/login');
    const me = this.#me.me();

    untracked(() => {
      if (!hasSession) {
        if (!onLogin) this.#router.navigateByUrl('/login');
        return;
      }
      if (!me) return; // /api/auth/me still loading

      if (me.role !== 'super_admin') {
        this.rejectedReason.set(
          'Geen toegang tot de back office. Enkel super admins.',
        );
        this.#auth.signOut().subscribe(() => {
          setTimeout(() => this.rejectedReason.set(null), 4000);
        });
        return;
      }

      this.rejectedReason.set(null);
      if (onLogin) this.#router.navigateByUrl('/kantoren');
    });
  });
}
