// In-memory fakes of the repository ports for application and UI specs. Not used by production code.
import {signal} from '@angular/core';
import {BehaviorSubject, map, Observable} from 'rxjs';
import {Person, Ride, Tour, Vehicle} from '../../domain/model';
import {tourEnd, tourStart} from '../../domain/tour';
import {Clock} from '../clock';
import {AuthGateway, MasterDataRepository, RideRepository, SessionUser, TourRepository} from '../ports';

export class FakeAuthGateway extends AuthGateway {
  readonly subject = new BehaviorSubject<SessionUser | null>(null);
  readonly user$ = this.subject.asObservable();
  failWith?: string;

  async login(email: string): Promise<void> {
    if (this.failWith) throw Object.assign(new Error(this.failWith), {code: this.failWith});
    this.subject.next({uid: 'u1', email});
  }

  async logout(): Promise<void> {
    this.subject.next(null);
  }
}

export class FakeMasterDataRepository extends MasterDataRepository {
  persons: Person[] = [];
  vehicles: Vehicle[] = [];
  loads = 0;

  async loadPersons(): Promise<Person[]> {
    this.loads++;
    return this.persons;
  }

  async loadVehicles(): Promise<Vehicle[]> {
    return this.vehicles;
  }
}

let nextId = 1;

export class FakeTourRepository extends TourRepository {
  readonly store = new BehaviorSubject<Tour[]>([]);
  watchers = 0;
  lastWatchSince?: Date;

  watchDaily(endedSince: Date): Observable<Tour[]> {
    this.lastWatchSince = endedSince;
    return new Observable<Tour[]>(sub => {
      this.watchers++;
      const s = this.store
        .pipe(map(l => l.filter(t => !tourEnd(t) || tourEnd(t)!.getTime() >= endedSince.getTime())))
        .subscribe(sub);
      return () => {
        this.watchers--;
        s.unsubscribe();
      };
    });
  }

  async loadForPeriod(from: Date, to: Date): Promise<Tour[]> {
    return this.store.value.filter(t => {
      const start = tourStart(t)?.getTime() ?? Infinity;
      return start < to.getTime() && (!tourEnd(t) || start >= from.getTime() - 2 * 86_400_000);
    });
  }

  async firstTourStart(): Promise<Date | undefined> {
    const starts = this.store.value.map(t => tourStart(t)!.getTime());
    return starts.length ? new Date(Math.min(...starts)) : undefined;
  }

  async save(tour: Tour): Promise<string> {
    const id = tour.id ?? `t${nextId++}`;
    this.store.next([...this.store.value.filter(t => t.id !== id), {...tour, id}]);
    return id;
  }

  async delete(id: string): Promise<void> {
    this.store.next(this.store.value.filter(t => t.id !== id));
  }
}

export class FakeRideRepository extends RideRepository {
  readonly store = new BehaviorSubject<Ride[]>([]);
  watchers = 0;

  watchSince(since: Date): Observable<Ride[]> {
    return new Observable<Ride[]>(sub => {
      this.watchers++;
      const s = this.store.pipe(map(l => l.filter(r => r.alarmAt.getTime() >= since.getTime()))).subscribe(sub);
      return () => {
        this.watchers--;
        s.unsubscribe();
      };
    });
  }

  async loadBetween(from: Date, to: Date): Promise<Ride[]> {
    return this.store.value.filter(r => r.alarmAt.getTime() >= from.getTime() && r.alarmAt.getTime() < to.getTime());
  }

  async existsForTour(tourId: string): Promise<boolean> {
    return this.store.value.some(r => r.tourId === tourId);
  }

  async save(ride: Ride): Promise<string> {
    const id = ride.id ?? `r${nextId++}`;
    this.store.next([...this.store.value.filter(r => r.id !== id), {...ride, id}]);
    return id;
  }

  async delete(id: string): Promise<void> {
    this.store.next(this.store.value.filter(r => r.id !== id));
  }
}

/** A clock fixed at the given time; set `now` to move it. */
export function fakeClock(at: Date) {
  const now = signal(at);
  return {clock: {now} as unknown as Clock, now};
}

export function fakeProviders(at: Date) {
  const auth = new FakeAuthGateway();
  const masterData = new FakeMasterDataRepository();
  const tours = new FakeTourRepository();
  const rides = new FakeRideRepository();
  const {clock, now} = fakeClock(at);
  return {
    auth,
    masterData,
    tours,
    rides,
    now,
    providers: [
      {provide: AuthGateway, useValue: auth},
      {provide: MasterDataRepository, useValue: masterData},
      {provide: TourRepository, useValue: tours},
      {provide: RideRepository, useValue: rides},
      {provide: Clock, useValue: clock},
    ],
  };
}
