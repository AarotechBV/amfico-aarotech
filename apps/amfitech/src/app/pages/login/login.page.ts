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
          <svg class="mark" viewBox="0 0 32 32" aria-hidden="true">
            <defs>
              <linearGradient id="amf-login-mark-main" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#2e2081" />
                <stop offset="50%" stop-color="#661e57" />
                <stop offset="100%" stop-color="#c53023" />
              </linearGradient>
            </defs>
            <rect width="32" height="32" rx="7" ry="7" fill="url(#amf-login-mark-main)" />
            <text
              x="16"
              y="23"
              text-anchor="middle"
              fill="#ffffff"
              font-family="Quicksand, system-ui, sans-serif"
              font-weight="700"
              font-size="22"
              letter-spacing="-0.5"
            >a</text>
          </svg>
          <span class="wordmark">amfitech</span>
        </div>
        <p class="eyebrow">Inloggen</p>
        <h1>Welkom terug</h1>
        <p class="lead">Meld u aan met uw e-mailadres en wachtwoord.</p>

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
      box-sizing: border-box;
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

    .mark {
      width: 36px;
      height: 36px;
      flex-shrink: 0;
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
      transition:
        border-color var(--dur-fast) var(--ease-out),
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
      transition:
        background-color var(--dur-base) var(--ease-out),
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
      next: () => {
        this.loading.set(false);
        // AppComponent's redirectOnSessionChange effect handles navigation
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          err?.message ?? 'Aanmelden mislukt. Controleer uw gegevens.',
        );
      },
    });
  }
}
