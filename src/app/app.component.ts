import {Component, OnInit} from '@angular/core';
import {CarTour} from "./model/car-tour";
import {collection, addDoc, deleteDoc, doc, updateDoc, getFirestore} from "firebase/firestore";
import {collectionData} from "@angular/fire/firestore";
import {getApp} from "firebase/app";
import {TourType} from "./tour-modal/tour-modal.component";
import {LoginComponent, LoginDialogResult} from "./auth/login-modal.component";
import {MatDialog} from "@angular/material/dialog";
import {AuthService} from "./lib/auth.service";
import {User} from '@angular/fire/auth';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    standalone: false
})
export class AppComponent implements OnInit{
  title = 'journal-firebase';

  tours: CarTour[] = [];

  teamView = false;
  operationsView = true;

  user: User | null = null;

  private firestore = getFirestore(getApp());

  constructor(private dialog: MatDialog, private authService: AuthService) {}

  ngOnInit() {
    this.authService.user$.subscribe(user => {
      this.user = user;
      if (user) {
          this.getTours();
      }
    });
  }

  getTours(): CarTour[] {
    const collectionInstance = collection(this.firestore, 'car-tour');
    collectionData(collectionInstance, { idField: 'id' })
        .subscribe(val => {
          this.tours = []
          val.forEach(element => {
            let temp = new CarTour(
                element['id'],
                element['tourType'] as TourType ?? undefined,
                element['tourShift'] != null ? element['tourShift'] : null,
                element["car"] != null ? element["car"] : null,
                element["driver"],
                element["tpf"] != null ? element["tpf"] : null,
                element["third"] != null ? element["third"] : null,
                element["start"] != null ? element["start"] : null,
                element["end"] != null ? element["end"] : null
            );

            const tourStart = new Date(element["start"].seconds * 1000);
            if (temp.start && tourStart.getTime() > Date.now() - 20 * 60 * 60 * 1000) {
              this.tours.push(temp);
            }
          })
        });

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
    addDoc(collectionInstance, plainTour);
  }

  deleteTour(tour: CarTour) {
    if (!tour.id) {
      return;
    }
    const docInstance = doc(this.firestore, 'car-tour', tour.id);
    deleteDoc(docInstance);
  }

  updateTour(carTour: CarTour) {
    if (!carTour?.id) {
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

    updateDoc(docInstance, plainTour);
  }

  activateTeamView(): void {
    this.operationsView = false;
    this.teamView = true;
  }

  activateOperationsView(): void {
    this.teamView = false;
    this.operationsView = true;
  }

  login() {
    const dialogRef = this.dialog.open(LoginComponent, {
      width: '300px',
      data: {
        userCredential: null,
      }
    });

    dialogRef
        .afterClosed()
        .subscribe((result: LoginDialogResult | undefined) => {
          if (!result?.userCredential) {
            return;
          }

          this.user = result.userCredential.user;
        });
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => {
        this.user = null;
      },
    });
  }
}
