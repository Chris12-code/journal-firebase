import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MAT_DIALOG_DATA, MatDialog, MatDialogModule} from '@angular/material/dialog';
import {firstValueFrom} from 'rxjs';

export interface ConfirmData {
  title: string;
  message: string;
  confirmLabel: string;
}

/** Yes/no question, e.g. before deleting. Closes with `true` when confirmed. */
@Component({
  selector: 'app-confirm-dialog',
  imports: [MatButtonModule, MatDialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content><p>{{ data.message }}</p></mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false" type="button">Abbrechen</button>
      <button mat-flat-button class="danger" [mat-dialog-close]="true" type="button" cdkFocusInitial>{{ data.confirmLabel }}</button>
    </mat-dialog-actions>
  `,
  styles: `
    .danger { --mat-button-filled-container-color: #b00020; --mat-button-filled-label-text-color: #fff; }
  `,
})
export class ConfirmDialogComponent {
  protected readonly data = inject<ConfirmData>(MAT_DIALOG_DATA);
}

/** Opens the confirm dialog and resolves to true only when the user confirmed. */
export async function confirmAction(dialog: MatDialog, data: ConfirmData): Promise<boolean> {
  const ref = dialog.open<ConfirmDialogComponent, ConfirmData, boolean>(ConfirmDialogComponent, {data, width: '400px', maxWidth: '95vw'});
  return (await firstValueFrom(ref.afterClosed())) === true;
}
