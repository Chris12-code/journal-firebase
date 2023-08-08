import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { RescueOperation } from '../rescue-operation/rescue-operation';

@Component({
  selector: 'app-rescue-operation-dialog',
  templateUrl: './rescue-operation-dialog.component.html',
  styleUrls: ['./rescue-operation-dialog.component.css']
})
export class RescueOperationDialogComponent {

  private backupOperation: Partial<RescueOperation> = {...this.data.rescueOperation};

  constructor(
    public dialogRef: MatDialogRef<RescueOperationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RescueOperationDialogData
  ) { }

  cancel(): void {
    this.data.rescueOperation.operationalLocation = this.backupOperation.operationalLocation;
    this.data.rescueOperation.destinationLocation = this.backupOperation.destinationLocation;
    this.dialogRef.close(this.data);
  }

}

export interface RescueOperationDialogData {
  rescueOperation: Partial<RescueOperation>;
  enableDelete: boolean;
}

export interface RescueOperationDialogResult {
  rescueOperation: RescueOperation;
  delete?: boolean;
}
