import {Routes} from '@angular/router';
import {adminGuard, authGuard, loggedOutGuard, noAccessGuard} from './auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [loggedOutGuard],
    loadComponent: () => import('./login/login.page').then(m => m.LoginPage),
  },
  {
    path: 'kein-zugang',
    title: 'Kein Zugang',
    canActivate: [noAccessGuard],
    loadComponent: () => import('./login/no-access.page').then(m => m.NoAccessPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {path: '', pathMatch: 'full', redirectTo: 'fahrten'},
      {path: 'fahrten', title: 'Fahrten', loadComponent: () => import('./rides/rides.page').then(m => m.RidesPage)},
      {path: 'touren', title: 'Dienstmannschaft', loadComponent: () => import('./tours/tours.page').then(m => m.ToursPage)},
      {
        path: 'bericht',
        title: 'Jahresbericht',
        canActivate: [adminGuard],
        loadComponent: () => import('./report/report.page').then(m => m.ReportPage),
      },
      {
        path: 'benutzer',
        title: 'Benutzer',
        canActivate: [adminGuard],
        loadComponent: () => import('./users/users.page').then(m => m.UsersPage),
      },
    ],
  },
  {path: '**', redirectTo: ''},
];
