import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {AppComponent} from './app.component';

import {MatTableModule} from '@angular/material/table'
import {MatCardModule} from '@angular/material/card';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatDialogModule} from '@angular/material/dialog';
import {MatInputModule} from '@angular/material/input';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {RescueOperationDialogComponent} from './rescue-operation-modal/rescue-operation-dialog/rescue-operation-dialog.component';
import {environment} from 'src/environments/environment';
import {provideFirestore} from '@angular/fire/firestore';
import {initializeApp, getApp} from 'firebase/app';
import {provideFirebaseApp} from '@angular/fire/app';
import {getAuth as firebaseGetAuth} from 'firebase/auth';
import {getFirestore as firebaseGetFirestore} from 'firebase/firestore';
import {AddCarTourModalComponent} from './tour-modal/car-tour/add-car-tour-modal/add-car-tour-modal.component';
import {MatDatepickerModule} from "@angular/material/datepicker";
import {MatRadioModule} from "@angular/material/radio";
import {MatSelectModule} from "@angular/material/select";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatNativeDateModule} from '@angular/material/core';
import {TourModalComponent} from "./tour-modal/tour-modal.component";
import {RescueOperationModalComponent} from "./rescue-operation-modal/rescue-operation-modal.component";
import {CarTourComponent} from "./tour-modal/car-tour/car-tour.component";
import {MatGridListModule} from "@angular/material/grid-list";
import {MatAutocompleteModule} from "@angular/material/autocomplete";
import {provideAuth} from "@angular/fire/auth";

@NgModule({
    declarations: [
        AppComponent,
        RescueOperationDialogComponent,
        AddCarTourModalComponent,
        TourModalComponent,
        RescueOperationModalComponent,
        RescueOperationDialogComponent,
        CarTourComponent,
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        FormsModule,
        ReactiveFormsModule,
        MatInputModule,
        MatDialogModule,
        MatButtonModule,
        MatCardModule,
        MatToolbarModule,
        MatIconModule,
        MatTableModule,
        MatDatepickerModule,
        MatRadioModule,
        MatSelectModule,
        MatCheckboxModule,
        MatNativeDateModule,
        MatGridListModule,
        MatAutocompleteModule,
    ],
    providers: [
        MatDatepickerModule,
        MatNativeDateModule,
        provideFirebaseApp(() => initializeApp(environment.firebase)),
        provideAuth(() => firebaseGetAuth(getApp())),
        provideFirestore(() => firebaseGetFirestore(getApp())),
    ],
    bootstrap: [AppComponent]
})
export class AppModule {
}
