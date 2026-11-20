import {formatHours, formatTime, fromLocalInput, toLocalInput} from './datetime';

describe('datetime helpers', () => {
  it('round-trips datetime-local values in local time', () => {
    const d = new Date(2027, 2, 3, 18, 55);
    expect(toLocalInput(d)).toBe('2027-03-03T18:55');
    expect(fromLocalInput('2027-03-03T18:55')).toEqual(d);
    expect(fromLocalInput('')).toBeUndefined();
  });

  it('formats times relative to a reference day', () => {
    const ref = new Date(2027, 2, 3, 12);
    expect(formatTime(new Date(2027, 2, 3, 7, 5), ref)).toBe('07:05');
    expect(formatTime(new Date(2027, 2, 2, 23, 0), ref)).toBe('02.03. 23:00');
  });

  it('formats decimal hours as h:mm', () => {
    expect(formatHours(12 + 55 / 60)).toBe('12:55');
    expect(formatHours(0)).toBe('0:00');
  });
});
