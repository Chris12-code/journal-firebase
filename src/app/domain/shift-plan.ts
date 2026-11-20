import {addDays, dateKey, fromDateKey, isWorkingDay} from './calendar';
import {Shift, Tour, VehicleType} from './model';

// Planned shift slots (spec shift-plan). The plan is a constant; slots are derived per service date.
// A slot belongs to the date it starts on (a night slot to the evening it starts).

export interface PlannedSlot {
  /** Stable key "YYYY-MM-DD|DAY|44.201". */
  key: string;
  /** Service date (start date) as YYYY-MM-DD. */
  date: string;
  shift: Shift;
  vehicleId: string;
  vehicleType: VehicleType;
  start: Date;
  end: Date;
  note?: string;
}

interface SlotTemplate {
  shift: Shift;
  vehicleId: string;
  vehicleType: VehicleType;
  start: string;
  /** "HH:MM" on the same day, or 'NIGHT' for the night-end rule on the following day. */
  end: string | 'NIGHT';
  note?: string;
}

export const WORKING_DAY_PLAN: readonly SlotTemplate[] = [
  {shift: 'DAY', vehicleId: '44.301', vehicleType: 'KTW', start: '06:00', end: '17:00'},
  {shift: 'DAY', vehicleId: '20.410', vehicleType: 'BTW', start: '06:30', end: '18:00'},
  {shift: 'DAY', vehicleId: '44.201', vehicleType: 'RTW', start: '07:30', end: '19:00', note: '06:00–07:30 durch KTW abgedeckt'},
  {shift: 'NIGHT', vehicleId: '44.201', vehicleType: 'RTW', start: '19:00', end: 'NIGHT'},
];

export const WEEKEND_PLAN: readonly SlotTemplate[] = [
  {shift: 'DAY', vehicleId: '44.201', vehicleType: 'RTW', start: '07:00', end: '19:00'},
  {shift: 'NIGHT', vehicleId: '44.201', vehicleType: 'RTW', start: '19:00', end: 'NIGHT'},
];

/** Night shifts end at 06:00 on a working day, otherwise at 07:00. */
export const NIGHT_END_WORKING_DAY = '06:00';
export const NIGHT_END_OTHER_DAY = '07:00';

function at(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
}

export function slotKey(date: string, shift: Shift, vehicleId: string): string {
  return `${date}|${shift}|${vehicleId}`;
}

/** The planned slots of one service date, ordered by start. */
export function slotsForDate(date: Date): PlannedSlot[] {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const key = dateKey(day);
  const plan = isWorkingDay(day) ? WORKING_DAY_PLAN : WEEKEND_PLAN;
  return plan
    .map(t => {
      let end: Date;
      if (t.end === 'NIGHT') {
        const next = addDays(day, 1);
        end = at(next, isWorkingDay(next) ? NIGHT_END_WORKING_DAY : NIGHT_END_OTHER_DAY);
      } else {
        end = at(day, t.end);
      }
      const slot: PlannedSlot = {
        key: slotKey(key, t.shift, t.vehicleId),
        date: key,
        shift: t.shift,
        vehicleId: t.vehicleId,
        vehicleType: t.vehicleType,
        start: at(day, t.start),
        end,
      };
      return t.note ? {...slot, note: t.note} : slot;
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** The planned slot with that key, or undefined (e.g. when the plan has changed since). */
export function slotByKey(key: string | undefined): PlannedSlot | undefined {
  if (!key) return undefined;
  const date = key.split('|')[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  return slotsForDate(fromDateKey(date)).find(s => s.key === key);
}

/** All planned slots overlapping [from, to), ordered by start. */
export function slotsBetween(from: Date, to: Date): PlannedSlot[] {
  const result: PlannedSlot[] = [];
  for (let day = addDays(from, -1); day.getTime() < to.getTime(); day = addDays(day, 1)) {
    for (const slot of slotsForDate(day)) {
      if (slot.start.getTime() < to.getTime() && slot.end.getTime() > from.getTime()) result.push(slot);
    }
  }
  return result.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export type SlotStatus = 'OCCUPIED' | 'UPCOMING' | 'UNOCCUPIED';

/** Occupied when a shift tour is linked to the slot; otherwise upcoming before its start, unoccupied after. */
export function slotStatus(slot: PlannedSlot, tours: Tour[], now: Date): {status: SlotStatus; tour?: Tour} {
  const tour = tours.find(t => (t.kind ?? 'SHIFT') === 'SHIFT' && t.slotKey === slot.key);
  if (tour) return {status: 'OCCUPIED', tour};
  return {status: now.getTime() < slot.start.getTime() ? 'UPCOMING' : 'UNOCCUPIED'};
}
