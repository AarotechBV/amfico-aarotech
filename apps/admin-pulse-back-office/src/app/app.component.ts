import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
} from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { AppHeaderComponent } from './components/app-header/app-header.component';

@Component({
  selector: 'ap-root',
  imports: [RouterOutlet, AppHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (showChrome()) {
      <ap-app-header />
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
  `,
})
export class AppComponent {
  readonly #auth = inject(AuthService);
  readonly #router = inject(Router);

  showChrome = computed(() => !!this.#auth.accessToken());

  redirectOnSessionChange = effect(() => {
    if (!this.#auth.initialised()) return;
    const hasSession = !!this.#auth.accessToken();
    const onLogin = this.#router.url.startsWith('/login');
    if (hasSession && onLogin) {
      this.#router.navigateByUrl('/gebruikers');
    } else if (!hasSession && !onLogin) {
      this.#router.navigateByUrl('/login');
    }
  });
}
