import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { RescueOperation, Patient, RescueCategory, RescueType } from './rescue-operation/rescue-operation';
import { Observable, isEmpty } from 'rxjs';
import { Firestore, collection, addDoc, collectionData, doc, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { RescueOperationDialogComponent, RescueOperationDialogResult } from './rescue-operation-dialog/rescue-operation-dialog.component';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  dataSource: MatTableDataSource<RescueOperation>;

  title = 'journal-firebase';
  operations!: Observable<any>;
  rescueOperations: RescueOperation[] = [];
  displayedColumns: string[] = ['rescueType', 'rescueCategory', 'patient', 
    'operationalLocation', 'destinationLocation', 'action'
  ];


  constructor(private dialog: MatDialog, private firestore: Firestore) {
    this.getRescueOperations();
    this.dataSource = new MatTableDataSource(this.rescueOperations);
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

  getRescueOperations() {
    const collectionInstance = collection(this.firestore, 'rescue-operation');
    var tempRescueOperations: any[] = [];
    collectionData(collectionInstance, { idField: 'id' })
      .subscribe(val => {
        console.log(val);
        this.rescueOperations = []
        val.forEach(element => {
          let temp = new RescueOperation(
            element["rescueType"], element["rescueCategory"], element["patient"], element["operationalLocation"], element["destinationLocation"]);
          //let temp = new RescueOperation(element["id"], Patient.CHILD, RescueType.RD, RescueCategory.CHILD,  element["operationalLocation"], element["destinationLocation"]);
          this.rescueOperations.push(temp);
          this.dataSource = new MatTableDataSource(this.rescueOperations);
        })
        console.log(this.rescueOperations)
    });

    this.operations = collectionData(collectionInstance, { idField: 'id' });
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
