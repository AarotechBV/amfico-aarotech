import { Component, effect, inject, untracked } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TokenService } from './services/token.service';

@Component({
  imports: [RouterModule],
  selector: 'ap-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
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
          'token123'
        );
        if (newToken) {
          this.#tokenService.updateToken(newToken);
        }
      }
    });
  });
}
