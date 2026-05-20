import { Injectable, signal } from '@angular/core';

const TOKEN_STORAGE_KEY = 'ap.token';

@Injectable({
  providedIn: 'root',
})
export class TokenService {
  #token = signal<string>(localStorage.getItem(TOKEN_STORAGE_KEY) ?? '');

  token = this.#token.asReadonly();

  updateToken(token: string) {
    const trimmed = token.trim();
    this.#token.set(trimmed);
    if (trimmed) {
      localStorage.setItem(TOKEN_STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }

  clearToken() {
    this.updateToken('');
  }
}
