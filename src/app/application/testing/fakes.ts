// In-memory fakes of the repository ports for application and UI specs. Not used by production code.
import {signal} from '@angular/core';
import {BehaviorSubject, map, Observable} from 'rxjs';
import {Person, Ride, Tour, Vehicle} from '../../domain/model';
import {tourEnd, tourStart} from '../../domain/tour';
import {Clock} from '../clock';
import {UserEntry} from '../../domain/user';
import {AuthGateway, MasterDataRepository, NewUser, RideRepository, SessionUser, TourRepository, UserChanges, UserRepository} from '../ports';

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

  /** User entries by uid; set an entry to `null` to simulate a missing one. `u1` is an active station user by default. */
  readonly entries = new BehaviorSubject<Record<string, UserEntry | null>>({
    u1: {uid: 'u1', email: 'station@example.com', name: 'RK Strobl', role: 'STATION', active: true},
  });
  resets: string[] = [];

  access$(uid: string): Observable<UserEntry | null> {
    return this.entries.pipe(map(e => e[uid] ?? null));
  }

  async sendPasswordReset(email: string): Promise<void> {
    if (this.failWith) throw Object.assign(new Error(this.failWith), {code: this.failWith});
    this.resets.push(email);
  }

  /** Logs in as `uid` with the given user entry (or none). */
  loginAs(uid: string, entry: Omit<UserEntry, 'uid'> | null): void {
    this.entries.next({...this.entries.value, [uid]: entry && {...entry, uid}});
    this.subject.next({uid, email: entry?.email ?? `${uid}@example.com`});
  }

  setEntry(uid: string, entry: Omit<UserEntry, 'uid'> | null): void {
    this.entries.next({...this.entries.value, [uid]: entry && {...entry, uid}});
  }
}

export class FakeUserRepository extends UserRepository {
  readonly store = new BehaviorSubject<UserEntry[]>([]);
  failWith?: string;
  created: NewUser[] = [];

  list$(): Observable<UserEntry[]> {
    return this.store.asObservable();
  }

  async create(user: NewUser): Promise<string> {
    if (this.failWith) throw Object.assign(new Error(this.failWith), {code: this.failWith});
    const uid = `new${this.created.length + 1}`;
    this.created.push(user);
    this.store.next([...this.store.value, {uid, email: user.email, name: user.name, role: user.role, active: true}]);
    return uid;
  }

  async update(uid: string, changes: UserChanges): Promise<void> {
    if (this.failWith) throw Object.assign(new Error(this.failWith), {code: this.failWith});
    this.store.next(this.store.value.map(u => (u.uid === uid ? {...u, ...changes} : u)));
  }

  async remove(uid: string): Promise<void> {
    if (this.failWith) throw Object.assign(new Error(this.failWith), {code: this.failWith});
    this.store.next(this.store.value.filter(u => u.uid !== uid));
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
  const users = new FakeUserRepository();
  const {clock, now} = fakeClock(at);
  return {
    auth,
    masterData,
    tours,
    rides,
    users,
    now,
    providers: [
      {provide: AuthGateway, useValue: auth},
      {provide: MasterDataRepository, useValue: masterData},
      {provide: TourRepository, useValue: tours},
      {provide: RideRepository, useValue: rides},
      {provide: UserRepository, useValue: users},
      {provide: Clock, useValue: clock},
    ],
  };
}
