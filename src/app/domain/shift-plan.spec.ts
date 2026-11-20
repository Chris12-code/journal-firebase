import {Tour} from './model';
import {slotByKey, slotsBetween, slotsForDate, slotStatus} from './shift-plan';

const summary = (d: Date) =>
  slotsForDate(d).map(s => `${s.vehicleType} ${s.shift} ${s.start.toTimeString().slice(0, 5)}-${s.end.toDateString().slice(0, 3)} ${s.end.toTimeString().slice(0, 5)}`);

describe('shift plan', () => {
  it('plans four slots on a working day', () => {
    // Wednesday 3 March 2027
    expect(summary(new Date(2027, 2, 3))).toEqual([
      'KTW DAY 06:00-Wed 17:00',
      'BTW DAY 06:30-Wed 18:00',
      'RTW DAY 07:30-Wed 19:00',
      'RTW NIGHT 19:00-Thu 06:00',
    ]);
  });

  it('plans only the RTW on a Saturday', () => {
    expect(summary(new Date(2027, 2, 6))).toEqual(['RTW DAY 07:00-Sat 19:00', 'RTW NIGHT 19:00-Sun 07:00']);
  });

  it('uses the weekend plan on a holiday weekday', () => {
    expect(slotsForDate(new Date(2027, 9, 26)).map(s => s.vehicleType)).toEqual(['RTW', 'RTW']); // Nationalfeiertag, Tuesday
  });

  it('ends the Friday night on Saturday at 07:00', () => {
    const night = slotsForDate(new Date(2027, 2, 5)).find(s => s.shift === 'NIGHT')!;
    expect(night.end).toEqual(new Date(2027, 2, 6, 7, 0));
  });

  it('ends the Sunday night on Monday at 06:00', () => {
    const night = slotsForDate(new Date(2027, 2, 7)).find(s => s.shift === 'NIGHT')!;
    expect(night.end).toEqual(new Date(2027, 2, 8, 6, 0));
  });

  it('ends the night before a holiday at 07:00', () => {
    const night = slotsForDate(new Date(2027, 9, 25)).find(s => s.shift === 'NIGHT')!; // Monday before Nationalfeiertag
    expect(night.end).toEqual(new Date(2027, 9, 26, 7, 0));
  });

  it('notes the KTW coverage on the working-day RTW day slot only', () => {
    const rtw = slotsForDate(new Date(2027, 2, 3)).find(s => s.vehicleType === 'RTW' && s.shift === 'DAY')!;
    expect(rtw.note).toBe('06:00–07:30 durch KTW abgedeckt');
    expect(slotsForDate(new Date(2027, 2, 6)).some(s => !!s.note)).toBeFalse();
  });

  it('finds a slot by its key', () => {
    expect(slotByKey('2027-03-05|NIGHT|44.201')?.end).toEqual(new Date(2027, 2, 6, 7, 0));
    expect(slotByKey('2027-03-06|DAY|44.301')).toBeUndefined(); // no KTW slot on a Saturday
    expect(slotByKey('garbage')).toBeUndefined();
    expect(slotByKey(undefined)).toBeUndefined();
  });

  it('builds stable slot keys', () => {
    expect(slotsForDate(new Date(2027, 2, 3)).map(s => s.key)).toContain('2027-03-03|NIGHT|44.201');
  });

  it('finds the slots overlapping a time span, including a running night from the previous date', () => {
    const keys = slotsBetween(new Date(2027, 2, 4, 5, 0), new Date(2027, 2, 4, 8, 0)).map(s => s.key);
    expect(keys).toEqual(['2027-03-03|NIGHT|44.201', '2027-03-04|DAY|44.301', '2027-03-04|DAY|20.410', '2027-03-04|DAY|44.201']);
  });

  describe('status', () => {
    const wednesday = slotsForDate(new Date(2027, 2, 3));
    const ktw = wednesday.find(s => s.vehicleType === 'KTW')!;
    const night = wednesday.find(s => s.shift === 'NIGHT')!;
    const tour = (slotKey: string, kind: Tour['kind'] = 'SHIFT'): Tour => ({id: 't', kind, slotKey, shift: 'DAY', members: []});

    it('is unoccupied once the start has passed without a linked tour', () => {
      expect(slotStatus(ktw, [], new Date(2027, 2, 3, 8, 0)).status).toBe('UNOCCUPIED');
    });

    it('is upcoming before its start', () => {
      expect(slotStatus(night, [], new Date(2027, 2, 3, 15, 0)).status).toBe('UPCOMING');
    });

    it('is occupied when a shift tour is linked to it', () => {
      const result = slotStatus(ktw, [tour(ktw.key)], new Date(2027, 2, 3, 8, 0));
      expect(result.status).toBe('OCCUPIED');
      expect(result.tour?.id).toBe('t');
    });

    it('treats a tour without kind as a shift tour', () => {
      const legacy: Tour = {id: 'old', slotKey: ktw.key, shift: 'DAY', members: []};
      expect(slotStatus(ktw, [legacy], new Date(2027, 2, 3, 8, 0)).status).toBe('OCCUPIED');
    });

    it('is not occupied by an extra car tour', () => {
      expect(slotStatus(ktw, [tour(ktw.key, 'EXTRA')], new Date(2027, 2, 3, 8, 0)).status).toBe('UNOCCUPIED');
    });
  });
});
