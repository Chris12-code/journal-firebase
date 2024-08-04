import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { RescueOperation } from '../../model/rescue-operation';

export interface RescueOperationDialogData {
  rescueOperation: Partial<RescueOperation>;
  enableDelete: boolean;
}

export interface RescueOperationDialogResult {
  rescueOperation: RescueOperation;
  delete?: boolean;
}


@Component({
  selector: 'app-rescue-operation-dialog',
  templateUrl: './rescue-operation-dialog.component.html',
  styleUrls: ['./rescue-operation-dialog.component.css']
})
export class RescueOperationDialogComponent {

  types = ['NA', 'RD', 'KT'];
  categories = ['CPR', 'VU', 'Kinder']
  patients = ['Mann', 'Frau', 'Kind'];

  rescueOperation = new RescueOperation();

  constructor(
    public dialogRef: MatDialogRef<RescueOperationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RescueOperationDialogResult
  ) {
    this.rescueOperation = { ...data.rescueOperation } as RescueOperation;
  }

  submitted = false;

  onSubmit() { this.submitted = true; }

  newOperation() {
    this.data.rescueOperation.rescueType = this.rescueOperation.rescueType;
    this.data.rescueOperation.rescueCategory = this.rescueOperation.rescueCategory;
    this.data.rescueOperation.patient = this.rescueOperation.patient;
    this.data.rescueOperation.operationalLocation = this.rescueOperation.operationalLocation;
    this.data.rescueOperation.destinationLocation = this.rescueOperation.destinationLocation;
    this.dialogRef.close(this.data);
  }

  updateOperation() {
    this.data.rescueOperation.id = this.rescueOperation.id;
    this.data.rescueOperation.rescueType = this.rescueOperation.rescueType;
    this.data.rescueOperation.rescueCategory = this.rescueOperation.rescueCategory;
    this.data.rescueOperation.patient = this.rescueOperation.patient;
    this.data.rescueOperation.operationalLocation = this.rescueOperation.operationalLocation;
    this.data.rescueOperation.destinationLocation = this.rescueOperation.destinationLocation;
    this.dialogRef.close(this.data);
  }
}
