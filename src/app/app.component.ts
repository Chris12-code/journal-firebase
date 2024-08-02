import { Component } from '@angular/core';
import {Person} from './model/person';
// @ts-ignore
import * as personsData from '/Users/christoph/Documents/journal/new/journal-firebase/src/data/persons.json';

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
