import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TokenService } from '../../services/token.service';

@Component({
  selector: 'ap-app-header',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ribbon" aria-hidden="true"></div>
    <div class="bar">
      <div class="left">
        <a routerLink="/rapporten/registraties" class="brand">
          <span class="brand-wordmark">amfico</span>
          <span class="brand-suffix">Admin Pulse</span>
        </a>
        <nav class="primary-nav" aria-label="Hoofdmenu">
          <a
            routerLink="/rapporten"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: false }"
          >
            Rapporten
          </a>
        </nav>
      </div>
      <button type="button" class="logout" (click)="onLogout()">Uitloggen</button>
    </div>
  `,
  styles: `
    :host {
      display: block;
      background: #fff;
      border-bottom: 1px solid var(--color-border);
    }

    .ribbon {
      height: 6px;
      background: var(--amf-gradient);
    }

    .bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      padding: 18px clamp(16px, 4vw, 32px);
    }

    .left {
      display: flex;
      align-items: center;
      gap: clamp(16px, 4vw, 40px);
      min-width: 0;
    }

    .brand {
      display: inline-flex;
      align-items: baseline;
      gap: var(--space-2);
      color: var(--color-primary);
      text-decoration: none;
      transition: color var(--dur-base) var(--ease-out);
    }

    .brand:hover {
      color: var(--color-link-hover);
    }

    .brand-wordmark {
      font-family: var(--font-display);
      font-weight: var(--fw-bold);
      font-size: clamp(20px, 3.5vw, 24px);
      letter-spacing: -1px;
      color: var(--color-primary);
    }

    .brand-suffix {
      font-family: var(--font-sans);
      font-weight: var(--fw-medium);
      font-size: var(--fs-sm);
      color: var(--color-fg-muted);
      white-space: nowrap;
    }

    .primary-nav {
      display: flex;
      gap: 22px;
    }

    .primary-nav a {
      font-size: var(--fs-sm);
      font-weight: var(--fw-medium);
      color: var(--color-fg);
      padding: 6px 0;
      border-bottom: 2px solid transparent;
      transition:
        color var(--dur-base) var(--ease-out),
        border-color var(--dur-base) var(--ease-out);
      white-space: nowrap;
    }

    .primary-nav a:hover {
      color: var(--color-link-hover);
    }

    .primary-nav a.active {
      color: var(--color-link-hover);
      border-bottom-color: var(--color-accent);
    }

    .logout {
      background: var(--color-primary);
      color: #fff;
      border: 0;
      padding: 9px 18px;
      border-radius: var(--radius-pill);
      font: inherit;
      font-size: var(--fs-sm);
      font-weight: var(--fw-semibold);
      cursor: pointer;
      transition: background-color var(--dur-base) var(--ease-out);
      white-space: nowrap;
    }

    .logout:hover {
      background: var(--color-primary-hover);
    }

    @media (max-width: 540px) {
      .brand-suffix {
        display: none;
      }
      .logout {
        padding: 8px 14px;
      }
    }
  `,
})
export class AppHeaderComponent {
  readonly #tokenService = inject(TokenService);
  readonly logout = output<void>();

  onLogout() {
    this.#tokenService.clearToken();
    this.logout.emit();
  }
}
