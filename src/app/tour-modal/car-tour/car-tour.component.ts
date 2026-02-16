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
    standalone: false
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
    displayedColumnsTours: string[] = ['driver', 'tpf', 'third', 'start', 'end', 'action'];

    constructor(private dialog: MatDialog) {
    }

    ngOnChanges(changes: SimpleChanges) {
        if(changes['tours']) {
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
                if(!result) {
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
                if(!result?.tour?.id) {
                    return;
                }
                this.changeTour.emit(result.tour);
            });
    }

    deleteTour(tour: CarTour) {
        this.removeTour.emit(tour);
    }

    toDate(value: any): Date | null {
        if (!value) return null;
        if (typeof value.toDate === 'function') return value.toDate();
        return new Date(value);
    }
}
