import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MeService } from '../../services/me.service';

@Component({
  selector: 'am-app-header',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ribbon" aria-hidden="true"></div>
    <div class="bar">
      <div class="left">
        <a routerLink="/rapporten/registraties" class="brand">
          <svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
            <defs>
              <linearGradient id="amf-brand-mark" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#2e2081" />
                <stop offset="50%" stop-color="#661e57" />
                <stop offset="100%" stop-color="#c53023" />
              </linearGradient>
            </defs>
            <rect width="32" height="32" rx="7" ry="7" fill="url(#amf-brand-mark)" />
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
          <span class="brand-wordmark">amfitech</span>
        </a>
        <nav class="primary-nav" aria-label="Hoofdmenu">
          <a
            routerLink="/rapporten"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: false }"
          >
            Rapporten
          </a>
          @if (canManageOffice()) {
            <a
              routerLink="/kantoor"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: false }"
            >
              Kantoor
            </a>
          }
        </nav>
      </div>
      <div class="right">
        @if (me.canSwitchOffice()) {
          <label class="office-switcher">
            <span class="sr-only">Actief kantoor</span>
            <select
              [value]="me.activeOfficeId() ?? ''"
              (change)="onSwitchOffice($event)"
            >
              <option value="" disabled>— kies een kantoor —</option>
              @for (office of me.offices(); track office.id) {
                <option [value]="office.id">{{ office.name }}</option>
              }
            </select>
          </label>
        } @else if (me.activeOffice(); as office) {
          <span class="office-label" title="Actief kantoor">{{ office.name }}</span>
        }
        <button type="button" class="logout" (click)="onLogout()">Uitloggen</button>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      background: #fff;
      border-bottom: 1px solid var(--color-border);
    }
    .ribbon { height: 6px; background: var(--amf-gradient); }
    .bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      padding: 18px clamp(16px, 4vw, 32px);
    }
    .left, .right {
      display: flex;
      align-items: center;
      gap: clamp(12px, 2.5vw, 22px);
      min-width: 0;
    }
    .left { gap: clamp(16px, 4vw, 40px); }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      color: var(--color-primary);
      text-decoration: none;
      transition: color var(--dur-base) var(--ease-out);
    }
    .brand:hover { color: var(--color-link-hover); }
    .brand-mark {
      width: clamp(26px, 3vw, 32px);
      height: clamp(26px, 3vw, 32px);
      flex-shrink: 0;
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
    .primary-nav { display: flex; gap: 22px; }
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
    .primary-nav a:hover { color: var(--color-link-hover); }
    .primary-nav a.active {
      color: var(--color-link-hover);
      border-bottom-color: var(--color-accent);
    }
    .office-switcher select {
      padding: 8px 12px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-pill);
      background: var(--color-bg);
      color: var(--color-fg);
      font: inherit;
      font-size: var(--fs-sm);
      max-width: 220px;
    }
    .office-switcher select:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(46, 32, 129, 0.15);
    }
    .office-label {
      padding: 8px 14px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-pill);
      background: var(--color-bg-soft);
      font-size: var(--fs-sm);
      font-weight: var(--fw-medium);
      color: var(--color-fg-muted);
      white-space: nowrap;
      max-width: 220px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .sr-only {
      position: absolute;
      width: 1px; height: 1px;
      padding: 0; margin: -1px;
      overflow: hidden; clip: rect(0, 0, 0, 0);
      white-space: nowrap; border: 0;
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
    .logout:hover { background: var(--color-primary-hover); }
    @media (max-width: 640px) {
      .brand-suffix { display: none; }
      .office-switcher select { max-width: 140px; }
      .logout { padding: 8px 14px; }
    }
  `,
})
export class AppHeaderComponent {
  readonly #auth = inject(AuthService);
  readonly me = inject(MeService);
  readonly logout = output<void>();

  canManageOffice = computed(() => {
    const r = this.me.role();
    return r === 'admin' || r === 'super_admin';
  });

  onSwitchOffice(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.me.setActiveOffice(select.value || null);
  }

  onLogout() {
    this.#auth.signOut().subscribe(() => this.logout.emit());
  }
}
