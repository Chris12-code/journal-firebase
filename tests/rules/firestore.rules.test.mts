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
import {addDoc, collection, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc} from 'firebase/firestore';

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
  it('lets logged-in users read persons', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertSucceeds(getDoc(doc(db, 'persons/07414')));
  });

  it('rejects person writes from logged-in users', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(db, 'persons/99999'), {name: 'Hacker', active: true}));
    await assertFails(updateDoc(doc(db, 'persons/07414'), {active: false}));
  });

  it('rejects vehicle writes from logged-in users', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(db, 'vehicles/44.201'), {type: 'RTW', active: true}));
  });
});
