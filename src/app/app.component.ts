import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { RescueOperation } from './rescue-operation/rescue-operation';
import { RescueOperationDialogComponent, RescueOperationDialogResult } from './rescue-operation-dialog/rescue-operation-dialog.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'journal-firebase';

  operations: RescueOperation[] = [
    {
      id: '123',
      operationalLocation: 'whg1',
      destinationLocation: 'lkh1'
    },
    {
      id: '1234',
      operationalLocation: 'whg2',
      destinationLocation: 'lkh2'
    }
  ];

  constructor(private dialog: MatDialog) {}

  newRescueOperation(): void {
    console.log("before");
    const dialogRef = this.dialog.open(RescueOperationDialogComponent, {
      width: '270px',
      data: {
        rescueOperation: {},
      },
    });
    console.log("middle");
    dialogRef
      .afterClosed()
      .subscribe((result: RescueOperationDialogResult|undefined) => {
        if(!result) {
          return;
        }
        this.operations.push(result.rescueOperation);
      });
  }
}
