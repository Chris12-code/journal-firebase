// Firestore security rules tests (specs journal-access, master-data).
// Run with: npm run test:rules   (starts the Firestore emulator)
import {after, before, beforeEach, describe, it} from 'node:test';
import {readFileSync} from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {addDoc, collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc} from 'firebase/firestore';

const PROJECT_ID = 'demo-rules-test';
let env: RulesTestEnvironment;

const stamps = (uid: string) => ({
  createdBy: uid,
  createdAt: serverTimestamp(),
  updatedBy: uid,
  updatedAt: serverTimestamp(),
});

const ride = (uid: string) => ({
  tourId: 't1',
  vehicleIds: ['44.201'],
  alarmAt: new Date(),
  returnedAt: null,
  crew: [{personId: '07414', role: 'DRIVER'}],
  type: 'RD',
  ...stamps(uid),
});

// alice and bob share the station role; 'nobody' can sign in but has no user entry.
const USERS: [string, 'STATION' | 'ADMIN', boolean][] = [
  ['alice', 'STATION', true],
  ['bob', 'STATION', true],
  ['admin', 'ADMIN', true],
  ['admin2', 'ADMIN', true],
  ['inactive', 'STATION', false],
  ['inactiveAdmin', 'ADMIN', false],
];

const userEntry = (over: Record<string, unknown> = {}) => ({
  email: 'new@example.com',
  name: 'Neu',
  role: 'STATION',
  active: true,
  ...over,
});

before(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {rules: readFileSync('firestore.rules', 'utf8')},
  });
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'persons/07414'), {name: 'Test Person', active: true});
    for (const [uid, role, active] of USERS) {
      await setDoc(doc(db, `users/${uid}`), {email: `${uid}@example.com`, name: uid, role, active});
    }
    await setDoc(doc(db, 'rides/r1'), {...ride('alice'), createdAt: new Date(0), updatedAt: new Date(0)});
  });
});

after(async () => {
  await env.cleanup();
});

describe('journal access', () => {
  it('rejects unauthenticated reads of rides', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDocs(collection(db, 'rides')));
  });

  it('rejects unauthenticated reads of persons', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'persons/07414')));
  });

  it('accepts a ride create with correct author stamps', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertSucceeds(addDoc(collection(db, 'rides'), ride('alice')));
  });

  it('rejects a ride create with a foreign createdBy', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(addDoc(collection(db, 'rides'), ride('bob')));
  });

  it('accepts an update by another user that keeps the creator', async () => {
    const db = env.authenticatedContext('bob').firestore();
    await assertSucceeds(updateDoc(doc(db, 'rides/r1'), {type: 'NA', updatedBy: 'bob', updatedAt: serverTimestamp()}));
  });

  it('rejects an update that rewrites the creator', async () => {
    const db = env.authenticatedContext('bob').firestore();
    await assertFails(updateDoc(doc(db, 'rides/r1'), {createdBy: 'bob', updatedBy: 'bob', updatedAt: serverTimestamp()}));
  });

  it('rejects an update with a foreign updatedBy', async () => {
    const db = env.authenticatedContext('bob').firestore();
    await assertFails(updateDoc(doc(db, 'rides/r1'), {updatedBy: 'alice', updatedAt: serverTimestamp()}));
  });

  it('applies the same author rules to tours', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertSucceeds(addDoc(collection(db, 'tours'), {shift: 'DAY', members: [], ...stamps('alice')}));
    await assertFails(addDoc(collection(db, 'tours'), {shift: 'DAY', members: [], ...stamps('bob')}));
  });
});

describe('master data', () => {
  it('lets station users read persons', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertSucceeds(getDoc(doc(db, 'persons/07414')));
  });

  it('rejects person writes from station users', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(db, 'persons/99999'), {name: 'Hacker', active: true}));
    await assertFails(updateDoc(doc(db, 'persons/07414'), {active: false}));
  });

  it('rejects vehicle writes from station users', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(db, 'vehicles/44.201'), {type: 'RTW', active: true}));
  });

  it('rejects master data writes from admins too', async () => {
    const db = env.authenticatedContext('admin').firestore();
    await assertFails(setDoc(doc(db, 'persons/99999'), {name: 'X', active: true}));
    await assertFails(setDoc(doc(db, 'vehicles/44.201'), {type: 'RTW', active: true}));
  });
});

