import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TokenService } from '../../services/token.service';

@Component({
  selector: 'ap-login',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <h1>AdminPulse token</h1>
        <p>
          Geef je AdminPulse API-token in om verder te gaan. Het token wordt
          enkel lokaal in deze browser bewaard.
        </p>
        <label>
          <span>Token</span>
          <input
            type="password"
            autocomplete="off"
            spellcheck="false"
            formControlName="token"
          />
        </label>
        @if (submitted() && form.controls.token.invalid) {
          <small class="error">Token mag niet leeg zijn.</small>
        }
        <button type="submit">Inloggen</button>
      </form>
    </main>
  `,
  styles: `
    :host {
      display: grid;
      place-items: center;
      min-height: 100vh;
      padding: 24px;
    }
    main {
      width: 100%;
      max-width: 420px;
    }
    form {
      display: grid;
      gap: 16px;
      padding: 24px;
      border: 1px solid #ddd;
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
    }
    h1 {
      margin: 0;
      font-size: 20px;
    }
    p {
      margin: 0;
      color: #555;
      font-size: 14px;
    }
    label {
      display: grid;
      gap: 4px;
      font-size: 14px;
    }
    input {
      padding: 8px 10px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font: inherit;
    }
    button {
      padding: 10px;
      background: #1f6feb;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font: inherit;
    }
    button:hover {
      background: #1858c4;
    }
    .error {
      color: #c0392b;
    }
  `,
})
export class LoginPage {
  readonly #tokenService = inject(TokenService);

  readonly form = new FormGroup({
    token: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  submitted = signal(false);

  submit() {
    this.submitted.set(true);
    if (this.form.invalid) return;
    this.#tokenService.updateToken(this.form.controls.token.value);
  }
}
