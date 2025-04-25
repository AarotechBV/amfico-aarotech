import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TokenService {
  #token = signal<string>('');

  token = this.#token.asReadonly();

  updateToken(token: string) {
    this.#token.set(token);
  }
}
