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
import {provideFirestore, getFirestore} from '@angular/fire/firestore';
import {initializeApp} from 'firebase/app';
import {provideFirebaseApp} from '@angular/fire/app';
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
import {getAuth, provideAuth} from "@angular/fire/auth";

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
        BrowserAnimationsModule,
        MatInputModule,
        FormsModule,
        MatDialogModule,
        MatButtonModule,
        MatCardModule,
        BrowserModule,
        MatToolbarModule,
        MatIconModule,
        MatTableModule,
        provideFirebaseApp(() => initializeApp(environment.firebase)),
        provideAuth(() => getAuth()),
        provideFirestore(() => getFirestore()),
        MatInputModule,
        BrowserModule,
        BrowserAnimationsModule,
        MatDatepickerModule,
        MatInputModule,
        FormsModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatRadioModule,
        MatSelectModule,
        MatCheckboxModule,
        MatNativeDateModule,
        MatGridListModule,
        MatAutocompleteModule,
        ReactiveFormsModule,
    ],
    providers: [MatDatepickerModule, MatNativeDateModule],
    bootstrap: [AppComponent]
})
export class AppModule {
}
