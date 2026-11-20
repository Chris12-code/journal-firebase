import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import {SessionService} from '../application/session.service';

// Note: inject() must run before the first await, i.e. inside the injection context.

/** Only logged-in users see journal data (spec journal-access). */
export const authGuard: CanActivateFn = async () => {
  const session = inject(SessionService);
  const router = inject(Router);
  return (await session.currentUser()) ? true : router.createUrlTree(['/login']);
};

/** The login page is only for logged-out users. */
export const loggedOutGuard: CanActivateFn = async () => {
  const session = inject(SessionService);
  const router = inject(Router);
  return (await session.currentUser()) ? router.createUrlTree(['/']) : true;
};
