import {Component} from "@angular/core";
import {addDoc, collection, collectionData, deleteDoc, doc, Firestore, updateDoc} from "@angular/fire/firestore";
import {MatDialog} from "@angular/material/dialog";
import {MatTableDataSource} from "@angular/material/table";
import {CarTour} from "../model/car-tour";
import {Observable} from "rxjs";

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
})
export class TourModalComponent {
    protected readonly TourType = TourType;
    protected readonly TourShift = TourShift;

    toursResponse!: Observable<any>;
    dataSourceTours: MatTableDataSource<CarTour>;
    tours: CarTour[] = [];
    expandDayShift = false;
    expandNightShift = false;

    constructor(private dialog: MatDialog, private firestore: Firestore) {
        this.getTours();
        this.dataSourceTours = new MatTableDataSource<CarTour>(this.tours);
    }

    getToursByTypeShiftAndCar(tourType: string, tourShift: TourShift, car: string): CarTour[] {
        return this.tours.filter(tour => tour.tourType === tourType && tour.car === car && tour.tourShift === tourShift);
    }

    getTours() {
        const collectionInstance = collection(this.firestore, 'car-tour');
        collectionData(collectionInstance, { idField: 'id' })
            .subscribe(val => {
                this.tours = []
                val.forEach(element => {
                    let temp = new CarTour(
                        element['id'],
                        element['tourType'] != null ? this.mapTourType(element['tourType']) : undefined,
                        element['tourShift'] != null ? element['tourShift'] : null,
                        element["car"] != null ? element["car"] : null,
                        element["driver"],
                        element["tpf"] != null ? element["tpf"] : null,
                        element["third"] != null ? element["third"] : null
                    );
                    this.tours.push(temp);
                    this.dataSourceTours = new MatTableDataSource(this.tours);
                })
            });

        this.toursResponse = collectionData(collectionInstance, { idField: 'id' });
    }

    createTour(tour: CarTour) {
        const collectionInstance = collection(this.firestore, 'car-tour');
        addDoc(collectionInstance, tour)
            .then(() => {
                console.log('Data saved successfully');
            })
            .catch((e) => {
                console.log(e);
            });
    }

    deleteTour(tour: CarTour) {
        console.log('Delete Tour: ', tour);
        if (!tour.id) {
            return;
        }
        const docInstance = doc(this.firestore, 'car-tour', tour.id);
        deleteDoc(docInstance)
            .then(() => {
                console.log('data is deleted');
            })
            .catch((e) => {
                console.log(e);
            })
    }

    updateRescueOperation(id: string) {
        const docInstance = doc(this.firestore, 'rescue-operation', id);
        const updateData = {
            destinationLocation: 'updatedDestination'
        }

        updateDoc(docInstance, updateData)
            .then(() => {
                console.log('data updated');
            })
            .catch((e) => {
                console.log(e);
            })
    }

    toggleExpansionDayShift() {
        this.expandDayShift = !this.expandDayShift;
    }

    toggleExpansionNightShift() {
        this.expandNightShift = !this.expandNightShift;
    }

    private mapTourType(tourType: string): TourType | undefined {
        switch (tourType) {
            case 'RTW':
                return TourType.RTW;
            case 'KTW':
                return TourType.KTW;
            case 'BTW':
                return TourType.BTW;
            default:
                return undefined;
        }
    }
}