import {clip, unionLength} from './interval';
import {Person, Ride, Tour} from './model';

// Yearly report (spec "yearly-report", design D2, D10).

export interface ReportRow {
  personId: string;
  name: string;
  active: boolean;
  /** Hours worked in the year, as a decimal number. */
  hours: number;
  rides: number;
}

/** A member entry without end time; it is not counted and should be fixed. */
export interface OpenEntryNotice {
  personId: string;
  name: string;
  tourId?: string;
  memberId: string;
  from: Date;
}

export interface YearReport {
  year: number;
  rows: ReportRow[];
  openEntries: OpenEntryNotice[];
}

const HOUR = 3_600_000;

/** Local midnight on 1 January of the year (inclusive) and of the next year (exclusive). */
export function yearBounds(year: number): {start: Date; end: Date} {
  return {start: new Date(year, 0, 1), end: new Date(year + 1, 0, 1)};
}

/**
 * Hours and rides per person for a calendar year.
 * - Hours: union of the person's closed member intervals, clipped to the year.
 * - Open member entries are not counted but reported as notices.
 * - Rides: rides with alarm time in the year whose crew snapshot contains the person.
 * - Rows: all active persons plus inactive or unknown persons with activity.
 */
export function yearReport(year: number, tours: Tour[], rides: Ride[], persons: Person[]): YearReport {
  const {start, end} = yearBounds(year);
  const intervals = new Map<string, {from: Date; to: Date}[]>();
  const rideCounts = new Map<string, number>();
  const openEntries: OpenEntryNotice[] = [];
  const personById = new Map(persons.map(p => [p.number, p]));
  const nameOf = (id: string) => personById.get(id)?.name ?? id;

  for (const tour of tours) {
    for (const m of tour.members) {
      if (!m.to) {
        if (m.from.getTime() < end.getTime()) {
          openEntries.push({personId: m.personId, name: nameOf(m.personId), tourId: tour.id, memberId: m.id, from: m.from});
        }
        continue;
      }
      const clipped = clip({from: m.from, to: m.to}, start, end);
      if (clipped) {
        intervals.set(m.personId, [...(intervals.get(m.personId) ?? []), clipped]);
      }
    }
  }

  for (const ride of rides) {
    const at = ride.alarmAt.getTime();
    if (at < start.getTime() || at >= end.getTime()) continue;
    for (const personId of new Set(ride.crew.map(c => c.personId).filter(Boolean))) {
      rideCounts.set(personId, (rideCounts.get(personId) ?? 0) + 1);
    }
  }

  const ids = new Set<string>([
    ...persons.filter(p => p.active).map(p => p.number),
    ...intervals.keys(),
    ...rideCounts.keys(),
  ]);

  const rows: ReportRow[] = [...ids].map(id => ({
    personId: id,
    name: nameOf(id),
    active: personById.get(id)?.active ?? false,
    hours: unionLength(intervals.get(id) ?? []) / HOUR,
    rides: rideCounts.get(id) ?? 0,
  }));
  rows.sort((a, b) => a.name.localeCompare(b.name, 'de'));
  openEntries.sort((a, b) => a.from.getTime() - b.from.getTime());

  return {year, rows, openEntries};
}
