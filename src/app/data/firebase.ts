import {EnvironmentProviders, inject, InjectionToken, makeEnvironmentProviders} from '@angular/core';
import {FirebaseApp, FirebaseOptions, getApp, getApps, initializeApp} from 'firebase/app';
import {Auth, connectAuthEmulator, getAuth} from 'firebase/auth';
import {connectFirestoreEmulator, Firestore, getFirestore} from 'firebase/firestore';

// Firebase setup with the native SDK (design D6). Only the data layer sees these tokens.

export interface FirebaseEnvironment {
  firebase: FirebaseOptions;
  useEmulators?: boolean;
}

export const FIREBASE_APP = new InjectionToken<FirebaseApp>('FIREBASE_APP');
export const FIRESTORE = new InjectionToken<Firestore>('FIRESTORE');
export const AUTH = new InjectionToken<Auth>('AUTH');

export const EMULATOR_HOST = 'localhost';
export const FIRESTORE_EMULATOR_PORT = 8080;
export const AUTH_EMULATOR_PORT = 9099;

// The SDK keeps singletons per app; connecting an emulator twice throws, so remember what is connected.
const connected = new WeakSet<object>();

export function provideFirebase(env: FirebaseEnvironment): EnvironmentProviders {
  return makeEnvironmentProviders([
    {provide: FIREBASE_APP, useFactory: () => (getApps().length ? getApp() : initializeApp(env.firebase))},
    {
      provide: FIRESTORE,
      useFactory: () => {
        const db = getFirestore(inject(FIREBASE_APP));
        if (env.useEmulators && !connected.has(db)) {
          connectFirestoreEmulator(db, EMULATOR_HOST, FIRESTORE_EMULATOR_PORT);
          connected.add(db);
        }
        return db;
      },
    },
    {
      provide: AUTH,
      useFactory: () => {
        const auth = getAuth(inject(FIREBASE_APP));
        if (env.useEmulators && !connected.has(auth)) {
          connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${AUTH_EMULATOR_PORT}`, {disableWarnings: true});
          connected.add(auth);
        }
        return auth;
      },
    },
  ]);
}
