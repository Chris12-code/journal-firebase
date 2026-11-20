import {inject, Injectable} from '@angular/core';
import {onAuthStateChanged, signInWithEmailAndPassword, signOut} from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import {combineLatest, map, Observable, shareReplay} from 'rxjs';
import {AuthGateway, MasterDataRepository, RideRepository, SessionUser, TourRepository} from '../application/ports';
import {Person, Ride, Tour, Vehicle} from '../domain/model';
import {tourStart} from '../domain/tour';
import {AUTH, FIRESTORE} from './firebase';
import {createStamps, mapSnapshot, mergeById, updateStamps, watchQuery} from './firestore-util';
import {docToPerson, docToRide, docToTour, docToVehicle, rideToDoc, tourToDoc} from './mappers';

// Firestore implementations of the repository ports (design D3, D4, D8).

export const COLLECTIONS = {persons: 'persons', vehicles: 'vehicles', tours: 'tours', rides: 'rides'} as const;

/** Tours can start before the period they contribute time to (night shifts across midnight). */
const PERIOD_BUFFER_MS = 2 * 24 * 3_600_000;

@Injectable()
export class FirebaseAuthGateway extends AuthGateway {
  private readonly auth = inject(AUTH);

  readonly user$: Observable<SessionUser | null> = new Observable<SessionUser | null>(subscriber =>
    onAuthStateChanged(this.auth, u => subscriber.next(u ? {uid: u.uid, email: u.email} : null)),
  ).pipe(shareReplay({bufferSize: 1, refCount: false}));

  async login(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(this.auth, email, password);
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
  }
}

@Injectable()
export class FirestoreMasterDataRepository extends MasterDataRepository {
  private readonly db = inject(FIRESTORE);

  async loadPersons(): Promise<Person[]> {
    return mapSnapshot(await getDocs(collection(this.db, COLLECTIONS.persons)), docToPerson);
  }

  async loadVehicles(): Promise<Vehicle[]> {
    return mapSnapshot(await getDocs(collection(this.db, COLLECTIONS.vehicles)), docToVehicle);
  }
}

@Injectable()
export class FirestoreTourRepository extends TourRepository {
  private readonly db = inject(FIRESTORE);
  private readonly auth = inject(AUTH);
  private readonly col = collection(this.db, COLLECTIONS.tours);

  watchDaily(endedSince: Date): Observable<Tour[]> {
    const active = watchQuery(query(this.col, where('end', '==', null)), docToTour);
    const recent = watchQuery(query(this.col, where('end', '>=', Timestamp.fromDate(endedSince))), docToTour);
    return combineLatest([active, recent]).pipe(map(([a, r]) => mergeById(a, r)));
  }

  async loadForPeriod(from: Date, to: Date): Promise<Tour[]> {
    const started = query(
      this.col,
      where('start', '>=', Timestamp.fromMillis(from.getTime() - PERIOD_BUFFER_MS)),
      where('start', '<', Timestamp.fromDate(to)),
    );
    const active = query(this.col, where('end', '==', null));
    const [s, a] = await Promise.all([getDocs(started), getDocs(active)]);
    return mergeById(mapSnapshot(s, docToTour), mapSnapshot(a, docToTour)).filter(
      t => (tourStart(t)?.getTime() ?? Infinity) < to.getTime(),
    );
  }

  async firstTourStart(): Promise<Date | undefined> {
    const q = query(this.col, where('start', '>=', Timestamp.fromMillis(0)), orderBy('start'), limit(1));
    const [first] = mapSnapshot(await getDocs(q), docToTour);
    return first ? tourStart(first) : undefined;
  }

  async save(tour: Tour): Promise<string> {
    const data = tourToDoc(tour);
    if (tour.id) {
      await updateDoc(doc(this.col, tour.id), {...data, ...updateStamps(this.auth)});
      return tour.id;
    }
    return (await addDoc(this.col, {...data, ...createStamps(this.auth)})).id;
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.col, id));
  }
}

@Injectable()
export class FirestoreRideRepository extends RideRepository {
  private readonly db = inject(FIRESTORE);
  private readonly auth = inject(AUTH);
  private readonly col = collection(this.db, COLLECTIONS.rides);

  watchSince(since: Date): Observable<Ride[]> {
    return watchQuery(
      query(this.col, where('alarmAt', '>=', Timestamp.fromDate(since)), orderBy('alarmAt', 'desc')),
      docToRide,
    );
  }

  async loadBetween(from: Date, to: Date): Promise<Ride[]> {
    const q = query(
      this.col,
      where('alarmAt', '>=', Timestamp.fromDate(from)),
      where('alarmAt', '<', Timestamp.fromDate(to)),
    );
    return mapSnapshot(await getDocs(q), docToRide);
  }

  async existsForTour(tourId: string): Promise<boolean> {
    const snap = await getDocs(query(this.col, where('tourId', '==', tourId), limit(1)));
    return !snap.empty;
  }

  async save(ride: Ride): Promise<string> {
    const data = rideToDoc(ride);
    if (ride.id) {
      await updateDoc(doc(this.col, ride.id), {...data, ...updateStamps(this.auth)});
      return ride.id;
    }
    return (await addDoc(this.col, {...data, ...createStamps(this.auth)})).id;
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.col, id));
  }
}
