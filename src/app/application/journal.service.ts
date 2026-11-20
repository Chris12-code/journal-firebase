import {computed, inject, Injectable, untracked} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {catchError, of, switchMap} from 'rxjs';
import {CrewMember, Ride, Role, Shift, Tour, TourKind, ValidationError} from '../domain/model';
import {PlannedSlot, slotByKey, slotsBetween, SlotStatus, slotStatus} from '../domain/shift-plan';
import {prefillRide, toursActiveAt, validateRide} from '../domain/ride';
import * as rules from '../domain/tour';
import {Clock, DISPLAY_HOURS, HOUR_MS} from './clock';
import {RideRepository, TourRepository} from './ports';
import {SessionService} from './session.service';

export type Result = {ok: true; id: string} | {ok: false; errors: ValidationError[]};

export interface StartTourInput {
  kind?: TourKind;
  slotKey?: string;
  shift: Shift;
  homeVehicleId?: string;
  at: Date;
  crew: {personId: string; role: Role}[];
}

/** How far ahead planned slots are shown. */
export const PLAN_AHEAD_HOURS = 24;

export interface PlannedSlotView {
  slot: PlannedSlot;
  status: SlotStatus;
  tour?: Tour;
}

const TOUR_HAS_RIDES: ValidationError = {
  code: 'TOUR_HAS_RIDES',
  message: 'Diese Tour hat bereits Fahrten. Bitte zuerst die Fahrten löschen oder einer anderen Tour zuordnen.',
};

/** The daily journal: tours and rides of the display window and all actions on them (specs tours, rides). */
@Injectable({providedIn: 'root'})
export class JournalService {
  private readonly session = inject(SessionService);
  private readonly tourRepo = inject(TourRepository);
  private readonly rideRepo = inject(RideRepository);
  private readonly clock = inject(Clock);

  private readonly windowStart = computed(() => new Date(this.clock.now().getTime() - DISPLAY_HOURS * HOUR_MS));

  /** Listener window is fixed at login; the computed signals below narrow it as time passes. */
  private readonly loadedTours = toSignal(
    this.session.user$.pipe(
      switchMap(u => (u ? this.tourRepo.watchDaily(untracked(this.windowStart)) : of([]))),
      catchError(err => {
        console.error('Touren konnten nicht geladen werden', err);
        return of([] as Tour[]);
      }),
    ),
    {initialValue: [] as Tour[]},
  );

  private readonly loadedRides = toSignal(
    this.session.user$.pipe(
      switchMap(u => (u ? this.rideRepo.watchSince(untracked(this.windowStart)) : of([]))),
      catchError(err => {
        console.error('Fahrten konnten nicht geladen werden', err);
        return of([] as Ride[]);
      }),
    ),
    {initialValue: [] as Ride[]},
  );

  /** Active tours plus tours ended within the display window, newest first. */
  readonly tours = computed(() => {
    const since = this.windowStart().getTime();
    return this.loadedTours()
      .filter(t => rules.isActive(t) || (rules.tourEnd(t)?.getTime() ?? 0) >= since)
      .sort((a, b) => (rules.tourStart(b)?.getTime() ?? 0) - (rules.tourStart(a)?.getTime() ?? 0));
  });

  readonly activeTours = computed(() => this.tours().filter(rules.isActive));

  /** Rides alarmed within the display window, newest first. */
  readonly rides = computed(() => {
    const since = this.windowStart().getTime();
    return this.loadedRides()
      .filter(r => r.alarmAt.getTime() >= since)
      .sort((a, b) => b.alarmAt.getTime() - a.alarmAt.getTime());
  });

  /**
   * Planned slots that are running, start within the next 24 hours or ended within the display window,
   * each with its status and linked tour (spec shift-plan).
   */
  readonly plannedSlots = computed<PlannedSlotView[]>(() => {
    const now = this.clock.now();
    const tours = this.loadedTours();
    return slotsBetween(this.windowStart(), new Date(now.getTime() + PLAN_AHEAD_HOURS * HOUR_MS)).map(slot => ({
      slot,
      ...slotStatus(slot, tours, now),
    }));
  });

