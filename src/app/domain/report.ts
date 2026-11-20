import {clip, unionLength} from './interval';
import {Person, Ride, Tour} from './model';

// Yearly report (spec "yearly-report", design D5, D10).

export interface ReportRow {
  personId: string;
  name: string;
  active: boolean;
  /** Hours worked in the year, as a decimal number. */
  hours: number;
  rides: number;
}

/**
 * Something that is not counted because a time is missing and should be fixed:
 * MEMBER: a shift tour member entry without end time (`name` is the person);
 * RIDE: a ride of an extra car tour without return time (`name` lists its crew).
 */
export interface OpenEntryNotice {
  kind: 'MEMBER' | 'RIDE';
  /** Member id or ride id, unique within the report. */
  key: string;
  /** Person concerned (MEMBER notices only). */
  personId?: string;
  name: string;
  tourId?: string;
  /** Member start or ride alarm time. */
  from: Date;
}

export interface YearReport {
  year: number;
  rows: ReportRow[];
  openEntries: OpenEntryNotice[];
}

const HOUR = 3_600_000;

type Span = {from: Date; to: Date};

/** Local midnight on 1 January of the year (inclusive) and of the next year (exclusive). */
export function yearBounds(year: number): {start: Date; end: Date} {
  return {start: new Date(year, 0, 1), end: new Date(year + 1, 0, 1)};
}

/**
 * Hours and rides per person for a calendar year.
 * Hours are the union of the person's working intervals, clipped to the year:
 * - closed member entries of shift tours;
 * - per extra car tour: from the earliest alarm to the latest return of its rides containing the person;
 * - ambulance shifts: start to end for every crew member.
 * Open member entries and extra-car rides without return time are not counted but reported as notices.
 * Rides: rides alarmed in the year whose crew contains the person (an ambulance shift counts once).
 * Rows: all active persons plus inactive or unknown persons with activity.
 */
export function yearReport(year: number, tours: Tour[], rides: Ride[], persons: Person[]): YearReport {
  const {start, end} = yearBounds(year);
  const intervals = new Map<string, Span[]>();
  const rideCounts = new Map<string, number>();
  const openEntries: OpenEntryNotice[] = [];
  const personById = new Map(persons.map(p => [p.number, p]));
  const tourById = new Map(tours.filter(t => !!t.id).map(t => [t.id!, t]));
  const nameOf = (id: string) => personById.get(id)?.name ?? id;
  const crewIds = (ride: Ride) => [...new Set(ride.crew.map(c => c.personId).filter(Boolean))];

  const addInterval = (personId: string, span: Span) => {
    const clipped = clip(span, start, end);
    if (clipped) intervals.set(personId, [...(intervals.get(personId) ?? []), clipped]);
  };

  // 1. Shift tours: member times. Member times of extra car tours are ignored.
  for (const tour of tours) {
    if (tour.kind === 'EXTRA') continue;
    for (const m of tour.members) {
      if (m.to) {
        addInterval(m.personId, {from: m.from, to: m.to});
      } else if (m.from.getTime() < end.getTime()) {
        openEntries.push({kind: 'MEMBER', key: m.id, personId: m.personId, name: nameOf(m.personId), tourId: tour.id, from: m.from});
      }
    }
  }

  // 2. + 3. Rides: counts, extra-car spans, ambulance spans.
  const extraSpans = new Map<string, Span>(); // key: tourId|personId
  for (const ride of rides) {
    const alarm = ride.alarmAt.getTime();
    const inYear = alarm >= start.getTime() && alarm < end.getTime();
    const crew = crewIds(ride);

    if (inYear) {
      for (const personId of crew) rideCounts.set(personId, (rideCounts.get(personId) ?? 0) + 1);
    }

    if (ride.kind === 'AMBULANCE') {
      if (ride.returnedAt) for (const personId of crew) addInterval(personId, {from: ride.alarmAt, to: ride.returnedAt});
      continue;
    }

    const tour = ride.tourId ? tourById.get(ride.tourId) : undefined;
    if (tour?.kind !== 'EXTRA') continue;

    if (!ride.returnedAt) {
      if (inYear) {
        openEntries.push({
          kind: 'RIDE',
          key: ride.id ?? `${ride.tourId}|${alarm}`,
          name: crew.map(nameOf).join(', '),
          tourId: ride.tourId,
          from: ride.alarmAt,
        });
      }
      continue;
    }
    for (const personId of crew) {
      const key = `${ride.tourId}|${personId}`;
      const span = extraSpans.get(key);
      extraSpans.set(key, {
        from: span && span.from.getTime() < alarm ? span.from : ride.alarmAt,
        to: span && span.to.getTime() > ride.returnedAt.getTime() ? span.to : ride.returnedAt,
      });
    }
  }
  for (const [key, span] of extraSpans) {
    addInterval(key.slice(key.indexOf('|') + 1), span);
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
