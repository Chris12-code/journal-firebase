import {EnvironmentProviders, makeEnvironmentProviders} from '@angular/core';
import {AuthGateway, MasterDataRepository, RideRepository, TourRepository} from '../application/ports';
import {FirebaseEnvironment, provideFirebase} from './firebase';
import {
  FirebaseAuthGateway,
  FirestoreMasterDataRepository,
  FirestoreRideRepository,
  FirestoreTourRepository,
} from './repositories';

/** Binds the application ports to the Firestore implementations. */
export function provideDataLayer(env: FirebaseEnvironment): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideFirebase(env),
    {provide: AuthGateway, useClass: FirebaseAuthGateway},
    {provide: MasterDataRepository, useClass: FirestoreMasterDataRepository},
    {provide: TourRepository, useClass: FirestoreTourRepository},
    {provide: RideRepository, useClass: FirestoreRideRepository},
  ]);
}