  /** The planned slot a tour is linked to, if any. */
  slotOf(tour: Tour): PlannedSlot | undefined {
    return slotByKey(tour.slotKey);
  }

  tourById(id: string | undefined): Tour | undefined {
    return id ? this.loadedTours().find(t => t.id === id) : undefined;
  }

  // ---- tours ----

  /** Overlap warnings of a (draft) tour against the loaded tours. They do not block saving. */
  warningsFor(tour: Tour): rules.OverlapWarning[] {
    return rules.overlapWarnings(tour, this.loadedTours());
  }

  async saveTour(tour: Tour): Promise<Result> {
    const errors = rules.validateTour(tour);
    if (errors.length) return {ok: false, errors};
    return {ok: true, id: await this.tourRepo.save(tour)};
  }

  startTour(input: StartTourInput): Promise<Result> {
    let tour: Tour = {
      kind: input.kind ?? 'SHIFT',
      shift: input.shift,
      homeVehicleId: input.homeVehicleId || undefined,
      members: [],
    };
    if (input.slotKey) tour = {...tour, slotKey: input.slotKey};
    for (const c of input.crew.filter(c => !!c.personId)) {
      tour = rules.addMember(tour, {personId: c.personId, role: c.role, from: input.at});
    }
    return this.saveTour(tour);
  }

  addMember(tour: Tour, member: Omit<CrewMember, 'id'>): Promise<Result> {
    return this.saveTour(rules.addMember(tour, member));
  }

  endMember(tour: Tour, memberId: string, at: Date): Promise<Result> {
    return this.saveTour(rules.endMember(tour, memberId, at));
  }

  replaceMember(tour: Tour, memberId: string, personId: string, at: Date): Promise<Result> {
    return this.saveTour(rules.replaceMember(tour, memberId, personId, at));
  }

  swapRoles(tour: Tour, memberIdA: string, memberIdB: string, at: Date): Promise<Result> {
    return this.saveTour(rules.swapRoles(tour, memberIdA, memberIdB, at));
  }

  endTour(tour: Tour, at: Date): Promise<Result> {
    return this.saveTour(rules.endTour(tour, at));
  }

  async deleteTour(tour: Tour): Promise<Result> {
    if (!tour.id) return {ok: false, errors: [{code: 'NOT_SAVED', message: 'Die Tour ist nicht gespeichert.'}]};
    if (await this.rideRepo.existsForTour(tour.id)) return {ok: false, errors: [TOUR_HAS_RIDES]};
    await this.tourRepo.delete(tour.id);
    return {ok: true, id: tour.id};
  }

  // ---- rides ----

  /**
   * Tours active at `at` from the live daily data, or undefined when `at` lies before the
   * display window (then use `toursForAlarm`).
   */
  activeToursAt(at: Date): Tour[] | undefined {
    if (at.getTime() < this.windowStart().getTime()) return undefined;
    return toursActiveAt(this.loadedTours(), at);
  }

  /** Tours to offer for a ride alarmed at `at`. Loads older tours when `at` lies before the display window. */
  async toursForAlarm(at: Date): Promise<Tour[]> {
    const live = this.activeToursAt(at);
    if (live) return live;
    const older = await this.tourRepo.loadForPeriod(at, new Date(at.getTime() + 1));
    return toursActiveAt(older, at);
  }

  prefillRide(tour: Tour, alarmAt: Date) {
    return prefillRide(tour, alarmAt);
  }

  async saveRide(ride: Ride): Promise<Result> {
    const errors = validateRide(ride);
    if (errors.length) return {ok: false, errors};
    return {ok: true, id: await this.rideRepo.save(ride)};
  }

  async deleteRide(ride: Ride): Promise<void> {
    if (ride.id) await this.rideRepo.delete(ride.id);
  }
}
