import {TestBed} from '@angular/core/testing';
import {ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot, UrlTree} from '@angular/router';
import {provideRouter} from '@angular/router';
import {fakeProviders} from '../application/testing/fakes';
import {t} from '../domain/testing/fixtures';
import {adminGuard, authGuard, loggedOutGuard, noAccessGuard} from './auth.guard';

describe('guards', () => {
  let fx: ReturnType<typeof fakeProviders>;

  beforeEach(() => {
    fx = fakeProviders(t(12));
    TestBed.configureTestingModule({providers: [...fx.providers, provideRouter([])]});
  });

  const run = async (guard: CanActivateFn): Promise<string | true> => {
    const result = await TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
    if (result === true) return true;
    return TestBed.inject(Router).serializeUrl(result as UrlTree);
  };

  const entry = (role: 'STATION' | 'ADMIN', active = true) => ({email: 'x@example.com', name: 'X', role, active});

  describe('logged out', () => {
    it('sends journal, admin and no-access routes to the login', async () => {
      expect(await run(authGuard)).toBe('/login');
      expect(await run(adminGuard)).toBe('/fahrten');
      expect(await run(noAccessGuard)).toBe('/login');
      expect(await run(loggedOutGuard)).toBeTrue();
    });
  });

  describe('without access', () => {
    for (const [label, e] of [['no entry', null], ['inactive', entry('ADMIN', false)]] as const) {
      it(`shows only "Kein Zugang" (${label})`, async () => {
        fx.auth.loginAs('x', e);
        expect(await run(authGuard)).toBe('/kein-zugang');
        expect(await run(noAccessGuard)).toBeTrue();
        expect(await run(adminGuard)).toBe('/fahrten');
        expect(await run(loggedOutGuard)).toBe('/');
      });
    }
  });

  describe('STATION', () => {
    it('allows the journal but not the admin pages', async () => {
      fx.auth.loginAs('station', entry('STATION'));
      expect(await run(authGuard)).toBeTrue();
      expect(await run(adminGuard)).toBe('/fahrten');
      expect(await run(noAccessGuard)).toBe('/');
    });
  });

  describe('ADMIN', () => {
    it('allows the journal and the admin pages', async () => {
      fx.auth.loginAs('admin', entry('ADMIN'));
      expect(await run(authGuard)).toBeTrue();
      expect(await run(adminGuard)).toBeTrue();
      expect(await run(noAccessGuard)).toBe('/');
    });
  });
});
