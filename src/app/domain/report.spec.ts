import {Person, Ride, Tour} from './model';
import {yearReport} from './report';
import {endTour, swapRoles} from './tour';
import {dayTour, nightTour, t} from './testing/fixtures';

const person = (number: string, active = true): Person => ({number, name: number, active});
const persons = ['huber', 'maier', 'beer', 'beshiri', 'eder'].map(n => person(n));

const ride = (alarmAt: Date, personIds: string[], vehicleId = '44.201'): Ride => ({
  tourId: 'day',
  vehicleId,
  alarmAt,
  crew: personIds.map(personId => ({personId, role: 'DRIVER' as const})),
  type: 'RD',
});

const row = (report: ReturnType<typeof yearReport>, id: string) => report.rows.find(r => r.personId === id)!;

describe('yearly report', () => {
  it('lists every active person with hours and rides', () => {
    const report = yearReport(2027, [endTour(dayTour(), t(18))], [ride(t(8), ['huber', 'maier'])], persons);
    expect(report.year).toBe(2027);
    expect(report.rows.map(r => r.personId).sort()).toEqual(['beer', 'beshiri', 'eder', 'huber', 'maier']);
    expect(row(report, 'huber')).toEqual(jasmine.objectContaining({hours: 12, rides: 1}));
  });

  describe('hours', () => {
    it('counts a role change within the tour as continuous time', () => {
      const tour = endTour(swapRoles(dayTour(), 'd', 'p', t(10, 30)), t(18));
      const report = yearReport(2027, [tour], [], persons);
      expect(row(report, 'huber').hours).toBe(12);
      expect(row(report, 'maier').hours).toBe(12);
    });

    it('counts the overtime of the DAY crew and the start of the NIGHT crew', () => {
      const day = endTour(dayTour(), t(18, 55));
      const night = endTour(nightTour(), t(6, 0, 1));
      const report = yearReport(2027, [day, night], [], persons);
      expect(row(report, 'huber').hours).toBeCloseTo(12 + 55 / 60, 6);
      expect(row(report, 'beshiri').hours).toBe(12);
    });

    it('counts overlapping entries of the same person only once', () => {
      const day: Tour = {id: 'a', shift: 'DAY', members: [{id: 'm1', personId: 'huber', role: 'DRIVER', from: t(6), to: t(18, 55)}]};
      const night: Tour = {id: 'b', shift: 'NIGHT', members: [{id: 'm2', personId: 'huber', role: 'DRIVER', from: t(18), to: t(6, 0, 1)}]};
      expect(row(yearReport(2027, [day, night], [], persons), 'huber').hours).toBe(24);
    });

    it('splits a New Year night shift between the two years', () => {
      const tour: Tour = {
        id: 'nye', shift: 'NIGHT',
        members: [{id: 'm', personId: 'huber', role: 'DRIVER', from: new Date(2026, 11, 31, 18), to: new Date(2027, 0, 1, 6)}],
      };
      expect(row(yearReport(2026, [tour], [], persons), 'huber').hours).toBe(6);
      expect(row(yearReport(2027, [tour], [], persons), 'huber').hours).toBe(6);
    });

    it('counts real elapsed time over the DST change (Europe/Vienna)', () => {
      // 30/31 October 2027: clocks go back from 03:00 to 02:00, the night has 13 hours.
      if (Intl.DateTimeFormat().resolvedOptions().timeZone !== 'Europe/Vienna') {
        pending('requires TZ=Europe/Vienna (use npm run test:ci)');
      }
      const tour: Tour = {
        id: 'dst', shift: 'NIGHT',
        members: [{id: 'm', personId: 'huber', role: 'DRIVER', from: new Date(2027, 9, 30, 18), to: new Date(2027, 9, 31, 6)}],
      };
      expect(row(yearReport(2027, [tour], [], persons), 'huber').hours).toBe(13);
    });
  });

  describe('open entries', () => {
    it('does not count open entries and reports them as notices', () => {
      const report = yearReport(2027, [dayTour()], [], persons);
      expect(row(report, 'huber').hours).toBe(0);
      expect(report.openEntries.length).toBe(3);
      expect(report.openEntries[0]).toEqual(jasmine.objectContaining({personId: 'huber', tourId: 'day', from: t(6)}));
    });

    it('ignores open entries that start after the selected year', () => {
      expect(yearReport(2026, [dayTour()], [], persons).openEntries).toEqual([]);
    });
  });

  describe('rides', () => {
    it('counts rides on another vehicle for every person in the snapshot', () => {
      const report = yearReport(2027, [], [ride(t(9), ['huber', 'maier'], '80.103'), ride(t(11), ['huber'])], persons);
      expect(row(report, 'huber').rides).toBe(2);
      expect(row(report, 'maier').rides).toBe(1);
    });

    it('counts a person only once per ride even with two crew entries', () => {
      expect(row(yearReport(2027, [], [ride(t(9), ['huber', 'huber'])], persons), 'huber').rides).toBe(1);
    });

    it('only counts rides alarmed within the year', () => {
      const report = yearReport(2027, [], [ride(new Date(2026, 11, 31, 23, 59), ['huber']), ride(new Date(2028, 0, 1), ['huber'])], persons);
      expect(row(report, 'huber').rides).toBe(0);
    });
  });

  describe('persons listed', () => {
    it('lists an active person without activity with zeros', () => {
      expect(row(yearReport(2027, [], [], persons), 'eder')).toEqual(jasmine.objectContaining({hours: 0, rides: 0, active: true}));
    });

    it('lists an inactive person only when they have activity', () => {
      const all = [...persons, {number: 'alt', name: 'Former', active: false}, {number: 'gone', name: 'Gone', active: false}];
      const report = yearReport(2027, [], [ride(t(9), ['alt'])], all);
      expect(row(report, 'alt')).toEqual(jasmine.objectContaining({name: 'Former', active: false, rides: 1}));
      expect(report.rows.some(r => r.personId === 'gone')).toBeFalse();
    });
  });
});
