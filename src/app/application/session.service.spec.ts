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
});
