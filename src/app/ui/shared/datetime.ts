// Conversion between Date and the value of <input type="datetime-local"> (browser local time, design D10).

const pad = (n: number) => n.toString().padStart(2, '0');

export function toLocalInput(date: Date | undefined): string {
  if (!date) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromLocalInput(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}

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
