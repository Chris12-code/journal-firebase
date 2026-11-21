import {TestBed} from '@angular/core/testing';
import {t} from '../domain/testing/fixtures';
import {UserEntry} from '../domain/user';
import {fakeProviders} from './testing/fakes';
import {UserAdminService} from './user-admin.service';

const flush = () => new Promise(r => setTimeout(r));

const ADMIN: UserEntry = {uid: 'admin', email: 'admin@example.com', name: 'Chefin', role: 'ADMIN', active: true};
const STATION: UserEntry = {uid: 'station', email: 'station@example.com', name: 'RK Strobl', role: 'STATION', active: true};

describe('UserAdminService', () => {
  let fx: ReturnType<typeof fakeProviders>;
  let service: UserAdminService;

  beforeEach(() => {
    fx = fakeProviders(t(12));
    fx.users.store.next([STATION, ADMIN]);
    TestBed.configureTestingModule({providers: fx.providers});
    service = TestBed.inject(UserAdminService);
  });

  const loginAdmin = async () => {
    const {uid, ...entry} = ADMIN;
    fx.auth.loginAs(uid, entry);
    await flush();
  };

  it('lists users sorted by name for admins', async () => {
    await loginAdmin();
    expect(service.users().map(u => u.name)).toEqual(['Chefin', 'RK Strobl']);
  });

  it('lists nothing for the station login', async () => {
    const {uid, ...entry} = STATION;
    fx.auth.loginAs(uid, entry);
    await flush();
    expect(service.users()).toEqual([]);
  });

  it('adds a user', async () => {
    await loginAdmin();
    expect(await service.add({email: 'neu@example.com', password: 'secret123', name: 'Neu', role: 'ADMIN'})).toBeNull();
    expect(fx.users.created.map(u => u.email)).toEqual(['neu@example.com']);
  });

  it('requires email and name when adding', async () => {
    await loginAdmin();
    expect(await service.add({email: ' ', password: 'secret123', name: 'Neu', role: 'STATION'})).toBe('E-Mail und Name sind erforderlich.');
    expect(fx.users.created).toEqual([]);
  });

  for (const [code, message] of [
    ['auth/email-already-in-use', 'Diese E-Mail-Adresse wird bereits verwendet.'],
    ['auth/weak-password', 'Das Passwort ist zu schwach (mindestens 6 Zeichen).'],
    ['auth/invalid-email', 'Die E-Mail-Adresse ist ungültig.'],
  ]) {
    it(`maps ${code} to a German message`, async () => {
      await loginAdmin();
      fx.users.failWith = code;
      expect(await service.add({email: 'a@b.at', password: 'x', name: 'A', role: 'STATION'})).toBe(message);
    });
  }

  it('changes another user', async () => {
    await loginAdmin();
    expect(await service.change(STATION, {name: 'Station', role: 'ADMIN', active: false})).toBeNull();
    expect(fx.users.store.value.find(u => u.uid === 'station')).toEqual({...STATION, name: 'Station', role: 'ADMIN', active: false});
  });

  it('changes the own name but refuses the own role or active flag', async () => {
    await loginAdmin();
    expect(await service.change(ADMIN, {name: 'Chef', role: 'ADMIN', active: true})).toBeNull();
    expect(await service.change(ADMIN, {name: 'Chef', role: 'STATION', active: true})).toBe(
      'Die eigene Rolle und den eigenen Status kann man nicht ändern.',
    );
    expect(await service.change(ADMIN, {name: 'Chef', role: 'ADMIN', active: false})).not.toBeNull();
    expect(fx.users.store.value.find(u => u.uid === 'admin')!.role).toBe('ADMIN');
  });

  it('removes another user but not the own entry', async () => {
    await loginAdmin();
    expect(await service.remove(ADMIN)).toBe('Den eigenen Benutzer kann man nicht entfernen.');
    expect(await service.remove(STATION)).toBeNull();
    expect(fx.users.store.value.map(u => u.uid)).toEqual(['admin']);
  });

  it('sends a password reset to the user email', async () => {
    await loginAdmin();
    expect(await service.sendPasswordReset(STATION)).toBeNull();
    expect(fx.auth.resets).toEqual(['station@example.com']);
  });

  it('reports a backend refusal', async () => {
    await loginAdmin();
    fx.users.failWith = 'permission-denied';
    expect(await service.remove(STATION)).toBe('Keine Berechtigung für diese Änderung.');
  });
});
