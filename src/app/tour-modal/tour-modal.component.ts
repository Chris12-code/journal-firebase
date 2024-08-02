import {Component} from "@angular/core";
import {AddCarTourModalComponent, TourDialogResult} from "./car-tour/add-car-tour-modal/add-car-tour-modal.component";
import {addDoc, collection, collectionData, deleteDoc, doc, Firestore, updateDoc} from "@angular/fire/firestore";
import {MatDialog} from "@angular/material/dialog";
import {MatTableDataSource} from "@angular/material/table";
import {Tour} from "../model/tour";
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

    toursResponse!: Observable<any>;
    dataSourceTours: MatTableDataSource<Tour>;
    tours: Tour[] = [];
    expandDayShift = false;
    expandNightShift = false;

    constructor(private dialog: MatDialog, private firestore: Firestore) {
        this.getTours();
        this.dataSourceTours = new MatTableDataSource<Tour>(this.tours);
    }

    getToursByTypeShiftAndCar(tourType: string, tourShift: TourShift, car: string): Tour[] {
        console.log('getToursBy: ', tourType, '- ', this.tours.filter(tour => tour.type === tourType && tour.car === car && tour.tourShift === tourShift));
        return this.tours.filter(tour => tour.type === tourType && tour.car === car && tour.tourShift === tourShift);
    }

    getTours() {
        const collectionInstance = collection(this.firestore, 'tour');
        collectionData(collectionInstance, { idField: 'id' })
            .subscribe(val => {
                this.tours = []
                val.forEach(element => {
                    let temp = new Tour(
                        element['type'] != null ? element['type'] : null,
                        element['tourType'] != null ? element['tourType'] : null,
                        element['tourShift'] != null ? element['tourShift'] : null,
                        element["car"] != null ? element["car"] : null,
                        element["driver"],
                        element["tpf"] != null ? element["tpf"] : null,
                        element["third"] != null ? element["third"] : null
                    );
                    this.tours.push(temp);
                    this.dataSourceTours = new MatTableDataSource(this.tours);
                })
                console.log('Tours: ', this.tours);
                console.log('Data Source Tours: ', this.dataSourceTours);
            });

        this.toursResponse = collectionData(collectionInstance, { idField: 'id' });
    }

    createTour(tour: Tour) {
        const collectionInstance = collection(this.firestore, 'tour');
        addDoc(collectionInstance, tour)
            .then(() => {
                console.log('Data saved successfully');
            })
            .catch((e) => {
                console.log(e);
            });
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
            .subscribe((result: TourDialogResult | undefined) => {
                console.log('Data received');
                console.log(result);
                if (!result) {
                    console.log("Result invalid");
                    return;
                }

                const collectionInstance = collection(this.firestore, 'tour');
                addDoc(collectionInstance, result.tour).then(() => {
                    console.log('Data saved successfully');
                })
                    .catch((e) => {
                        console.log(e);
                    });

            });
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

    deleteRescueOperation(id: string) {
        const docInstance = doc(this.firestore, 'rescue-operation', id);
        deleteDoc(docInstance)
            .then(() => {
                console.log('data is deleted');
            })
            .catch((e) => {
                console.log(e);
            })
    }

    protected readonly TourType = TourType;
    protected readonly TourShift = TourShift;

    toggleExpansionDayShift() {
        this.expandDayShift = !this.expandDayShift;
    }

    toggleExpansionNightShift() {
        this.expandNightShift = !this.expandNightShift;
    }
}