describe('roles', () => {
  const JOURNAL = ['persons', 'vehicles', 'tours', 'rides', 'car-tour', 'rescue-operation'];

  for (const uid of ['nobody', 'inactive', 'inactiveAdmin']) {
    it(`rejects every journal read for an account without active entry (${uid})`, async () => {
      const db = env.authenticatedContext(uid).firestore();
      for (const c of JOURNAL) await assertFails(getDocs(collection(db, c)));
      await assertFails(getDoc(doc(db, 'persons/07414')));
    });

    it(`rejects journal writes for an account without active entry (${uid})`, async () => {
      const db = env.authenticatedContext(uid).firestore();
      await assertFails(addDoc(collection(db, 'rides'), ride(uid)));
      await assertFails(addDoc(collection(db, 'tours'), {shift: 'DAY', members: [], ...stamps(uid)}));
      await assertFails(updateDoc(doc(db, 'rides/r1'), {type: 'NA', updatedBy: uid, updatedAt: serverTimestamp()}));
      await assertFails(deleteDoc(doc(db, 'rides/r1')));
      await assertFails(setDoc(doc(db, 'car-tour/x'), {a: 1}));
      await assertFails(setDoc(doc(db, 'rescue-operation/x'), {a: 1}));
    });
  }

  for (const uid of ['alice', 'admin']) {
    it(`lets ${uid} read and write the journal`, async () => {
      const db = env.authenticatedContext(uid).firestore();
      for (const c of JOURNAL) await assertSucceeds(getDocs(collection(db, c)));
      await assertSucceeds(addDoc(collection(db, 'rides'), ride(uid)));
      await assertSucceeds(addDoc(collection(db, 'tours'), {shift: 'DAY', members: [], ...stamps(uid)}));
      await assertSucceeds(updateDoc(doc(db, 'rides/r1'), {type: 'NA', updatedBy: uid, updatedAt: serverTimestamp()}));
      await assertSucceeds(setDoc(doc(db, 'car-tour/x'), {a: 1}));
      await assertSucceeds(setDoc(doc(db, 'rescue-operation/x'), {a: 1}));
      await assertSucceeds(deleteDoc(doc(db, 'rides/r1')));
    });
  }
});

describe('users', () => {
  it('lets every account read its own entry, including inactive ones', async () => {
    await assertSucceeds(getDoc(doc(env.authenticatedContext('alice').firestore(), 'users/alice')));
    await assertSucceeds(getDoc(doc(env.authenticatedContext('inactive').firestore(), 'users/inactive')));
    await assertSucceeds(getDoc(doc(env.authenticatedContext('nobody').firestore(), 'users/nobody')));
  });

  it('rejects unauthenticated reads of users', async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'users/alice')));
  });

  it('lets station users read neither other entries nor the list', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(getDoc(doc(db, 'users/bob')));
    await assertFails(getDocs(collection(db, 'users')));
  });

  it('rejects station writes to users, including the own entry', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(updateDoc(doc(db, 'users/alice'), {role: 'ADMIN'}));
    await assertFails(updateDoc(doc(db, 'users/alice'), {name: 'Alice'}));
    await assertFails(setDoc(doc(db, 'users/new'), userEntry()));
    await assertFails(deleteDoc(doc(db, 'users/bob')));
  });

  it('rejects writes from an inactive admin', async () => {
    const db = env.authenticatedContext('inactiveAdmin').firestore();
    await assertFails(getDocs(collection(db, 'users')));
    await assertFails(setDoc(doc(db, 'users/new'), userEntry()));
    await assertFails(updateDoc(doc(db, 'users/inactiveAdmin'), {active: true}));
  });

  it('lets admins list, create, edit and delete other entries', async () => {
    const db = env.authenticatedContext('admin').firestore();
    await assertSucceeds(getDocs(collection(db, 'users')));
    await assertSucceeds(setDoc(doc(db, 'users/new'), userEntry({role: 'ADMIN'})));
    await assertSucceeds(updateDoc(doc(db, 'users/alice'), {name: 'Alice', role: 'ADMIN', active: false}));
    await assertSucceeds(updateDoc(doc(db, 'users/admin2'), {role: 'STATION'}));
    await assertSucceeds(deleteDoc(doc(db, 'users/bob')));
  });

  it('lets admins change their own name', async () => {
    const db = env.authenticatedContext('admin').firestore();
    await assertSucceeds(updateDoc(doc(db, 'users/admin'), {name: 'Chef'}));
  });

  it('rejects an admin demoting, deactivating or removing themselves', async () => {
    const db = env.authenticatedContext('admin').firestore();
    await assertFails(updateDoc(doc(db, 'users/admin'), {role: 'STATION'}));
    await assertFails(updateDoc(doc(db, 'users/admin'), {active: false}));
    await assertFails(deleteDoc(doc(db, 'users/admin')));
  });

  it('rejects changing the email', async () => {
    const db = env.authenticatedContext('admin').firestore();
    await assertFails(updateDoc(doc(db, 'users/alice'), {email: 'other@example.com'}));
  });

  it('rejects invalid entries', async () => {
    const db = env.authenticatedContext('admin').firestore();
    await assertFails(setDoc(doc(db, 'users/x1'), userEntry({role: 'OWNER'})));
    await assertFails(setDoc(doc(db, 'users/x2'), {...userEntry(), extra: true}));
    await assertFails(setDoc(doc(db, 'users/x3'), userEntry({active: 'yes'})));
    await assertFails(setDoc(doc(db, 'users/x4'), userEntry({name: ''})));
    const {name: _omit, ...withoutName} = userEntry();
    await assertFails(setDoc(doc(db, 'users/x5'), withoutName));
  });
});
