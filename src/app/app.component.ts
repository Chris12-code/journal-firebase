import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { RescueOperation, Patient, RescueCategory, RescueType } from './model/rescue-operation';
import { Observable, isEmpty } from 'rxjs';
import { Firestore, collection, addDoc, collectionData, doc, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { RescueOperationDialogComponent, RescueOperationDialogResult } from './rescue-operation-dialog/rescue-operation-dialog.component';
import { MatTableDataSource } from '@angular/material/table';
import {Tour} from './model/tour';
import {Person} from './model/person';
// @ts-ignore
import * as personsData from '/Users/christoph/Documents/journal/new/journal-firebase/src/data/persons.json';
import {TourDialogComponent, TourDialogResult} from "./tour-dialog/tour-dialog.component";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  dataSourceRescueOperations: MatTableDataSource<RescueOperation>;
  dataSourceTours: MatTableDataSource<Tour>;
  
  title = 'journal-firebase';
  operations!: Observable<any>;
  rescueOperations: RescueOperation[] = [];
  toursResponse!: Observable<any>;
  tours: Tour[] = [];
  persons: Person[] = personsData;
  displayedColumnsRescueOperations: string[] = ['rescueType', 'rescueCategory', 'patient',
    'operationalLocation', 'destinationLocation', 'action'
  ];
  displayedColumnsTours: string[] = ['driver', 'tpf', 'third', 'action'];

  teamView = false;
  operationsView = true;


  constructor(private dialog: MatDialog, private firestore: Firestore) {
    this.getRescueOperations();
    this.getTours();
    this.dataSourceRescueOperations = new MatTableDataSource(this.rescueOperations);
    this.dataSourceTours = new MatTableDataSource<Tour>(this.tours);
  }

  activateTeamView(): void {
    this.operationsView = false;
    this.teamView = true;
  }

  activateOperationsView(): void {
    this.teamView = false;
    this.operationsView = true;
  }

  newTourRtwDay(): void {
    const dialogRef = this.dialog.open(TourDialogComponent, {
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
          this.rescueOperations.push(temp);
          this.dataSourceRescueOperations = new MatTableDataSource(this.rescueOperations);
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
