import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatInputModule} from '@angular/material/input';
import {Router} from '@angular/router';
import {SessionService} from '../../application/session.service';

@Component({
  selector: 'app-login-page',
  imports: [FormsModule, MatCardModule, MatInputModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrapper">
      <mat-card>
        <mat-card-header><mat-card-title>Login</mat-card-title></mat-card-header>
        <mat-card-content>
          <p class="muted">Bitte mit dem persönlichen Konto anmelden.</p>
          <form (ngSubmit)="login()">
            <mat-form-field class="full-width">
              <mat-label>E-Mail</mat-label>
              <input matInput type="email" [(ngModel)]="email" name="email" autocomplete="username" required>
            </mat-form-field>
            <mat-form-field class="full-width">
              <mat-label>Passwort</mat-label>
              <input matInput type="password" [(ngModel)]="password" name="password" autocomplete="current-password" required>
            </mat-form-field>
            @if (error()) {
              <p class="error-text">{{ error() }}</p>
            }
            <button mat-flat-button type="submit" [disabled]="busy()">Login</button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: `
    .wrapper { display: flex; justify-content: center; padding: 32px 16px; }
    mat-card { width: 100%; max-width: 380px; }
  `,
})
export class LoginPage {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);

  async login(): Promise<void> {
    this.busy.set(true);
    this.error.set(await this.session.login(this.email, this.password));
    this.busy.set(false);
    if (!this.error()) await this.router.navigate(['/']);
  }
}
