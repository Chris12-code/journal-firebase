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
            console.log('Tours changed', this.tours);
            this.dataSourceTours = new MatTableDataSource<CarTour>(this.tours);
        }
    }

    newTour(): void {
        const dialogRef = this.dialog.open(AddCarTourModalComponent, {
            width: '320px',
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

    updateTour(carTour: CarTour) {
        const dialogRef = this.dialog.open(AddCarTourModalComponent, {
            width: '320px',
            data: {
                tour: carTour,
            },
        });

        dialogRef
            .afterClosed()
            .subscribe((result: TourDialogResult|undefined) => {
                console.log('Data received');
                console.log(result);
                if(!result?.tour?.id) {
                    console.log("Result invalid");
                    return;
                }
                this.changeTour.emit(result.tour);
            });
    }

    deleteTour(tour: CarTour) {
        this.removeTour.emit(tour);
    }
}
