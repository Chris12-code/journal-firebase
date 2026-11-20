import {ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection} from '@angular/core';
import {MAT_FORM_FIELD_DEFAULT_OPTIONS} from '@angular/material/form-field';
import {provideRouter, withComponentInputBinding} from '@angular/router';
import {environment} from '../environments/environment';
import {provideDataLayer} from './data/provide-data-layer';
import {routes} from './ui/app.routes';

// Composition root: wires the data layer implementations to the application ports.
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideDataLayer(environment),
    {provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: {appearance: 'outline', subscriptSizing: 'dynamic'}},
  ],
};
