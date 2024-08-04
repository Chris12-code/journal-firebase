import {Component} from "@angular/core";
import {
    RescueOperationDialogComponent,
    RescueOperationDialogResult
} from "./rescue-operation-dialog/rescue-operation-dialog.component";
import {addDoc, collection, collectionData, deleteDoc, doc, Firestore, updateDoc} from "@angular/fire/firestore";
import {MatTableDataSource} from "@angular/material/table";
import {RescueOperation} from "../model/rescue-operation";
import {MatDialog} from "@angular/material/dialog";
import {Observable} from "rxjs";

@Component({
    selector: 'rescue-operation-modal',
    templateUrl: './rescue-operation-modal.component.html',
    styleUrls: ['./rescue-operation-modal.component.css']
})
export class RescueOperationModalComponent {

    dataSourceRescueOperations: MatTableDataSource<RescueOperation>;
    rescueOperations: RescueOperation[] = [];
    operations!: Observable<any>;
    displayedColumnsRescueOperations: string[] = ['rescueType', 'rescueCategory', 'patient',
        'operationalLocation', 'destinationLocation', 'action'
    ];

    constructor(private dialog: MatDialog, private firestore: Firestore) {
        this.getRescueOperations();
        this.dataSourceRescueOperations = new MatTableDataSource(this.rescueOperations);
    }

    getRescueOperations() {
        const collectionInstance = collection(this.firestore, 'rescue-operation');
        collectionData(collectionInstance, { idField: 'id' })
            .subscribe(val => {
                console.log(val);
                this.rescueOperations = []
                val.forEach(element => {
                    let temp = new RescueOperation(
                        element['id'], element["rescueType"], element["rescueCategory"], element["patient"], element["operationalLocation"], element["destinationLocation"]);
                    this.rescueOperations.push(temp);
                    this.dataSourceRescueOperations = new MatTableDataSource(this.rescueOperations);
                })
                console.log(this.rescueOperations)
            });

        this.operations = collectionData(collectionInstance, { idField: 'id' });
    }

    newRescueOperation(): void {
        const dialogRef = this.dialog.open(RescueOperationDialogComponent, {
            width: '270px',
            data: {
                rescueOperation: {},
            },
        });

        dialogRef
            .afterClosed()
            .subscribe((result: RescueOperationDialogResult|undefined) => {
                console.log('Data received');
                console.log(result);
                if(!result) {
                    console.log("Result invalid");
                    return;
                }
                this.rescueOperations.push(result.rescueOperation);
                const collectionInstance = collection(this.firestore, 'rescue-operation');
                addDoc(collectionInstance, result.rescueOperation).then(() => {
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

    deleteRescueOperation(rescueOperation: RescueOperation) {
        console.log('Delete Rescue Operation: ', rescueOperation);
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