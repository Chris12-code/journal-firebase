import {Observable} from 'rxjs';
import {Person, Ride, Tour, Vehicle} from '../domain/model';
import {UserEntry, UserRole} from '../domain/user';

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
  /** Live user entry of the given account; null when there is none or it cannot be read. */
  abstract access$(uid: string): Observable<UserEntry | null>;
  /** Sends a password reset email to the address. */
  abstract sendPasswordReset(email: string): Promise<void>;
}

export interface NewUser {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

export type UserChanges = Pick<UserEntry, 'name' | 'role' | 'active'>;

/** User maintenance (spec journal-access, design D3/D4). Only admins may use it. */
export abstract class UserRepository {
  /** Live list of all user entries. */
  abstract list$(): Observable<UserEntry[]>;
  /** Creates the login account and its active user entry; returns the new uid. */
  abstract create(user: NewUser): Promise<string>;
  abstract update(uid: string, changes: UserChanges): Promise<void>;
  /** Deletes the user entry; the login account stays. */
  abstract remove(uid: string): Promise<void>;
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
