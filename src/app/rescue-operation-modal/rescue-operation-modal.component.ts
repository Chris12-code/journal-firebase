import {Component, Input} from "@angular/core";
import {DISPLAY_HOURS} from "../lib/constants";
import {
    RescueOperationDialogComponent,
    RescueOperationDialogResult
} from "./rescue-operation-dialog/rescue-operation-dialog.component";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getFirestore,
    query,
    updateDoc,
    where
} from "firebase/firestore";
import {collectionData} from "@angular/fire/firestore";
import {getApp} from "firebase/app";
import {MatTableDataSource} from "@angular/material/table";
import {RescueOperation} from "../model/rescue-operation";
import {MatDialog} from "@angular/material/dialog";
import {CarTour} from "../model/car-tour";

@Component({
    selector: 'rescue-operation-modal',
    templateUrl: './rescue-operation-modal.component.html',
    styleUrls: ['./rescue-operation-modal.component.css'],
    standalone: false
})
export class RescueOperationModalComponent {

    @Input() tours!: CarTour[]

    dataSourceRescueOperations: MatTableDataSource<RescueOperation>;
    rescueOperations: RescueOperation[] = [];
    displayedColumnsRescueOperations: string[] = ['rescueType', 'rescueCategory', 'patient',
        'operationalLocation', 'destinationLocation', 'tour', 'action'
    ];

    private firestore = getFirestore(getApp());

    constructor(private dialog: MatDialog) {
        this.getRescueOperationsFromLastDay();
        this.dataSourceRescueOperations = new MatTableDataSource(this.rescueOperations);
    }

    getRescueOperationsFromLastDay() {
        const now = new Date();
        const hoursAgo = new Date(now.getTime() - DISPLAY_HOURS * 60 * 60 * 1000);

        const collectionInstance = collection(this.firestore, 'rescue-operation');
        const q = query(collectionInstance, where('timeStamp', '>=', hoursAgo));

        collectionData(q, { idField: 'id' })
            .subscribe(val => {
                this.rescueOperations = [];
                if (val.length === 0) {
                    this.dataSourceRescueOperations = new MatTableDataSource(this.rescueOperations);
                    return;
                }
                val.forEach(element => {
                    const visibleUntilSeconds = element['tour']?.['visibleUntil']?.seconds;
                    if (visibleUntilSeconds != null && visibleUntilSeconds * 1000 <= Date.now()) {
                        return;
                    }

                    let temp = new RescueOperation(
                        element['id'],
                        element["rescueType"],
                        element["rescueCategory"],
                        element["patient"],
                        element["operationalLocation"],
                        element["destinationLocation"],
                        element["tour"],
                        element["timeStamp"],
                    );
                    this.rescueOperations.push(temp);
                    this.dataSourceRescueOperations = new MatTableDataSource(this.rescueOperations);
                });
            });

    }

    newRescueOperation(): void {
        const dialogRef = this.dialog.open(RescueOperationDialogComponent, {
            width: '320px',
            data: {
                rescueOperation: {},
                tours: this.tours,
            },
        });

        dialogRef
            .afterClosed()
            .subscribe((result: RescueOperationDialogResult | undefined) => {
                if (!result?.rescueOperation) {
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
                            end: result.rescueOperation.tour.end,
                            visibleUntil: result.rescueOperation.tour.visibleUntil ?? null,
                        }
                        : null,
                };

                this.rescueOperations.push(result.rescueOperation);
                const collectionInstance = collection(this.firestore, 'rescue-operation');
                addDoc(collectionInstance, plainRescueOperation);

            });
    }

    updateRescueOperation(rescueOperation: RescueOperation) {
        const dialogRef = this.dialog.open(RescueOperationDialogComponent, {
            width: '320px',
            data: {
                rescueOperation: rescueOperation,
                tours: this.tours,
            },
        });

        dialogRef
            .afterClosed()
            .subscribe((result: RescueOperationDialogResult | undefined) => {
                if (!result?.rescueOperation?.id) {
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
                            end: result.rescueOperation.tour.end,
                            visibleUntil: result.rescueOperation.tour.visibleUntil ?? null,
                        }
                        : null,
                };

                updateDoc(docInstance, plainRescueOperation);
            });
    }

    deleteRescueOperation(rescueOperation: RescueOperation) {
        if (!rescueOperation.id) {
            return;
        }
        const docInstance = doc(this.firestore, 'rescue-operation', rescueOperation.id);
        deleteDoc(docInstance);
    }

    displayTour(operation: RescueOperation): string {
        return operation?.tour?.car ? operation.tour.car : '';
    }
}
