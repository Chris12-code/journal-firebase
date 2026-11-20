import {Routes} from '@angular/router';
import {authGuard, loggedOutGuard} from './auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [loggedOutGuard],
    loadComponent: () => import('./login/login.page').then(m => m.LoginPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {path: '', pathMatch: 'full', redirectTo: 'fahrten'},
      {path: 'fahrten', title: 'Fahrten', loadComponent: () => import('./rides/rides.page').then(m => m.RidesPage)},
      {path: 'touren', title: 'Dienstmannschaft', loadComponent: () => import('./tours/tours.page').then(m => m.ToursPage)},
      {path: 'bericht', title: 'Jahresbericht', loadComponent: () => import('./report/report.page').then(m => m.ReportPage)},
    ],
  },
  {path: '**', redirectTo: ''},
];
