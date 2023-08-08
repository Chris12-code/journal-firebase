import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';

import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RescueOperationComponent } from './rescue-operation/rescue-operation.component';
import { RescueOperationDialogComponent } from './rescue-operation-dialog/rescue-operation-dialog.component';

@NgModule({
  declarations: [
    AppComponent,
    RescueOperationComponent,
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
    MatIconModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
