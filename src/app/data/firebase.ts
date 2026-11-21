import {EnvironmentProviders, inject, InjectionToken, makeEnvironmentProviders} from '@angular/core';
import {FirebaseApp, FirebaseOptions, getApp, getApps, initializeApp} from 'firebase/app';
import {Auth, connectAuthEmulator, getAuth, inMemoryPersistence, initializeAuth} from 'firebase/auth';
import {connectFirestoreEmulator, Firestore, getFirestore} from 'firebase/firestore';

// Firebase setup with the native SDK (design D6). Only the data layer sees these tokens.

export interface FirebaseEnvironment {
  firebase: FirebaseOptions;
  useEmulators?: boolean;
}

export const FIREBASE_APP = new InjectionToken<FirebaseApp>('FIREBASE_APP');
export const FIRESTORE = new InjectionToken<Firestore>('FIRESTORE');
export const AUTH = new InjectionToken<Auth>('AUTH');
/** Auth of a second app instance, used only to create accounts without replacing the admin's session (design D4). */
export const USER_ADMIN_AUTH = new InjectionToken<() => Auth>('USER_ADMIN_AUTH');

const USER_ADMIN_APP = 'user-admin';

export const EMULATOR_HOST = 'localhost';
export const FIRESTORE_EMULATOR_PORT = 8080;
export const AUTH_EMULATOR_PORT = 9099;

// The SDK keeps singletons per app; connecting an emulator twice throws, so remember what is connected.
const connected = new WeakSet<object>();

export function provideFirebase(env: FirebaseEnvironment): EnvironmentProviders {
  return makeEnvironmentProviders([
    {provide: FIREBASE_APP, useFactory: () => (getApps().some(a => a.name === '[DEFAULT]') ? getApp() : initializeApp(env.firebase))},
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
    {
      provide: USER_ADMIN_AUTH,
      useFactory: () => {
        let auth: Auth | undefined;
        return () => {
          if (auth) return auth;
          const existing = getApps().find(a => a.name === USER_ADMIN_APP);
          const app = existing ?? initializeApp(env.firebase, USER_ADMIN_APP);
          // In-memory persistence: the secondary sign-in never touches the stored session of the admin.
          auth = existing ? getAuth(app) : initializeAuth(app, {persistence: inMemoryPersistence});
          if (env.useEmulators && !connected.has(auth)) {
            connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${AUTH_EMULATOR_PORT}`, {disableWarnings: true});
            connected.add(auth);
          }
          return auth;
        };
      },
    },
  ]);
}
