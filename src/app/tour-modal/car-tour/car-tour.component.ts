import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from "@angular/core";
import {Tour} from "../../model/tour";
import {TourShift, TourType} from "../tour-modal.component";
import {AddCarTourModalComponent, TourDialogResult} from "./add-car-tour-modal/add-car-tour-modal.component";
import {MatDialog} from "@angular/material/dialog";
import {MatTableDataSource} from "@angular/material/table";

@Component({
    selector: 'car-tour',
    templateUrl: './car-tour.component.html',
    styleUrls: ['./car-tour.component.css'],
})
export class CarTourComponent implements OnChanges {
    @Input() tourType!: TourType;
    @Input() tourShift!: TourShift;
    @Input() car!: string;
    @Input() tours!: Tour[]
    @Output() changeTour = new EventEmitter<Tour>();
    @Output() addTour = new EventEmitter<Tour>();

    dataSourceTours: MatTableDataSource<Tour> = new MatTableDataSource<Tour>();
    displayedColumnsTours: string[] = ['driver', 'tpf', 'third', 'action'];

    constructor(private dialog: MatDialog) {
    }

    ngOnChanges(changes: SimpleChanges) {
        if(changes['tours']) {
            this.dataSourceTours = new MatTableDataSource<Tour>(this.tours);
        }
    }

    newTour(): void {
        const dialogRef = this.dialog.open(AddCarTourModalComponent, {
            width: '270px',
            data: {
                tour: {},
            },
        });

        dialogRef
            .afterClosed()
            .subscribe((result: TourDialogResult|undefined) => {
                console.log('Data received');
                console.log(result);
                if(!result) {
                    console.log("Result invalid");
                    return;
                }

                this.addTour.emit(result.tour);
            });
    }

    updateTour(tourId: string) {
        console.log('Update Tour: ', tourId);
    }

    deleteTour(tourId: string) {
        console.log('Delete Tour: ', tourId);
    }
}