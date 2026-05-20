import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
} from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { TokenService } from './services/token.service';

@Component({
  selector: 'ap-root',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<router-outlet />`,
})
export class AppComponent {
  readonly #tokenService = inject(TokenService);
  readonly #router = inject(Router);

  redirectOnTokenChange = effect(() => {
    const hasToken = !!this.#tokenService.token();
    const onLogin = this.#router.url.startsWith('/login');
    if (hasToken && onLogin) {
      this.#router.navigateByUrl('/registrations');
    } else if (!hasToken && !onLogin) {
      this.#router.navigateByUrl('/login');
    }
  });
}
