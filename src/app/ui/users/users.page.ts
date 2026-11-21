import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatDialog} from '@angular/material/dialog';
import {MatIconModule} from '@angular/material/icon';
import {MatSnackBar} from '@angular/material/snack-bar';
import {UserAdminService} from '../../application/user-admin.service';
import {USER_ROLE_LABELS, UserEntry} from '../../domain/user';
import {confirmAction} from '../shared/confirm-dialog.component';
import {openForm} from '../shared/dialogs';
import {UserDialogComponent, UserDialogData} from './user-dialog.component';

/** User maintenance for admins (spec journal-access): list, add, change, password reset, remove. */
@Component({
  selector: 'app-users-page',
  imports: [MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-header">
        <h2>Benutzer</h2>
        <button mat-flat-button type="button" (click)="add()"><mat-icon>person_add</mat-icon> Benutzer hinzufügen</button>
      </div>
      <p class="muted">
        Nur Konten mit einem aktiven Eintrag haben Zugang. „Station“ ist das gemeinsame Login für den Dienst,
        „Administrator“ sieht zusätzlich den Jahresbericht und die Benutzer.
      </p>

      <div class="table-wrapper">
        <table class="users">
          <thead><tr><th>Name</th><th>E-Mail</th><th>Rolle</th><th>Status</th><th></th></tr></thead>
          <tbody>
            @for (u of service.users(); track u.uid) {
              <tr [class.inactive]="!u.active">
                <td>{{ u.name }} @if (isSelf(u)) { <span class="muted">(du)</span> }</td>
                <td>{{ u.email }}</td>
                <td>{{ roleLabels[u.role] }}</td>
                <td>{{ u.active ? 'aktiv' : 'inaktiv' }}</td>
                <td class="actions">
                  <button mat-icon-button type="button" (click)="edit(u)" title="Bearbeiten" aria-label="Bearbeiten">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button type="button" (click)="resetPassword(u)" title="Passwort zurücksetzen" aria-label="Passwort zurücksetzen">
                    <mat-icon>lock_reset</mat-icon>
                  </button>
                  @if (!isSelf(u)) {
                    <button mat-icon-button type="button" (click)="remove(u)" title="Entfernen" aria-label="Entfernen">
                      <mat-icon>delete</mat-icon>
                    </button>
                  }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="muted">Keine Benutzer.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: `
    .table-wrapper { overflow-x: auto; }
    .users { width: 100%; border-collapse: collapse; }
    .users th, .users td { text-align: left; padding: 6px 8px; border-bottom: 1px solid rgba(0, 0, 0, .12); }
    .users td.actions { white-space: nowrap; text-align: right; }
    .users tr.inactive td:not(.actions) { color: rgba(0, 0, 0, .45); }
  `,
})
export class UsersPage {
  protected readonly service = inject(UserAdminService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  protected readonly roleLabels = USER_ROLE_LABELS;

  protected isSelf(u: UserEntry): boolean {
    return !this.service.restrictions(u).canRemove;
  }

  add(): void {
    openForm<UserDialogComponent, UserDialogData>(this.dialog, this.snack, UserDialogComponent, {data: {}, width: '480px'});
  }

  edit(user: UserEntry): void {
    openForm<UserDialogComponent, UserDialogData>(this.dialog, this.snack, UserDialogComponent, {data: {user}, width: '480px'});
  }

  async resetPassword(user: UserEntry): Promise<void> {
    const ok = await confirmAction(this.dialog, {
      title: 'Passwort zurücksetzen',
      message: `Eine E-Mail zum Zurücksetzen des Passworts wird an ${user.email} gesendet.`,
      confirmLabel: 'Senden',
    });
    if (!ok) return;
    const error = await this.service.sendPasswordReset(user);
    this.snack.open(error ?? `E-Mail an ${user.email} gesendet`, undefined, {duration: error ? 5000 : 3000});
  }

  async remove(user: UserEntry): Promise<void> {
    const ok = await confirmAction(this.dialog, {
      title: 'Benutzer entfernen',
      message: `${user.name} (${user.email}) verliert jeden Zugang zum Journalblatt. Das Login selbst bleibt bestehen und kann nur in der Firebase-Konsole gelöscht werden.`,
      confirmLabel: 'Entfernen',
    });
    if (!ok) return;
    const error = await this.service.remove(user);
    this.snack.open(error ?? 'Entfernt', undefined, {duration: error ? 5000 : 3000});
  }
}
