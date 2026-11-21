import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {Router} from '@angular/router';
import {SessionService} from '../../application/session.service';

/** Shown to logged-in accounts without an active user entry (spec journal-access). */
@Component({
  selector: 'app-no-access-page',
  imports: [MatCardModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrapper">
      <mat-card>
        <mat-card-header><mat-card-title>Kein Zugang</mat-card-title></mat-card-header>
        <mat-card-content>
          <p>Das Konto <strong>{{ session.user()?.email }}</strong> hat keinen Zugang zum Journalblatt.</p>
          <p class="muted">Bitte wende dich an eine Administratorin oder einen Administrator.</p>
          <button mat-flat-button type="button" (click)="logout()">Abmelden</button>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: `
    .wrapper { display: flex; justify-content: center; padding: 32px 16px; }
    mat-card { width: 100%; max-width: 420px; }
  `,
})
export class NoAccessPage {
  protected readonly session = inject(SessionService);
  private readonly router = inject(Router);

  async logout(): Promise<void> {
    await this.session.logout();
    await this.router.navigate(['/login']);
  }
}
