import {Component} from "@angular/core";
import {AddTourModalComponent, TourDialogResult} from "./add-tour-modal/add-tour-modal.component";
import {addDoc, collection, collectionData, deleteDoc, doc, Firestore, updateDoc} from "@angular/fire/firestore";
import {MatDialog} from "@angular/material/dialog";
import {MatTableDataSource} from "@angular/material/table";
import {Tour} from "../model/tour";
import {Observable} from "rxjs";

@Component({
    selector: 'tour-modal',
    templateUrl: './tour-modal.component.html',
    styleUrls: ['./tour-modal.component.css'],
})
export class TourModalComponent {

    toursResponse!: Observable<any>;
    dataSourceTours: MatTableDataSource<Tour>;
    tours: Tour[] = [];
    displayedColumnsTours: string[] = ['driver', 'tpf', 'third', 'action'];

    constructor(private dialog: MatDialog, private firestore: Firestore) {
        this.getTours();
        this.dataSourceTours = new MatTableDataSource<Tour>(this.tours);
    }

    getTours() {
        const collectionInstance = collection(this.firestore, 'tour');
        var tempTours: any[] = [];
        collectionData(collectionInstance, { idField: 'id' })
            .subscribe(val => {
                console.log(val);
                this.tours = []
                val.forEach(element => {
                    let temp = new Tour(
                        element["driver"], element["tpf"] != null ? element["tpf"] : null, element["third"] != null ? element["third"] : null);
                    this.tours.push(temp);
                    this.dataSourceTours = new MatTableDataSource(this.tours);
                })
                console.log(this.tours)
            });

        this.toursResponse = collectionData(collectionInstance, { idField: 'id' });
    }

    newTour(): void {
        const dialogRef = this.dialog.open(AddTourModalComponent, {
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

}