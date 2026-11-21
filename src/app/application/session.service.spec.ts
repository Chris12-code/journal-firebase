import {TestBed} from '@angular/core/testing';
import {t} from '../domain/testing/fixtures';
import {fakeProviders} from './testing/fakes';
import {SessionService} from './session.service';

describe('SessionService', () => {
  let fx: ReturnType<typeof fakeProviders>;
  let session: SessionService;

  beforeEach(() => {
    fx = fakeProviders(t(12));
    TestBed.configureTestingModule({providers: fx.providers});
    session = TestBed.inject(SessionService);
  });

  it('is logged out initially', () => {
    expect(session.user()).toBeNull();
    expect(session.isLoggedIn()).toBeFalse();
  });

  it('logs in and out', async () => {
    expect(await session.login('a@b.at', 'pw')).toBeNull();
    expect(session.user()).toEqual({uid: 'u1', email: 'a@b.at'});
    expect(session.isLoggedIn()).toBeTrue();

    await session.logout();
    expect(session.user()).toBeNull();
  });

  it('maps wrong credentials to a German message', async () => {
    fx.auth.failWith = 'auth/invalid-credential';
    expect(await session.login('a@b.at', 'pw')).toBe('E-Mail oder Passwort ist falsch.');
    expect(session.isLoggedIn()).toBeFalse();
  });

  it('resolves the current user once known', async () => {
    await session.login('a@b.at', 'pw');
    expect(await session.currentUser()).toEqual({uid: 'u1', email: 'a@b.at'});
  });

  describe('access', () => {
    const flush = () => new Promise(r => setTimeout(r));
    const entry = (role: 'STATION' | 'ADMIN', active = true) => ({email: 'x@example.com', name: 'X', role, active});

    it('is null while logged out', async () => {
      expect(await session.currentAccess()).toBeNull();
      expect(session.isAdmin()).toBeFalse();
    });

    it('is NONE for an account without entry', async () => {
      fx.auth.loginAs('nobody', null);
      expect(await session.currentAccess()).toBe('NONE');
      expect(session.access()).toBe('NONE');
    });

    it('is NONE for an inactive entry', async () => {
      fx.auth.loginAs('old', entry('ADMIN', false));
      expect(await session.currentAccess()).toBe('NONE');
    });

    it('is STATION for the station login', async () => {
      fx.auth.loginAs('station', entry('STATION'));
      expect(await session.currentAccess()).toBe('STATION');
      expect(session.isAdmin()).toBeFalse();
    });

    it('is ADMIN for an admin', async () => {
      fx.auth.loginAs('admin', entry('ADMIN'));
      expect(await session.currentAccess()).toBe('ADMIN');
      expect(session.isAdmin()).toBeTrue();
      expect(session.entry()?.role).toBe('ADMIN');
    });

    it('follows a demotion and a deactivation in an open session', async () => {
      fx.auth.loginAs('admin', entry('ADMIN'));
      await flush();
      expect(session.isAdmin()).toBeTrue();

      fx.auth.setEntry('admin', entry('STATION'));
      await flush();
      expect(session.access()).toBe('STATION');

      fx.auth.setEntry('admin', entry('STATION', false));
      await flush();
      expect(session.access()).toBe('NONE');
    });

    it('never resolves the access of the previous login state', async () => {
      fx.auth.loginAs('admin', entry('ADMIN'));
      expect(await session.currentAccess()).toBe('ADMIN');
      fx.auth.subject.next(null);
      expect(await session.currentAccess()).toBeNull();
      fx.auth.loginAs('station', entry('STATION'));
      expect(await session.currentAccess()).toBe('STATION');
    });

    it('emits members only while they have access', async () => {
      const seen: (string | null)[] = [];
      session.member$.subscribe(u => seen.push(u?.uid ?? null));
      fx.auth.loginAs('station', entry('STATION'));
      fx.auth.setEntry('station', null);
      expect(seen).toEqual([null, 'station', null]);
    });
  });
});
