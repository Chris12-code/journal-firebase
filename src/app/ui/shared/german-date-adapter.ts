import {Injectable} from '@angular/core';
import {MatDateFormats, NativeDateAdapter} from '@angular/material/core';

/**
 * Native date adapter that understands German input: dates as "21.11.2026", "21.11.26" or "21.11."
 * (current year). Used by the calendar in `app-datetime-field`.
 */
@Injectable()
export class GermanDateAdapter extends NativeDateAdapter {
  override parse(value: unknown, parseFormat?: unknown): Date | null {
    if (typeof value === 'string') {
      const text = value.trim();
      if (!text) return null;
      const m = /^(\d{1,2})\.(\d{1,2})\.?(\d{2}|\d{4})?$/.exec(text);
      if (m) {
        const day = +m[1];
        const month = +m[2] - 1;
        const year = m[3] === undefined ? this.today().getFullYear() : m[3].length === 2 ? 2000 + +m[3] : +m[3];
        const date = new Date(year, month, day);
        // Reject overflow such as 31.02.
        return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day ? date : this.invalid();
      }
      return this.invalid();
    }
    return super.parse(value, parseFormat);
  }
}

export const GERMAN_DATE_FORMATS: MatDateFormats = {
  parse: {dateInput: null, timeInput: null},
  display: {
    dateInput: {day: '2-digit', month: '2-digit', year: 'numeric'},
    timeInput: {hour: '2-digit', minute: '2-digit'},
    monthYearLabel: {year: 'numeric', month: 'short'},
    dateA11yLabel: {year: 'numeric', month: 'long', day: 'numeric'},
    monthYearA11yLabel: {year: 'numeric', month: 'long'},
    timeOptionLabel: {hour: '2-digit', minute: '2-digit'},
  },
};
