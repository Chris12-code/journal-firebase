import { Component } from '@angular/core';
import {CarTour} from "./model/car-tour";
import {addDoc, collection, collectionData, deleteDoc, doc, Firestore, updateDoc} from "@angular/fire/firestore";
import {TourType} from "./tour-modal/tour-modal.component";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  title = 'journal-firebase';

  tours: CarTour[] = [];

  teamView = false;
  operationsView = true;

  constructor(private firestore: Firestore) {
    this.getTours();
  }

  getTours(): CarTour[] {
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
            //this.dataSourceTours = new MatTableDataSource(this.tours);
          })
        });

    console.log('Tours: ', this.tours);
    return this.tours;
  }

  createTour(tour: CarTour) {
    const collectionInstance = collection(this.firestore, 'car-tour');
    const plainTour = {
      ...tour,
      driver: tour.driver ? { number: tour.driver.number, name: tour.driver.name, telephone: tour.driver.telephone, email: tour.driver.email } : null,
      tpf: tour.tpf ? { number: tour.tpf.number, name: tour.tpf.name, telephone: tour.tpf.telephone, email: tour.tpf.email } : null,
      third: tour.third ? { number: tour.third.number, name: tour.third.name, telephone: tour.third.telephone, email: tour.third.email } : null,
    };
    addDoc(collectionInstance, plainTour)
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

  updateTour(carTour: CarTour) {
    if (!carTour?.id) {
      console.log("Result invalid");
      return;
    }
    const docInstance = doc(this.firestore, 'car-tour', carTour.id);
    const updatedCarTour = {
      tourType: carTour.tourType,
      tourShift: carTour.tourShift,
      car: carTour.car,
      driver: carTour.driver,
      tpf: carTour.tpf,
      third: carTour.third,
      start: carTour.start,
      end: carTour.end,
    }
    const plainTour = {
      ...updatedCarTour,
      driver: carTour.driver ? { number: carTour.driver.number, name: carTour.driver.name, telephone: carTour.driver.telephone, email: carTour.driver.email } : null,
      tpf: carTour.tpf ? { number: carTour.tpf.number, name: carTour.tpf.name, telephone: carTour.tpf.telephone, email: carTour.tpf.email } : null,
      third: carTour.third ? { number: carTour.third.number, name: carTour.third.name, telephone: carTour.third.telephone, email: carTour.third.email } : null,
    };

    updateDoc(docInstance, plainTour)
        .then(() => {
          console.log('data updated');
        })
        .catch((e) => {
          console.log(e);
        })
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

  activateTeamView(): void {
    this.operationsView = false;
    this.teamView = true;
  }

  activateOperationsView(): void {
    this.teamView = false;
    this.operationsView = true;
  }
}
