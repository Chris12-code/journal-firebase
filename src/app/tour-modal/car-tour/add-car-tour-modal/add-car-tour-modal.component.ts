import {Component, Inject, ViewChild} from '@angular/core';
import {CarTour} from "../../../model/car-tour";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {TourShift, TourType} from "../../tour-modal.component";

export interface TourDialogResult {
    tour: CarTour;
    delete?: boolean;
}

@Component({
    selector: 'add-tour-modal',
    templateUrl: './add-car-tour-modal.component.html',
    styleUrls: ['./add-car-tour-modal.component.css'],
})
export class AddCarTourModalComponent {

    @ViewChild('pickerStart') pickerStart: any;
    @ViewChild('pickerEnd') pickerEnd: any;

    tour = new CarTour();

    constructor(
        public dialogRef: MatDialogRef<AddCarTourModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: TourDialogResult
    ) {
        this.tour = { ...data.tour } as CarTour;
    }

    submitted = false;

    onSubmit() {
        this.submitted = true;
    }

    newTour() {
        this.data.tour.tourType = this.tour.tourType;
        this.data.tour.tourShift = TourShift.DAY
        this.data.tour.car = '44.201';
        this.data.tour.driver = this.tour.driver;
        this.data.tour.tpf = this.tour.tpf;
        this.data.tour.third = this.tour.third;
        this.dialogRef.close(this.data);
    }

    getTourTypes(): string[] {
        return Object.values(TourType);
    }
}
