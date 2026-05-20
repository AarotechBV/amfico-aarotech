import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TokenService } from './services/token.service';

@Component({
  selector: 'ap-root',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (token()) {
      <router-outlet />
    }
  `,
})
export class AppComponent {
  readonly #tokenService = inject(TokenService);

  token = this.#tokenService.token;

  getToken = effect(() => {
    const token = this.token();
    untracked(() => {
      if (!token) {
        const newToken = window.prompt(
          'Gelieve je token in te geven',
          'token123',
        );
        if (newToken) {
          this.#tokenService.updateToken(newToken);
        }
      }
    });
  });
}
