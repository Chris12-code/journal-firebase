import {registerLocaleData} from '@angular/common';
import localeDeAt from '@angular/common/locales/de-AT';
import {bootstrapApplication} from '@angular/platform-browser';
import {appConfig} from './app/app.config';
import {AppComponent} from './app/ui/app.component';

registerLocaleData(localeDeAt);

bootstrapApplication(AppComponent, appConfig).catch(err => console.error(err));
