import {addDays, austrianHolidays, dateKey, easterSunday, fromDateKey, holidayName, isWorkingDay} from './calendar';

describe('calendar', () => {
  it('computes Easter Sunday', () => {
    expect(dateKey(easterSunday(2026))).toBe('2026-04-05');
    expect(dateKey(easterSunday(2027))).toBe('2027-03-28');
    expect(dateKey(easterSunday(2028))).toBe('2028-04-16');
  });

  it('lists the 13 national holidays with the movable ones of 2027', () => {
    const days = austrianHolidays(2027).map(h => h.date);
    expect(days.length).toBe(13);
    expect(days).toContain('2027-03-29'); // Ostermontag
    expect(days).toContain('2027-05-06'); // Christi Himmelfahrt
    expect(days).toContain('2027-05-17'); // Pfingstmontag
    expect(days).toContain('2027-05-27'); // Fronleichnam
  });

  it('does not treat Christmas Eve, New Year\'s Eve or Rupertitag as holidays', () => {
    expect(holidayName(new Date(2026, 11, 24))).toBeUndefined(); // Thursday
    expect(isWorkingDay(new Date(2026, 11, 24))).toBeTrue();
    expect(isWorkingDay(new Date(2026, 11, 31))).toBeTrue();
    expect(isWorkingDay(new Date(2026, 8, 24))).toBeTrue(); // Rupertitag, Thursday
  });

  it('uses the weekend plan for a holiday on a weekday', () => {
    const nationalDay = new Date(2027, 9, 26); // Tuesday
    expect(nationalDay.getDay()).toBe(2);
    expect(holidayName(nationalDay)).toBe('Nationalfeiertag');
    expect(isWorkingDay(nationalDay)).toBeFalse();
  });

  it('treats Saturday and Sunday as non-working days', () => {
    expect(isWorkingDay(new Date(2026, 10, 21))).toBeFalse(); // Saturday
    expect(isWorkingDay(new Date(2026, 10, 22))).toBeFalse(); // Sunday
    expect(isWorkingDay(new Date(2026, 10, 23))).toBeTrue(); // Monday
  });

  it('round-trips date keys and adds days across DST', () => {
    expect(dateKey(fromDateKey('2027-10-30'))).toBe('2027-10-30');
    expect(dateKey(addDays(new Date(2027, 9, 30, 19), 1))).toBe('2027-10-31');
    expect(addDays(new Date(2027, 9, 30, 19), 1).getHours()).toBe(0);
  });
});
