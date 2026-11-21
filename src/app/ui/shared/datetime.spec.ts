import {atTimeOfDay, formatDateTime, formatHours, formatTime, parseDateTime} from './datetime';

describe('datetime helpers', () => {
  it('formats times relative to a reference day', () => {
    const ref = new Date(2027, 2, 3, 12);
    expect(formatTime(new Date(2027, 2, 3, 7, 5), ref)).toBe('07:05');
    expect(formatTime(new Date(2027, 2, 2, 23, 0), ref)).toBe('02.03. 23:00');
  });

  it('formats decimal hours as h:mm', () => {
    expect(formatHours(12 + 55 / 60)).toBe('12:55');
    expect(formatHours(0)).toBe('0:00');
  });

  it('formats a point in time for a date-time field', () => {
    expect(formatDateTime(new Date(2026, 10, 21, 7, 5))).toBe('21.11.2026 07:05');
  });
});

describe('parseDateTime', () => {
  const now = new Date(2026, 10, 21, 10, 30);
  const parse = (text: string, ctx: {base?: Date; reference?: Date} = {}) => parseDateTime(text, {now, ...ctx});

  it('parses full and short German forms', () => {
    expect(parse('21.11.2026 14:05')).toEqual(new Date(2026, 10, 21, 14, 5));
    expect(parse('3.1.27 1405')).toEqual(new Date(2027, 0, 3, 14, 5));
    expect(parse('21.11. 14')).toEqual(new Date(2026, 10, 21, 14, 0));
    expect(parse('21.11, 9:30')).toEqual(new Date(2026, 10, 21, 9, 30));
  });

  it('keeps the time of the base for a date alone, else the current time', () => {
    expect(parse('22.11.2026', {base: new Date(2026, 10, 21, 19, 0)})).toEqual(new Date(2026, 10, 22, 19, 0));
    expect(parse('22.11.')).toEqual(new Date(2026, 10, 22, 10, 30));
  });

  it('keeps the date of the base for a time alone, else today', () => {
    expect(parse('23:50', {base: new Date(2026, 10, 19, 8, 0)})).toEqual(new Date(2026, 10, 19, 23, 50));
    expect(parse('905')).toEqual(new Date(2026, 10, 21, 9, 5));
  });

  it('puts a time alone after the reference (smart end time)', () => {
    const start = new Date(2026, 10, 21, 19, 0);
    expect(parse('06:00', {reference: start})).toEqual(new Date(2026, 10, 22, 6, 0));
    expect(parse('23:00', {reference: start})).toEqual(new Date(2026, 10, 21, 23, 0));
    expect(parse('19:00', {reference: start})).toEqual(new Date(2026, 10, 22, 19, 0));
    // An existing value wins over the reference
    expect(parse('06:00', {reference: start, base: new Date(2026, 10, 21, 20, 0)})).toEqual(new Date(2026, 10, 21, 6, 0));
  });

  it('returns undefined for empty and null for invalid text', () => {
    expect(parse('  ')).toBeUndefined();
    expect(parse('31.02.2026 10:00')).toBeNull();
    expect(parse('21.11.2026 25:00')).toBeNull();
    expect(parse('morgen')).toBeNull();
  });

  it('applies the reference rule to picked times as well', () => {
    const start = new Date(2026, 10, 21, 19, 0);
    expect(atTimeOfDay(6, 0, {reference: start, now})).toEqual(new Date(2026, 10, 22, 6, 0));
    expect(atTimeOfDay(6, 0, {now})).toEqual(new Date(2026, 10, 21, 6, 0));
  });
});
