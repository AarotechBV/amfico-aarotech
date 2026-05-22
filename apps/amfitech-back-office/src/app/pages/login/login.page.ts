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
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'am-login',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main>
      <div class="ribbon" aria-hidden="true"></div>
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="brand">
          <span class="wordmark">amfitech</span>
          <span class="suffix">Back Office</span>
        </div>
        <p class="eyebrow">Inloggen</p>
        <h1>Beheer-omgeving</h1>
        <p class="lead">
          Enkel toegankelijk voor beheerders. Meld u aan met uw
          e-mailadres en wachtwoord.
        </p>

        <label class="field">
          <span class="label">E-mail</span>
          <input
            type="email"
            autocomplete="email"
            formControlName="email"
            placeholder="naam@bedrijf.be"
          />
        </label>

        <label class="field">
          <span class="label">Wachtwoord</span>
          <input
            type="password"
            autocomplete="current-password"
            formControlName="password"
          />
        </label>

        @if (submitted() && form.controls.email.invalid) {
          <small class="error">E-mailadres is verplicht.</small>
        }
        @if (submitted() && form.controls.password.invalid) {
          <small class="error">Wachtwoord is verplicht.</small>
        }
        @if (errorMessage(); as msg) {
          <small class="error">{{ msg }}</small>
        }

        <button type="submit" class="btn-primary" [disabled]="loading()">
          {{ loading() ? 'Bezig…' : 'Inloggen' }}
        </button>
      </form>
    </main>
  `,
  styles: `
    :host {
      display: grid;
      place-items: center;
      min-height: 100vh;
      padding: var(--space-5);
      background: var(--color-bg-soft);
    }
    main {
      width: 100%;
      max-width: 440px;
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-md);
      overflow: hidden;
    }
    .ribbon {
      height: 6px;
      background: var(--amf-gradient);
    }
    form {
      display: grid;
      gap: var(--space-4);
      padding: var(--space-7) var(--space-6) var(--space-6);
    }
    .brand {
      display: flex;
      align-items: baseline;
      gap: var(--space-2);
      margin-bottom: var(--space-2);
    }
    .wordmark {
      font-family: var(--font-display);
      font-weight: var(--fw-bold);
      font-size: 28px;
      letter-spacing: -1px;
      color: var(--color-primary);
    }
    .suffix {
      font-size: var(--fs-sm);
      color: var(--color-fg-muted);
      font-weight: var(--fw-medium);
    }
    h1 {
      margin: 0;
      font-size: var(--fs-xl);
    }
    .lead {
      margin: 0;
      color: var(--color-fg-muted);
      font-size: var(--fs-base);
    }
    .field {
      display: grid;
      gap: var(--space-2);
    }
    .label {
      font-size: var(--fs-xs);
      font-weight: var(--fw-semibold);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-fg-muted);
    }
    input {
      padding: 11px 14px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-family: var(--font-sans);
      font-size: var(--fs-sm);
      color: var(--color-fg);
      background: var(--color-bg);
      transition: border-color var(--dur-fast) var(--ease-out),
        box-shadow var(--dur-fast) var(--ease-out);
    }
    input:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(46, 32, 129, 0.15);
    }
    .btn-primary {
      margin-top: var(--space-2);
      background: var(--color-primary);
      color: #fff;
      border: 0;
      padding: 12px 22px;
      border-radius: var(--radius-pill);
      font-family: var(--font-sans);
      font-weight: var(--fw-semibold);
      font-size: var(--fs-sm);
      cursor: pointer;
      transition: background-color var(--dur-base) var(--ease-out),
        transform var(--dur-fast) var(--ease-out);
    }
    .btn-primary:hover:not(:disabled) {
      background: var(--color-primary-hover);
    }
    .btn-primary:active {
      transform: scale(0.98);
    }
    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .error {
      color: var(--color-danger);
      font-size: var(--fs-sm);
    }
  `,
})
export class LoginPage {
  readonly #auth = inject(AuthService);

  readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  submitted = signal(false);
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  submit() {
    this.submitted.set(true);
    this.errorMessage.set(null);
    if (this.form.invalid) return;
    this.loading.set(true);
    const { email, password } = this.form.getRawValue();
    this.#auth.signInWithPassword(email, password).subscribe({
      next: () => this.loading.set(false),
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          err?.message ?? 'Aanmelden mislukt. Controleer uw gegevens.',
        );
      },
    });
  }
}
