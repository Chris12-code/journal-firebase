import {Component, Inject, ViewChild} from '@angular/core';
import {Tour} from "../../model/tour";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {RescueOperationDialogResult} from "../../rescue-operation-modal/rescue-operation-dialog/rescue-operation-dialog.component";

export interface TourDialogResult {
    tour: Tour;
    delete?: boolean;
}

@Component({
    selector: 'add-tour-modal',
    templateUrl: './add-tour-modal.component.html',
    styleUrls: ['./add-tour-modal.component.css'],
})
export class AddTourModalComponent {

    @ViewChild('pickerStart') pickerStart: any;
    @ViewChild('pickerEnd') pickerEnd: any;

    types = ['RTW', 'KTW', 'BTW'];

    tour = new Tour();

    constructor(
        public dialogRef: MatDialogRef<AddTourModalComponent>,
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
