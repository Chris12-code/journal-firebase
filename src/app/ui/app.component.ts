import {ChangeDetectionStrategy, Component, computed, effect, inject} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatToolbarModule} from '@angular/material/toolbar';
import {Router, RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';
import {SessionService} from '../application/session.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-toolbar class="toolbar">
      <img class="logo" src="assets/logo_start.png" alt="Rotes Kreuz">
      <span class="title">RK Strobl Journalblatt</span>
      <span class="spacer"></span>
      @if (session.isLoggedIn()) {
        <span class="user">{{ session.user()?.email }}</span>
        <button mat-icon-button (click)="logout()" aria-label="Abmelden" title="Abmelden">
          <mat-icon>logout</mat-icon>
        </button>
      }
    </mat-toolbar>

    @if (hasAccess()) {
      <nav class="nav">
        <a mat-button routerLink="/fahrten" routerLinkActive="active"><mat-icon>subject</mat-icon> Fahrten</a>
        <a mat-button routerLink="/touren" routerLinkActive="active"><mat-icon>people_outline</mat-icon> Dienstmannschaft</a>
        @if (session.isAdmin()) {
          <a mat-button routerLink="/bericht" routerLinkActive="active"><mat-icon>bar_chart</mat-icon> Jahresbericht</a>
          <a mat-button routerLink="/benutzer" routerLinkActive="active"><mat-icon>manage_accounts</mat-icon> Benutzer</a>
        }
      </nav>
    }

    <main>
      <router-outlet />
    </main>
  `,
  styles: `
    .toolbar { background: #9f9f9f; color: #fff; height: 80px; padding: 0 8px 0 0; }
    .logo { height: 80px; width: 169px; margin-right: 10px; }
    .title { font-size: 20px; font-weight: bold; }
    .spacer { flex: 1 1 auto; }
    .user { font-size: 14px; margin-right: 8px; }
    .nav { display: flex; gap: 4px; padding: 8px 16px; flex-wrap: wrap; }
    .nav a.active { background: rgba(0, 0, 0, .08); }
    @media (max-width: 600px) {
      .logo { width: 110px; height: 52px; }
      .toolbar { height: 56px; }
      .title { font-size: 16px; }
      .user { display: none; }
    }
  `,
})
export class AppComponent {
  protected readonly session = inject(SessionService);
  private readonly router = inject(Router);

  protected readonly hasAccess = computed(() => {
    const a = this.session.access();
    return a === 'STATION' || a === 'ADMIN';
  });

  constructor() {
    // Follow access changes in an open session (deactivated, removed or demoted by an admin).
    effect(() => {
      const access = this.session.access();
      const url = this.router.url;
      if (access === 'NONE' && !url.startsWith('/kein-zugang')) {
        void this.router.navigate(['/kein-zugang']);
      } else if (access === 'STATION' && (url.startsWith('/bericht') || url.startsWith('/benutzer'))) {
        void this.router.navigate(['/fahrten']);
      }
    });
  }

  async logout(): Promise<void> {
    await this.session.logout();
    await this.router.navigate(['/login']);
  }
}
