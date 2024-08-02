import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { RescueOperation } from './model/rescue-operation';
import { Observable, isEmpty } from 'rxjs';
import { Firestore, collection, addDoc, collectionData, doc, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { RescueOperationDialogComponent, RescueOperationDialogResult } from './rescue-operation-modal/rescue-operation-dialog/rescue-operation-dialog.component';
import { MatTableDataSource } from '@angular/material/table';
import {Tour} from './model/tour';
import {Person} from './model/person';
// @ts-ignore
import * as personsData from '/Users/christoph/Documents/journal/new/journal-firebase/src/data/persons.json';
import {AddTourModalComponent, TourDialogResult} from "./tour-modal/add-tour-modal/add-tour-modal.component";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'journal-firebase';
  persons: Person[] = personsData;

  teamView = false;
  operationsView = true;

  activateTeamView(): void {
    this.operationsView = false;
    this.teamView = true;
  }

  activateOperationsView(): void {
    this.teamView = false;
    this.operationsView = true;
  }
}
