import {Component, Inject, ViewChild} from '@angular/core';
import {Tour} from "../model/tour";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {RescueOperationDialogResult} from "../rescue-operation-dialog/rescue-operation-dialog.component";

export interface TourDialogResult {
    tour: Tour;
    delete?: boolean;
}

@Component({
    selector: 'app-tour-dialog',
    templateUrl: './tour-dialog.component.html',
    styleUrls: ['./tour-dialog.component.css'],
})
export class TourDialogComponent {

    @ViewChild('pickerStart') pickerStart: any;
    @ViewChild('pickerEnd') pickerEnd: any;

    types = ['RTW', 'KTW', 'BTW'];

    tour = new Tour();

    constructor(
        public dialogRef: MatDialogRef<TourDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: TourDialogResult
    ) {
    }

    submitted = false;

    onSubmit() {
        this.submitted = true;
    }

    newTour() {
        this.data.tour.type = this.tour.type;
        this.data.tour.driver = this.tour.driver;
        this.data.tour.tpf = this.tour.tpf;
        this.data.tour.third = this.tour.third;
        this.dialogRef.close(this.data);
    }

}
