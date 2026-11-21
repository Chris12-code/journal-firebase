// Integration tests against the Firebase emulators. Run with: npm run test:integration
import {TestBed} from '@angular/core/testing';
import {connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, signOut} from 'firebase/auth';
import {getApp, initializeApp} from 'firebase/app';
import {filter, firstValueFrom} from 'rxjs';
import {AuthGateway, MasterDataRepository, RideRepository, TourRepository, UserRepository} from '../application/ports';
import {Ride, Tour} from '../domain/model';
import {endTour} from '../domain/tour';
import {dayTour, t} from '../domain/testing/fixtures';
import {AUTH, FIRESTORE_EMULATOR_PORT} from './firebase';
import {provideDataLayer} from './provide-data-layer';

const PROJECT_ID = 'demo-journal';
const FIRESTORE_URL = `http://localhost:${FIRESTORE_EMULATOR_PORT}`;
const DOCS_URL = `${FIRESTORE_URL}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const OWNER = {Authorization: 'Bearer owner', 'Content-Type': 'application/json'};

async function clearFirestore() {
  await fetch(`${FIRESTORE_URL}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, {method: 'DELETE'});
}

async function seed(path: string, fields: Record<string, unknown>) {
  await fetch(`${DOCS_URL}/${path}`, {method: 'PATCH', headers: OWNER, body: JSON.stringify({fields})});
}

async function removeDoc(path: string) {
  await fetch(`${DOCS_URL}/${path}`, {method: 'DELETE', headers: OWNER});
}

/** Gives an account a user entry (bypasses the rules like the console does). */
async function seedUser(uid: string, role: 'STATION' | 'ADMIN', active = true) {
  await seed(`users/${uid}`, {
    email: {stringValue: `${uid}@example.com`},
    name: {stringValue: uid},
    role: {stringValue: role},
    active: {booleanValue: active},
  });
}

const newTour = (): Tour => {
  const {id, ...rest} = dayTour();
  return rest;
};

const newRide = (tourId: string, alarmAt: Date): Ride => ({
  tourId,
  vehicleIds: ['44.301'],
  alarmAt,
  crew: [{personId: 'huber', role: 'DRIVER'}],
  type: 'RD',
});

