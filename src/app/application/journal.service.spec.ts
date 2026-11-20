import {TestBed} from '@angular/core/testing';
import {Ride} from '../domain/model';
import {endTour} from '../domain/tour';
import {dayTour, nightTour, t} from '../domain/testing/fixtures';
import {JournalService} from './journal.service';
import {fakeProviders} from './testing/fakes';

const flush = () => new Promise(r => setTimeout(r));

const ride = (tourId: string, alarmAt: Date): Ride => ({
  tourId,
  vehicleIds: ['44.201'],
  alarmAt,
  crew: [{personId: 'huber', role: 'DRIVER'}],
  type: 'RD',
});

describe('JournalService', () => {
  let fx: ReturnType<typeof fakeProviders>;
  let journal: JournalService;

  const login = async () => {
    fx.auth.subject.next({uid: 'u1', email: null});
    await flush();
  };

  beforeEach(() => {
    fx = fakeProviders(t(19)); // 3 March 2027, 19:00
    TestBed.configureTestingModule({providers: fx.providers});
    journal = TestBed.inject(JournalService);
  });

  describe('listeners follow the session', () => {
    it('does not listen while logged out', () => {
      expect(fx.tours.watchers).toBe(0);
      expect(fx.rides.watchers).toBe(0);
    });

    it('starts listening on login and stops on logout', async () => {
      await login();
      expect(fx.tours.watchers).toBe(1);
      expect(fx.rides.watchers).toBe(1);

      fx.auth.subject.next(null);
      await flush();
      expect(fx.tours.watchers).toBe(0);
      expect(fx.rides.watchers).toBe(0);
      expect(journal.tours()).toEqual([]);
    });
  });

  describe('daily view', () => {
    it('shows active tours and tours ended within the window, hides older ones', async () => {
      await fx.tours.save(dayTour());
      const old = {...endTour(dayTour(), t(6, 0, -1)), id: 'old', members: dayTour().members.map(m => ({...m, from: t(5, 0, -2), to: t(6, 0, -2)}))};
      await fx.tours.save(old);
      await login();
      expect(journal.tours().map(x => x.id)).toEqual(['day']);
    });

    it('lists rides of the window newest first', async () => {
      await fx.rides.save({...ride('day', t(8)), id: 'a'});
      await fx.rides.save({...ride('day', t(11)), id: 'b'});
      await fx.rides.save({...ride('day', t(8, 0, -2)), id: 'old'});
      await login();
      expect(journal.rides().map(r => r.id)).toEqual(['b', 'a']);
    });

    it('drops entries from the view as the clock moves on', async () => {
      await fx.rides.save({...ride('day', t(8)), id: 'a'});
      await login();
      expect(journal.rides().length).toBe(1);
      fx.now.set(t(8, 0, 1)); // 24h later
      expect(journal.rides().length).toBe(0);
    });
  });

  describe('tour actions', () => {
    beforeEach(login);

    it('starts a tour with all crew members from the start time', async () => {
      const result = await journal.startTour({
        shift: 'NIGHT', at: t(18),
        crew: [{personId: 'beer', role: 'DRIVER'}, {personId: 'eder', role: 'TPF'}, {personId: '', role: 'THIRD'}],
      });
      expect(result.ok).toBeTrue();
      const [tour] = journal.tours();
      expect(tour.homeVehicleId).toBeUndefined();
      expect(tour.members.map(m => [m.personId, m.role, m.from])).toEqual([['beer', 'DRIVER', t(18)], ['eder', 'TPF', t(18)]]);
    });

    it('refuses a tour without crew', async () => {
      const result = await journal.startTour({shift: 'DAY', at: t(6), crew: []});
      expect(result).toEqual({ok: false, errors: [jasmine.objectContaining({code: 'NO_CREW'})]});
      expect(fx.tours.store.value).toEqual([]);
    });

    it('applies crew changes and ends the tour', async () => {
      await fx.tours.save(dayTour());
      await journal.endMember(journal.tours()[0], 'x', t(14));
      await journal.replaceMember(journal.tours()[0], 'p', 'beshiri', t(15));
      await journal.endTour(journal.tours()[0], t(18, 55));
      const [tour] = journal.tours();
      expect(tour.members.find(m => m.id === 'x')!.to).toEqual(t(14));
      expect(tour.members.filter(m => m.role === 'TPF').map(m => m.personId)).toEqual(['maier', 'beshiri']);
      expect(tour.members.every(m => !!m.to)).toBeTrue();
    });

    it('warns about a person on two tours but still saves', async () => {
      await fx.tours.save(dayTour());
      const night = {...nightTour(), members: [{id: 'n1', personId: 'huber', role: 'DRIVER' as const, from: t(18)}]};
      expect(journal.warningsFor(night).length).toBe(1);
      expect((await journal.saveTour(night)).ok).toBeTrue();
    });

    it('refuses to delete a tour with rides', async () => {
      await fx.tours.save(dayTour());
      await fx.rides.save(ride('day', t(8)));
      const result = await journal.deleteTour(journal.tours()[0]);
      expect(result).toEqual({ok: false, errors: [jasmine.objectContaining({code: 'TOUR_HAS_RIDES'})]});
      expect(fx.tours.store.value.length).toBe(1);
    });

    it('deletes a tour without rides', async () => {
      await fx.tours.save(dayTour());
      expect((await journal.deleteTour(journal.tours()[0])).ok).toBeTrue();
      expect(fx.tours.store.value).toEqual([]);
    });
  });

  describe('ride actions', () => {
    beforeEach(login);

    it('offers the overtime tour and the new tour during handover', async () => {
      await fx.tours.save(endTour(dayTour(), t(18, 55)));
      await fx.tours.save(nightTour());
      expect((await journal.toursForAlarm(t(18, 20))).map(x => x.id)).toEqual(['day', 'night']);
    });

    it('answers active tours synchronously within the window only', async () => {
      await fx.tours.save(dayTour());
      expect(journal.activeToursAt(t(9))!.map(x => x.id)).toEqual(['day']);
      expect(journal.activeToursAt(t(9, 0, -3))).toBeUndefined();
    });

    it('loads older tours for an alarm time before the display window', async () => {
      const old = {...dayTour(), id: 'old', members: dayTour().members.map(m => ({...m, from: t(6, 0, -3), to: t(18, 0, -3)}))};
      await fx.tours.save(old);
      expect(journal.tours()).toEqual([]);
      expect((await journal.toursForAlarm(t(9, 0, -3))).map(x => x.id)).toEqual(['old']);
    });

    it('validates and saves a ride on another vehicle without touching the tour', async () => {
      await fx.tours.save(dayTour());
      const tour = journal.tours()[0];
      const result = await journal.saveRide({...journal.prefillRide(tour, t(9)), vehicleIds: ['44.301'], type: 'KT'});
      expect(result.ok).toBeTrue();
      expect(journal.rides()[0].vehicleIds).toEqual(['44.301']);
      expect(journal.tours()[0].homeVehicleId).toBe('44.201');
    });

    it('refuses an invalid ride', async () => {
      const result = await journal.saveRide({...ride('day', t(9)), returnedAt: t(8)});
      expect(result).toEqual({ok: false, errors: [jasmine.objectContaining({code: 'INVALID_RANGE'})]});
    });

    it('deletes a ride', async () => {
      await fx.rides.save({...ride('day', t(9)), id: 'r'});
      await journal.deleteRide(journal.rides()[0]);
      expect(journal.rides()).toEqual([]);
    });
  });

  describe('planned slots', () => {
    beforeEach(login);

    it('lists the slots of the window with status (Wednesday 19:00)', () => {
      const views = journal.plannedSlots().map(v => `${v.slot.key} ${v.status}`);
      // window: 20 h back (Tue 23:00) to 24 h ahead (Thu 19:00)
      expect(views).toEqual([
        '2027-03-02|NIGHT|44.201 UNOCCUPIED',
        '2027-03-03|DAY|44.301 UNOCCUPIED',
        '2027-03-03|DAY|20.410 UNOCCUPIED',
        '2027-03-03|DAY|44.201 UNOCCUPIED',
        '2027-03-03|NIGHT|44.201 UNOCCUPIED',
        '2027-03-04|DAY|44.301 UPCOMING',
        '2027-03-04|DAY|20.410 UPCOMING',
        '2027-03-04|DAY|44.201 UPCOMING',
      ]);
    });

    it('marks a slot occupied once a tour is started from it and finds the slot of the tour', async () => {
      const result = await journal.startTour({
        kind: 'SHIFT', slotKey: '2027-03-03|NIGHT|44.201', shift: 'NIGHT', homeVehicleId: '44.201', at: t(19),
        crew: [{personId: 'beer', role: 'DRIVER'}],
      });
      expect(result.ok).toBeTrue();
      const view = journal.plannedSlots().find(v => v.slot.key === '2027-03-03|NIGHT|44.201')!;
      expect(view.status).toBe('OCCUPIED');
      expect(journal.slotOf(view.tour!)?.end).toEqual(t(6, 0, 1));
    });

    it('starts an extra car tour that occupies no slot', async () => {
      await journal.startTour({kind: 'EXTRA', shift: 'DAY', homeVehicleId: '44.301', at: t(18), crew: [{personId: 'eder', role: 'DRIVER'}]});
      expect(journal.tours()[0].kind).toBe('EXTRA');
      expect(journal.plannedSlots().some(v => v.status === 'OCCUPIED')).toBeFalse();
    });
  });
});

