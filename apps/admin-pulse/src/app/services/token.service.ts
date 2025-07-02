import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TokenService {
  // #token = signal<string>('YkniHvSIXHMN-FN7KHzMVaS8qOCqnXhL0sW48F7MaCQ');
  #token = signal<string>('hZxEh96Z0_XRfpoFen4A8opR1_FDo4n2cmKlkoqQAy4');
  // #token = signal<string>('');

  token = this.#token.asReadonly();

  updateToken(token: string) {
    this.#token.set(token);
  }
}
