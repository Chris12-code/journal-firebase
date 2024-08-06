import {Component, Input} from "@angular/core";
import {
    RescueOperationDialogComponent,
    RescueOperationDialogResult
} from "./rescue-operation-dialog/rescue-operation-dialog.component";
import {addDoc, collection, collectionData, deleteDoc, doc, Firestore, updateDoc} from "@angular/fire/firestore";
import {MatTableDataSource} from "@angular/material/table";
import {RescueOperation} from "../model/rescue-operation";
import {MatDialog} from "@angular/material/dialog";
import {Observable} from "rxjs";
import {CarTour} from "../model/car-tour";

@Component({
    selector: 'rescue-operation-modal',
    templateUrl: './rescue-operation-modal.component.html',
    styleUrls: ['./rescue-operation-modal.component.css']
})
export class RescueOperationModalComponent {

    @Input() tours!: CarTour[]

    dataSourceRescueOperations: MatTableDataSource<RescueOperation>;
    rescueOperations: RescueOperation[] = [];
    operations!: Observable<any>;
    displayedColumnsRescueOperations: string[] = ['rescueType', 'rescueCategory', 'patient',
        'operationalLocation', 'destinationLocation', 'tour', 'action'
    ];

    constructor(private dialog: MatDialog, private firestore: Firestore) {
        this.getRescueOperations();
        this.dataSourceRescueOperations = new MatTableDataSource(this.rescueOperations);
    }

    getRescueOperations() {
        const collectionInstance = collection(this.firestore, 'rescue-operation');
        collectionData(collectionInstance, { idField: 'id' })
            .subscribe(val => {
                this.rescueOperations = [];
                if (val.length === 0) {
                    this.dataSourceRescueOperations = new MatTableDataSource(this.rescueOperations);
                    return
                }
                val.forEach(element => {
                    let temp = new RescueOperation(
                        element['id'],
                        element["rescueType"],
                        element["rescueCategory"],
                        element["patient"],
                        element["operationalLocation"],
                        element["destinationLocation"],
                        element["tour"],
                    );
                    this.rescueOperations.push(temp);
                    this.dataSourceRescueOperations = new MatTableDataSource(this.rescueOperations);
                })
            });

        this.operations = collectionData(collectionInstance, { idField: 'id' });
    }

    newRescueOperation(): void {
        const dialogRef = this.dialog.open(RescueOperationDialogComponent, {
            width: '270px',
            data: {
                rescueOperation: {},
                tours: this.tours,
            },
        });

        dialogRef
            .afterClosed()
            .subscribe((result: RescueOperationDialogResult | undefined) => {
                console.log('Data received');
                console.log(result);
                if (!result?.rescueOperation) {
                    console.log("Result invalid");
                    return;
                }

                const plainRescueOperation = {
                    ...result.rescueOperation,
                    tour: result.rescueOperation.tour ?
                        {
                            id: result.rescueOperation.tour.id,
                            tourType: result.rescueOperation.tour.tourType,
                            tourShift: result.rescueOperation.tour.tourShift,
                            car: result.rescueOperation.tour.car,
                            driver: result.rescueOperation.tour.driver ? { number: result.rescueOperation.tour.driver.number, name: result.rescueOperation.tour.driver.name, telephone: result.rescueOperation.tour.driver.telephone, email: result.rescueOperation.tour.driver.email } : null,
                            tpf: result.rescueOperation.tour.tpf ? { number: result.rescueOperation.tour.tpf.number, name: result.rescueOperation.tour.tpf.name, telephone: result.rescueOperation.tour.tpf.telephone, email: result.rescueOperation.tour.tpf.email } : null,
                            third: result.rescueOperation.tour.third ? { number: result.rescueOperation.tour.third.number, name: result.rescueOperation.tour.third.name, telephone: result.rescueOperation.tour.third.telephone, email: result.rescueOperation.tour.third.email } : null,
                            start: result.rescueOperation.tour.start,
                            end: result.rescueOperation.tour.end
                        }
                        : null,
                };

                this.rescueOperations.push(result.rescueOperation);
                const collectionInstance = collection(this.firestore, 'rescue-operation');
                addDoc(collectionInstance, plainRescueOperation).then(() => {
                    console.log('Data saved successfully');
                })
                    .catch((e) => {
                        console.log(e);
                    });

            });
    }

    updateRescueOperation(rescueOperation: RescueOperation) {
        const dialogRef = this.dialog.open(RescueOperationDialogComponent, {
            width: '270px',
            data: {
                rescueOperation: rescueOperation,
                tours: this.tours,
            },
        });

        dialogRef
            .afterClosed()
            .subscribe((result: RescueOperationDialogResult | undefined) => {
                if (!result?.rescueOperation?.id) {
                    console.log("Result invalid");
                    return;
                }

                const docInstance = doc(this.firestore, 'rescue-operation', result.rescueOperation.id);
                const updateRescueOperation = {
                    rescueType: result.rescueOperation.rescueType,
                    rescueCategory: result.rescueOperation.rescueCategory,
                    patient: result.rescueOperation.patient,
                    operationalLocation: result.rescueOperation.operationalLocation,
                    destinationLocation: result.rescueOperation.destinationLocation,
                    tour: result.rescueOperation.tour,
                }


                const plainRescueOperation = {
                    ...updateRescueOperation,
                    tour: result.rescueOperation.tour ?
                        {
                            id: result.rescueOperation.tour.id,
                            tourType: result.rescueOperation.tour.tourType,
                            tourShift: result.rescueOperation.tour.tourShift,
                            car: result.rescueOperation.tour.car,
                            driver: result.rescueOperation.tour.driver ? { number: result.rescueOperation.tour.driver.number, name: result.rescueOperation.tour.driver.name, telephone: result.rescueOperation.tour.driver.telephone, email: result.rescueOperation.tour.driver.email } : null,
                            tpf: result.rescueOperation.tour.tpf ? { number: result.rescueOperation.tour.tpf.number, name: result.rescueOperation.tour.tpf.name, telephone: result.rescueOperation.tour.tpf.telephone, email: result.rescueOperation.tour.tpf.email } : null,
                            third: result.rescueOperation.tour.third ? { number: result.rescueOperation.tour.third.number, name: result.rescueOperation.tour.third.name, telephone: result.rescueOperation.tour.third.telephone, email: result.rescueOperation.tour.third.email } : null,
                            start: result.rescueOperation.tour.start,
                            end: result.rescueOperation.tour.end
                        }
                        : null,
                };

                updateDoc(docInstance, plainRescueOperation)
                    .then(() => {
                        console.log('data updated');
                    })
                    .catch((e) => {
                        console.log(e);
                    })
            });
    }

    deleteRescueOperation(rescueOperation: RescueOperation) {
        if (!rescueOperation.id) {
            return;
        }
        const docInstance = doc(this.firestore, 'rescue-operation', rescueOperation.id);
        deleteDoc(docInstance)
            .then(() => {
                console.log('data is deleted');
            })
            .catch((e) => {
                console.log(e);
            })
    }
}