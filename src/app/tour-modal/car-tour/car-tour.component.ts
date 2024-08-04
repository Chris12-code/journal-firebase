import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from "@angular/core";
import {CarTour} from "../../model/car-tour";
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
    @Input() tours!: CarTour[]
    @Output() changeTour = new EventEmitter<CarTour>();
    @Output() addTour = new EventEmitter<CarTour>();
    @Output() removeTour = new EventEmitter<CarTour>();

    dataSourceTours: MatTableDataSource<CarTour> = new MatTableDataSource<CarTour>();
    displayedColumnsTours: string[] = ['driver', 'tpf', 'third', 'action'];

    constructor(private dialog: MatDialog) {
    }

    ngOnChanges(changes: SimpleChanges) {
        if(changes['tours']) {
            this.dataSourceTours = new MatTableDataSource<CarTour>(this.tours);
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

    deleteTour(tour: CarTour) {
        this.removeTour.emit(tour);
    }
}