import {ComponentType} from '@angular/cdk/portal';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';

/** Opens a form dialog and shows "Gespeichert" when it closes with a result (saved). */
export function openForm<C, D>(dialog: MatDialog, snack: MatSnackBar, component: ComponentType<C>, config: MatDialogConfig<D>): void {
  dialog
    .open<C, D, unknown>(component, {maxWidth: '95vw', ...config})
    .afterClosed()
    .subscribe(result => {
      if (result) snack.open('Gespeichert', undefined, {duration: 3000});
    });
}