describe('Firestore repositories (emulator)', () => {
  let tours: TourRepository;
  let rides: RideRepository;
  let masterData: MasterDataRepository;
  let uid: string;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideDataLayer({
          firebase: {projectId: PROJECT_ID, apiKey: 'fake-api-key', appId: 'demo'},
          useEmulators: true,
        }),
      ],
    });
    tours = TestBed.inject(TourRepository);
    rides = TestBed.inject(RideRepository);
    masterData = TestBed.inject(MasterDataRepository);

    const auth = TestBed.inject(AUTH);
    if (!auth.currentUser) {
      const cred = await createUserWithEmailAndPassword(auth, `it-${Date.now()}@example.com`, 'password123').catch(() =>
        signInWithEmailAndPassword(auth, 'it@example.com', 'password123'),
      );
      uid = cred.user.uid;
    } else {
      uid = auth.currentUser.uid;
    }
    await clearFirestore();
    await seedUser(uid, 'ADMIN');
  });

  describe('auth gateway', () => {
    it('emits the own user entry live and null once it is removed', async () => {
      const gateway = TestBed.inject(AuthGateway);
      const entry = await firstValueFrom(gateway.access$(uid).pipe(filter(e => !!e)));
      expect(entry).toEqual({uid, email: `${uid}@example.com`, name: uid, role: 'ADMIN', active: true});

      const gone = firstValueFrom(gateway.access$(uid).pipe(filter(e => e === null)));
      await removeDoc(`users/${uid}`);
      expect(await gone).toBeNull();
    });

    it('emits null for an account without an entry', async () => {
      await removeDoc(`users/${uid}`);
      const gateway = TestBed.inject(AuthGateway);
      expect(await firstValueFrom(gateway.access$(uid))).toBeNull();
    });

    it('rejects journal reads once the entry is inactive', async () => {
      await seedUser(uid, 'STATION', false);
      await expectAsync(masterData.loadPersons()).toBeRejected();
    });

    it('sends a password reset email', async () => {
      const gateway = TestBed.inject(AuthGateway);
      await expectAsync(gateway.sendPasswordReset(TestBed.inject(AUTH).currentUser!.email!)).toBeResolved();
    });
  });

  describe('users', () => {
    const newEmail = () => `new-${Date.now()}-${Math.round(Math.random() * 1e6)}@example.com`;

    it('creates an account and its entry while the admin stays logged in', async () => {
      const users = TestBed.inject(UserRepository);
      const email = newEmail();
      const newUid = await users.create({email, password: 'secret123', name: 'Neu', role: 'STATION'});

      expect(TestBed.inject(AUTH).currentUser?.uid).toBe(uid);
      const list = await firstValueFrom(users.list$().pipe(filter(l => l.some(u => u.uid === newUid))));
      expect(list.find(u => u.uid === newUid)).toEqual({uid: newUid, email, name: 'Neu', role: 'STATION', active: true});

      // The new account can sign in (checked on a separate app so the admin session stays untouched).
      const probeApp = initializeApp(getApp().options, `probe-${Date.now()}`);
      const probe = getAuth(probeApp);
      connectAuthEmulator(probe, 'http://localhost:9099', {disableWarnings: true});
      const cred = await signInWithEmailAndPassword(probe, email, 'secret123');
      expect(cred.user.uid).toBe(newUid);
      await signOut(probe);
    });

    it('creates no entry when the email is already in use', async () => {
      const users = TestBed.inject(UserRepository);
      const email = newEmail();
      await users.create({email, password: 'secret123', name: 'Erst', role: 'STATION'});
      await expectAsync(users.create({email, password: 'secret123', name: 'Zweit', role: 'ADMIN'})).toBeRejectedWith(
        jasmine.objectContaining({code: 'auth/email-already-in-use'}),
      );
      const list = await firstValueFrom(users.list$());
      expect(list.filter(u => u.email === email).map(u => u.name)).toEqual(['Erst']);
    });

    it('updates and removes entries', async () => {
      const users = TestBed.inject(UserRepository);
      await seedUser('other', 'STATION');
      await users.update('other', {name: 'Andere', role: 'ADMIN', active: false});
      let list = await firstValueFrom(users.list$().pipe(filter(l => l.some(u => u.uid === 'other' && !u.active))));
      expect(list.find(u => u.uid === 'other')).toEqual({uid: 'other', email: 'other@example.com', name: 'Andere', role: 'ADMIN', active: false});

      await users.remove('other');
      list = await firstValueFrom(users.list$().pipe(filter(l => !l.some(u => u.uid === 'other'))));
      expect(list.map(u => u.uid)).toEqual([uid]);
    });
  });

  describe('master data', () => {
    it('loads persons and vehicles with business keys as ids', async () => {
      await seed('persons/07414', {name: {stringValue: 'Beer'}, active: {booleanValue: true}});
      await seed('persons/00001', {name: {stringValue: 'Alt'}, active: {booleanValue: false}});
      await seed('vehicles/44.201', {type: {stringValue: 'RTW'}, active: {booleanValue: true}});

      const persons = await masterData.loadPersons();
      expect(persons.map(p => [p.number, p.name, p.active]).sort()).toEqual([['00001', 'Alt', false], ['07414', 'Beer', true]]);
      expect(await masterData.loadVehicles()).toEqual([{number: '44.201', type: 'RTW', active: true}]);
    });
  });

  describe('tours', () => {
    it('creates a tour with author stamps and reads it back', async () => {
      const id = await tours.save(newTour());
      const [loaded] = await tours.loadForPeriod(t(0), t(0, 0, 1));
      expect(loaded.id).toBe(id);
      expect(loaded.members.length).toBe(3);
      expect(loaded.audit?.createdBy).toBe(uid);
      expect(loaded.audit?.updatedBy).toBe(uid);
    });

    it('updates a tour and keeps the creator', async () => {
      const id = await tours.save(newTour());
      const [created] = await tours.loadForPeriod(t(0), t(0, 0, 1));
      await tours.save(endTour({...created}, t(18, 55)));
      const [updated] = await tours.loadForPeriod(t(0), t(0, 0, 1));
      expect(updated.id).toBe(id);
      expect(updated.members.every(m => m.to?.getTime() === t(18, 55).getTime())).toBeTrue();
      expect(updated.audit?.createdAt).toEqual(created.audit?.createdAt);
    });

    it('watches active tours and tours ended within the window', async () => {
      await tours.save(newTour()); // active
      await tours.save(endTour(newTour(), t(18))); // ended at 18:00
      const oldEnded = endTour({...newTour(), members: newTour().members.map(m => ({...m, from: t(6, 0, -5)}))}, t(18, 0, -5));
      await tours.save(oldEnded); // ended five days earlier

      const list = await firstValueFrom(tours.watchDaily(t(0)).pipe(filter(l => l.length >= 2)));
      expect(list.length).toBe(2);
    });

    it('loads a New Year tour for the later year thanks to the start buffer', async () => {
      const nye: Tour = {
        shift: 'NIGHT',
        members: [{id: 'm', personId: 'huber', role: 'DRIVER', from: new Date(2026, 11, 31, 18), to: new Date(2027, 0, 1, 6)}],
      };
      await tours.save(nye);
      expect((await tours.loadForPeriod(new Date(2027, 0, 1), new Date(2028, 0, 1))).length).toBe(1);
      expect((await tours.loadForPeriod(new Date(2028, 0, 1), new Date(2029, 0, 1))).length).toBe(0);
    });

    it('returns the start of the first tour', async () => {
      expect(await tours.firstTourStart()).toBeUndefined();
      await tours.save(newTour());
      await tours.save({...newTour(), members: [{id: 'e', personId: 'a', role: 'DRIVER', from: t(6, 0, -10), to: t(7, 0, -10)}]});
      expect(await tours.firstTourStart()).toEqual(t(6, 0, -10));
    });

    it('stores the tour kind and the planned slot link', async () => {
      await tours.save({...newTour(), kind: 'SHIFT', slotKey: '2027-03-03|DAY|44.201'});
      await tours.save({...newTour(), kind: 'EXTRA'});
      const loaded = await tours.loadForPeriod(t(0), t(0, 0, 1));
      expect(loaded.map(x => [x.kind, x.slotKey]).sort()).toEqual([['EXTRA', undefined], ['SHIFT', '2027-03-03|DAY|44.201']]);
    });

    it('deletes a tour', async () => {
      const id = await tours.save(newTour());
      await tours.delete(id);
      expect(await tours.loadForPeriod(t(0), t(0, 0, 1))).toEqual([]);
    });
  });

  describe('rides', () => {
    it('creates, watches and loads rides', async () => {
      const id = await rides.save(newRide('tour-1', t(7, 12)));
      await rides.save(newRide('tour-1', t(7, 12, -3)));

      const live = await firstValueFrom(rides.watchSince(t(0)).pipe(filter(l => l.length > 0)));
      expect(live.map(r => r.id)).toEqual([id]);
      expect(live[0].audit?.createdBy).toBe(uid);

      expect((await rides.loadBetween(t(0, 0, -5), t(0, 0, 1))).length).toBe(2);
    });

    it('updates a ride with a return time', async () => {
      const id = await rides.save(newRide('tour-1', t(7, 12)));
      await rides.save({...newRide('tour-1', t(7, 12)), id, returnedAt: t(8, 5)});
      const [ride] = await rides.loadBetween(t(0), t(0, 0, 1));
      expect(ride.returnedAt).toEqual(t(8, 5));
    });

    it('stores an ambulance shift without tour, with vehicles, positions, assistances and resources', async () => {
      await rides.save({
        kind: 'AMBULANCE',
        event: 'Seefest Strobl',
        alarmAt: t(14),
        returnedAt: t(23),
        vehicleIds: ['44.301', '45.201'],
        crew: [{personId: 'huber', role: 'MEDIC'}, {personId: 'maier', role: 'Fußtrupp'}],
        assistances: 3,
        resources: ['Notarzthubschrauber', 'Polizei'],
      });
      const [ride] = await rides.loadBetween(t(0), t(0, 0, 1));
      expect(ride.kind).toBe('AMBULANCE');
      expect(ride.tourId).toBeUndefined();
      expect(ride.vehicleIds).toEqual(['44.301', '45.201']);
      expect(ride.crew.map(c => c.role)).toEqual(['MEDIC', 'Fußtrupp']);
      expect(ride.assistances).toBe(3);
      expect(ride.resources).toEqual(['Notarzthubschrauber', 'Polizei']);
      expect(ride.audit?.createdBy).toBe(uid);
    });

    it('tells whether a tour has rides', async () => {
      await rides.save(newRide('tour-1', t(7, 12)));
      expect(await rides.existsForTour('tour-1')).toBeTrue();
      expect(await rides.existsForTour('tour-2')).toBeFalse();
    });

    it('deletes a ride', async () => {
      const id = await rides.save(newRide('tour-1', t(7, 12)));
      await rides.delete(id);
      expect(await rides.existsForTour('tour-1')).toBeFalse();
    });
  });
});
