import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {UserAdminService} from '../../application/user-admin.service';
import {USER_ROLE_LABELS, USER_ROLES, UserEntry, UserRole} from '../../domain/user';

export interface UserDialogData {
  /** Missing when adding a new user. */
  user?: UserEntry;
}

/** Adds a user (email, initial password, name, role) or changes name, role and active flag (spec journal-access). */
@Component({
  selector: 'app-user-dialog',
  imports: [FormsModule, MatButtonModule, MatDialogModule, MatInputModule, MatSelectModule, MatSlideToggleModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ user ? 'Benutzer bearbeiten' : 'Benutzer hinzufügen' }}</h2>
    <form (ngSubmit)="save()">
      <mat-dialog-content>
        <div class="dialog-form">
          <mat-form-field>
            <mat-label>E-Mail</mat-label>
            <input matInput type="email" name="email" [(ngModel)]="email" [readonly]="!!user" required autocomplete="off">
            @if (user) {
              <mat-hint>Die E-Mail-Adresse kann nicht geändert werden.</mat-hint>
            }
          </mat-form-field>
          @if (!user) {
            <mat-form-field>
              <mat-label>Anfangspasswort</mat-label>
              <input matInput type="text" name="password" [(ngModel)]="password" required minlength="6" autocomplete="new-password">
              <mat-hint>Mindestens 6 Zeichen. Später über „Passwort zurücksetzen“ änderbar.</mat-hint>
            </mat-form-field>
          }
          <mat-form-field>
            <mat-label>Name</mat-label>
            <input matInput name="name" [(ngModel)]="name" required>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Rolle</mat-label>
            <mat-select name="role" [(ngModel)]="role" [disabled]="restrictions.roleLocked">
              @for (r of roles; track r) {
                <mat-option [value]="r">{{ roleLabels[r] }}</mat-option>
              }
            </mat-select>
            @if (restrictions.roleLocked) {
              <mat-hint>Die eigene Rolle kann man nicht ändern.</mat-hint>
            }
          </mat-form-field>
          @if (user) {
            <mat-slide-toggle name="active" [(ngModel)]="active" [disabled]="restrictions.activeLocked">Aktiv</mat-slide-toggle>
          }
          @if (error()) {
            <p class="error-text">{{ error() }}</p>
          }
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Abbrechen</button>
        <button mat-flat-button type="submit" [disabled]="busy()">Speichern</button>
      </mat-dialog-actions>
    </form>
  `,
})
export class UserDialogComponent {
  private readonly data = inject<UserDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<UserDialogComponent, boolean>);
  private readonly users = inject(UserAdminService);

  protected readonly user = this.data.user;
  protected readonly roles = USER_ROLES;
  protected readonly roleLabels = USER_ROLE_LABELS;
  protected readonly restrictions = this.user
    ? this.users.restrictions(this.user)
    : {roleLocked: false, activeLocked: false, canRemove: false};

  email = this.user?.email ?? '';
  password = '';
  name = this.user?.name ?? '';
  role: UserRole = this.user?.role ?? 'STATION';
  active = this.user?.active ?? true;

  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

  async save(): Promise<void> {
    this.busy.set(true);
    const error = this.user
      ? await this.users.change(this.user, {name: this.name, role: this.role, active: this.active})
      : await this.users.add({email: this.email, password: this.password, name: this.name, role: this.role});
    this.busy.set(false);
    this.error.set(error);
    if (!error) this.ref.close(true);
  }
}
