import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import {SessionService} from '../application/session.service';

// Note: inject() must run before the first await, i.e. inside the injection context.

/** Journal pages need a login with access (spec journal-access); accounts without an entry see "Kein Zugang". */
export const authGuard: CanActivateFn = async () => {
  const session = inject(SessionService);
  const router = inject(Router);
  const access = await session.currentAccess();
  if (access === null) return router.createUrlTree(['/login']);
  if (access === 'NONE') return router.createUrlTree(['/kein-zugang']);
  return true;
};

/** Report and user maintenance are offered to admins only (UI-only restriction, see spec). */
export const adminGuard: CanActivateFn = async () => {
  const session = inject(SessionService);
  const router = inject(Router);
  return (await session.currentAccess()) === 'ADMIN' ? true : router.createUrlTree(['/fahrten']);
};

/** The "Kein Zugang" page is only for logged-in accounts without access. */
export const noAccessGuard: CanActivateFn = async () => {
  const session = inject(SessionService);
  const router = inject(Router);
  const access = await session.currentAccess();
  if (access === null) return router.createUrlTree(['/login']);
  return access === 'NONE' ? true : router.createUrlTree(['/']);
};

/** The login page is only for logged-out users. */
export const loggedOutGuard: CanActivateFn = async () => {
  const session = inject(SessionService);
  const router = inject(Router);
  return (await session.currentUser()) ? router.createUrlTree(['/']) : true;
};
