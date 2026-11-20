// Calendar rules (spec shift-plan): Easter, the 13 national Austrian public holidays, working days.
// All dates are local calendar dates; keys have the form YYYY-MM-DD.

const pad = (n: number) => n.toString().padStart(2, '0');

/** "2027-03-28" for the local calendar date of `d`. */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local midnight of the given key. */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Local midnight of `d` plus `days` calendar days (DST-safe). */
export function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

/** Easter Sunday (Gregorian calendar, anonymous algorithm). */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

export interface Holiday {
  date: string;
  name: string;
}

/** The 13 national Austrian public holidays of a year, sorted by date. */
export function austrianHolidays(year: number): Holiday[] {
  const easter = easterSunday(year);
  const fixed = (m: number, d: number, name: string): Holiday => ({date: dateKey(new Date(year, m - 1, d)), name});
  const movable = (offset: number, name: string): Holiday => ({date: dateKey(addDays(easter, offset)), name});
  return [
    fixed(1, 1, 'Neujahr'),
    fixed(1, 6, 'Heilige Drei Könige'),
    movable(1, 'Ostermontag'),
    fixed(5, 1, 'Staatsfeiertag'),
    movable(39, 'Christi Himmelfahrt'),
    movable(50, 'Pfingstmontag'),
    movable(60, 'Fronleichnam'),
    fixed(8, 15, 'Mariä Himmelfahrt'),
    fixed(10, 26, 'Nationalfeiertag'),
    fixed(11, 1, 'Allerheiligen'),
    fixed(12, 8, 'Mariä Empfängnis'),
    fixed(12, 25, 'Christtag'),
    fixed(12, 26, 'Stefanitag'),
  ].sort((x, y) => x.date.localeCompare(y.date));
}

const holidayCache = new Map<number, Map<string, string>>();

/** Name of the public holiday on that local date, or undefined. */
export function holidayName(d: Date): string | undefined {
  const year = d.getFullYear();
  let map = holidayCache.get(year);
  if (!map) {
    map = new Map(austrianHolidays(year).map(h => [h.date, h.name]));
    holidayCache.set(year, map);
  }
  return map.get(dateKey(d));
}

/** Monday to Friday and not a public holiday. */
export function isWorkingDay(d: Date): boolean {
  const weekday = d.getDay();
  return weekday >= 1 && weekday <= 5 && !holidayName(d);
}
