import {Observable} from 'rxjs';
import {Person, Ride, Tour, Vehicle} from '../domain/model';

// Repository ports (design D1). Abstract classes double as DI tokens;
// the data layer provides the Firestore implementations.

export interface SessionUser {
  uid: string;
  email: string | null;
}

export abstract class AuthGateway {
  /** Emits the current user, or null when logged out. */
  abstract readonly user$: Observable<SessionUser | null>;
  abstract login(email: string, password: string): Promise<void>;
  abstract logout(): Promise<void>;
}

export abstract class MasterDataRepository {
  abstract loadPersons(): Promise<Person[]>;
  abstract loadVehicles(): Promise<Vehicle[]>;
}

export abstract class TourRepository {
  /** Live list of tours that are active or ended at/after `endedSince`. */
  abstract watchDaily(endedSince: Date): Observable<Tour[]>;
  /** Tours that may have member time within [from, to): started in [from - 2 days, to), plus all active ones. */
  abstract loadForPeriod(from: Date, to: Date): Promise<Tour[]>;
  /** Start of the earliest tour, if any. */
  abstract firstTourStart(): Promise<Date | undefined>;
  /** Creates or updates the tour and returns its id. */
  abstract save(tour: Tour): Promise<string>;
  abstract delete(id: string): Promise<void>;
}

export abstract class RideRepository {
  /** Live list of rides alarmed at/after `since`. */
  abstract watchSince(since: Date): Observable<Ride[]>;
  /** Rides alarmed within [from, to). */
  abstract loadBetween(from: Date, to: Date): Promise<Ride[]>;
  abstract existsForTour(tourId: string): Promise<boolean>;
  /** Creates or updates the ride and returns its id. */
  abstract save(ride: Ride): Promise<string>;
  abstract delete(id: string): Promise<void>;
}
