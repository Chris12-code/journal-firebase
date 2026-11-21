// Date/time helpers for the UI (browser local time, design D10).

const pad = (n: number) => n.toString().padStart(2, '0');

/** Current time rounded down to the minute. */
export function nowMinute(): Date {
  const d = new Date();
  d.setSeconds(0, 0);
  return d;
}

/** "14:05" or "03.03. 14:05" when not on the reference day. */
export function formatTime(date: Date | undefined, reference: Date = new Date()): string {
  if (!date) return '';
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return date.toDateString() === reference.toDateString() ? time : `${pad(date.getDate())}.${pad(date.getMonth() + 1)}. ${time}`;
}

/** Hours as "12:55". */
export function formatHours(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  return `${Math.floor(totalMinutes / 60)}:${pad(totalMinutes % 60)}`;
}

/** "21.11.2026 14:05" – the text shown in a date-time field. */
export function formatDateTime(date: Date): string {
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** What a date-time field knows when completing a partial entry. */
export interface DateTimeContext {
  /** The field's value before the user started typing; its date or time is kept. */
  base?: Date;
  /** Start of the range this field ends (e.g. the alarm for the return time). */
  reference?: Date;
  now: Date;
}

/**
 * The given time of day on the right day: the base's date when there is one; otherwise the reference's
 * date, moved to the next day when that would not be after the reference (a night ending at 06:00);
 * otherwise today.
 */
export function atTimeOfDay(hours: number, minutes: number, ctx: DateTimeContext): Date {
  const day = ctx.base ?? ctx.reference ?? ctx.now;
  const result = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes);
  if (!ctx.base && ctx.reference && result.getTime() <= ctx.reference.getTime()) result.setDate(result.getDate() + 1);
  return result;
}

const DATE = String.raw`(\d{1,2})\.(\d{1,2})(?:\.(\d{4}|\d{2})?)?`;
const TIME = String.raw`(\d{1,2})(?::?(\d{2}))?`;
const DATE_TIME = new RegExp(`^${DATE}(?:\\s+|\\s*,\\s*)${TIME}$`);
const DATE_ONLY = new RegExp(`^${DATE}$`);
const TIME_ONLY = new RegExp(`^${TIME}$`);

/**
 * Parses German date-time text: "21.11.2026 14:05", "21.11. 1405", "21.11.26 14", a date alone
 * (keeps the time of the base, else now) or a time alone (see `atTimeOfDay`).
 * Returns `undefined` for empty text and `null` for text that is not a valid point in time.
 */
export function parseDateTime(text: string, ctx: DateTimeContext): Date | undefined | null {
  const value = text.trim();
  if (!value) return undefined;

  const time = (h?: string, m?: string): [number, number] | null => {
    const hours = Number(h);
    const minutes = m === undefined ? 0 : Number(m);
    return hours <= 23 && minutes <= 59 ? [hours, minutes] : null;
  };
  const date = (d: string, m: string, y?: string): Date | null => {
    const fallbackYear = (ctx.base ?? ctx.reference ?? ctx.now).getFullYear();
    const year = y === undefined ? fallbackYear : y.length === 2 ? 2000 + Number(y) : Number(y);
    const result = new Date(year, Number(m) - 1, Number(d));
    // Reject overflow such as 31.02.
    return result.getMonth() === Number(m) - 1 && result.getDate() === Number(d) ? result : null;
  };

  let match = DATE_TIME.exec(value);
  if (match) {
    const day = date(match[1], match[2], match[3]);
    const hm = time(match[4], match[5]);
    return day && hm ? new Date(day.getFullYear(), day.getMonth(), day.getDate(), hm[0], hm[1]) : null;
  }
  match = DATE_ONLY.exec(value);
  if (match) {
    const day = date(match[1], match[2], match[3]);
    const from = ctx.base ?? ctx.now;
    return day ? new Date(day.getFullYear(), day.getMonth(), day.getDate(), from.getHours(), from.getMinutes()) : null;
  }
  match = TIME_ONLY.exec(value);
  if (match) {
    const hm = time(match[1], match[2]);
    return hm ? atTimeOfDay(hm[0], hm[1], ctx) : null;
  }
  return null;
}
