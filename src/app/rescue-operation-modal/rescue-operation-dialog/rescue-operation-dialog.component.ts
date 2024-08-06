import {Component, Inject, OnInit} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { RescueOperation } from '../../model/rescue-operation';
import {CarTour} from "../../model/car-tour";
import {FormControl} from "@angular/forms";
import {map, Observable, startWith} from "rxjs";

export interface RescueOperationDialogData {
  rescueOperation: Partial<RescueOperation>;
  enableDelete: boolean;
}

export interface RescueOperationDialogResult {
  rescueOperation: RescueOperation;
  delete?: boolean;
  tours: CarTour[];
}


@Component({
  selector: 'app-rescue-operation-dialog',
  templateUrl: './rescue-operation-dialog.component.html',
  styleUrls: ['./rescue-operation-dialog.component.css'],
})
export class RescueOperationDialogComponent implements OnInit{

  types = ['NA', 'RD', 'KT'];
  categories = ['CPR', 'VU', 'Kinder']
  patients = ['Mann', 'Frau', 'Kind'];

  rescueOperation = new RescueOperation();
  tours: CarTour[];
  tourControl = new FormControl();
  filteredTours!: Observable<CarTour[]>;

  constructor(
    public dialogRef: MatDialogRef<RescueOperationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RescueOperationDialogResult,
  ) {
    this.rescueOperation = { ...data.rescueOperation } as RescueOperation;
    this.tours = data.tours;
  }

  ngOnInit() {
    if (this.rescueOperation.tour) {
      this.tourControl.setValue(this.rescueOperation.tour);
    }

    this.filteredTours = this.tourControl.valueChanges.pipe(
        startWith(''),
        map(value => this._filterTours(value)),
    );
  }

  private _filterTours(value: string): CarTour[] {
    const filterValue = value.toLowerCase();
    return this.tours
        .filter(tour =>
            (
                tour?.car?.toLowerCase().includes(filterValue) ||
                tour?.driver?.name.toLowerCase().includes(filterValue) ||
                tour?.tpf?.name.toLowerCase().includes(filterValue) ||
                tour?.third?.name.toLowerCase().includes(filterValue)
            )
        );
  }

  submitted = false;

  onSubmit() { this.submitted = true; }

  newOperation() {
    this.data.rescueOperation.rescueType = this.rescueOperation.rescueType;
    this.data.rescueOperation.rescueCategory = this.rescueOperation.rescueCategory;
    this.data.rescueOperation.patient = this.rescueOperation.patient;
    this.data.rescueOperation.operationalLocation = this.rescueOperation.operationalLocation;
    this.data.rescueOperation.destinationLocation = this.rescueOperation.destinationLocation;
    this.data.rescueOperation.tour = this.getTour(this.tourControl.value);
    this.dialogRef.close(this.data);
  }

  updateOperation() {
    this.data.rescueOperation.id = this.rescueOperation.id;
    this.data.rescueOperation.rescueType = this.rescueOperation.rescueType;
    this.data.rescueOperation.rescueCategory = this.rescueOperation.rescueCategory;
    this.data.rescueOperation.patient = this.rescueOperation.patient;
    this.data.rescueOperation.operationalLocation = this.rescueOperation.operationalLocation;
    this.data.rescueOperation.destinationLocation = this.rescueOperation.destinationLocation;
    this.data.rescueOperation.tour = this.getTour(this.tourControl.value);
    this.dialogRef.close(this.data);
  }

  getTour(searchTour: CarTour | undefined): CarTour | null {
    return this.tours.find(tour => tour.id === searchTour?.id) ?? null;
  }

  displayTour(tour: CarTour): string {
    return tour?.car ?? '';
  }
}
