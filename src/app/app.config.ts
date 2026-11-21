import {ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection} from '@angular/core';
import {DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE} from '@angular/material/core';
import {MAT_FORM_FIELD_DEFAULT_OPTIONS} from '@angular/material/form-field';
import {provideRouter, withComponentInputBinding} from '@angular/router';
import {environment} from '../environments/environment';
import {provideDataLayer} from './data/provide-data-layer';
import {routes} from './ui/app.routes';
import {GERMAN_DATE_FORMATS, GermanDateAdapter} from './ui/shared/german-date-adapter';

// Composition root: wires the data layer implementations to the application ports.
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideDataLayer(environment),
    {provide: LOCALE_ID, useValue: 'de-AT'},
    {provide: MAT_DATE_LOCALE, useValue: 'de-AT'},
    {provide: DateAdapter, useClass: GermanDateAdapter},
    {provide: MAT_DATE_FORMATS, useValue: GERMAN_DATE_FORMATS},
    {provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: {appearance: 'outline', subscriptSizing: 'dynamic'}},
  ],
};
