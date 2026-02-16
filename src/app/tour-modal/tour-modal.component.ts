import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from "@angular/core";
import {MatTableDataSource} from "@angular/material/table";
import {CarTour} from "../model/car-tour";
import {AddCarTourModalComponent, TourDialogResult} from "./car-tour/add-car-tour-modal/add-car-tour-modal.component";
import {MatDialog} from "@angular/material/dialog";

export enum TourType {
    RTW = 'RTW',
    KTW = 'KTW',
    BTW = 'BTW',
}

export enum TourShift {
    DAY = 'DAY',
    NIGHT = 'NIGHT',
}

@Component({
    selector: 'tour-modal',
    templateUrl: './tour-modal.component.html',
    styleUrls: ['./tour-modal.component.css'],
    standalone: false
})
export class TourModalComponent implements OnChanges{
    @Input() tours!: CarTour[];
    @Output() tourAdded = new EventEmitter<CarTour>();
    @Output() tourChanged = new EventEmitter<CarTour>();
    @Output() tourDeleted = new EventEmitter<CarTour>();

    protected readonly TourType = TourType;
    protected readonly TourShift = TourShift;

    dataSourceTours: MatTableDataSource<CarTour> = new MatTableDataSource<CarTour>();
    expandDayShift = false;
    expandNightShift = false;

    constructor(private dialog: MatDialog) {
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['tours']) {
            this.tours = changes['tours'].currentValue;
            this.dataSourceTours = new MatTableDataSource<CarTour>(this.tours);
        }
    }

    getToursByTypeShiftAndCar(tourType: string, tourShift: TourShift, car: string): CarTour[] {
        return this.tours.filter(tour => tour.tourType === tourType && tour.car === car && tour.tourShift === tourShift);
    }

    createTour(tour: CarTour) {
        this.tourAdded.emit(tour);
    }

    deleteTour(tour: CarTour) {
        this.tourDeleted.emit(tour);
    }

    updateTour(carTour: CarTour) {
        this.tourChanged.emit(carTour);
    }

    toggleExpansionDayShift() {
        this.expandDayShift = !this.expandDayShift;
    }

    toggleExpansionNightShift() {
        this.expandNightShift = !this.expandNightShift;
    }

    getCarNumbers(): string[] {
        const carNumbers: string[] = [];
        this.tours.forEach(tour => {
            if (tour.car && !carNumbers.includes(tour.car)) {
                carNumbers.push(tour.car);
            }
        });

        return carNumbers;
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

                //this.addTour.emit(result.tour);
                this.tourAdded.emit(result.tour);
            });
    }
}