import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {AppComponent} from './app.component';

import {MatTable, MatTableModule} from '@angular/material/table'
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
import {AddTourModalComponent} from './tour-modal/add-tour-modal/add-tour-modal.component';
import {
    NgxMatDatetimePickerModule,
    NgxMatNativeDateModule,
    NgxMatTimepickerModule
} from '@angular-material-components/datetime-picker';
import {MatDatepickerModule} from "@angular/material/datepicker";
import {MatRadioModule} from "@angular/material/radio";
import {MatSelectModule} from "@angular/material/select";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatNativeDateModule} from '@angular/material/core';
import {TourModalComponent} from "./tour-modal/tour-modal.component";
import {RescueOperationModalComponent} from "./rescue-operation-modal/rescue-operation-modal.component";

@NgModule({
    declarations: [
        AppComponent,
        RescueOperationDialogComponent,
        AddTourModalComponent,
        TourModalComponent,
        RescueOperationModalComponent,
        RescueOperationDialogComponent
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
        provideFirestore(() => getFirestore()),
        NgxMatDatetimePickerModule,
        MatInputModule,
        BrowserModule,
        BrowserAnimationsModule,
        MatDatepickerModule,
        MatInputModule,
        NgxMatDatetimePickerModule,
        NgxMatTimepickerModule,
        FormsModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatRadioModule,
        MatSelectModule,
        MatCheckboxModule,
        MatNativeDateModule,
        NgxMatNativeDateModule
    ],
    providers: [MatDatepickerModule, MatNativeDateModule],
    bootstrap: [AppComponent]
})
export class AppModule {
}
