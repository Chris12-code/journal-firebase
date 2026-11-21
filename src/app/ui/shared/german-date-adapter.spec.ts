import {TestBed} from '@angular/core/testing';
import {MAT_DATE_LOCALE} from '@angular/material/core';
import {GermanDateAdapter} from './german-date-adapter';

describe('GermanDateAdapter', () => {
  let adapter: GermanDateAdapter;

  beforeEach(() => {
    TestBed.configureTestingModule({providers: [GermanDateAdapter, {provide: MAT_DATE_LOCALE, useValue: 'de-AT'}]});
    adapter = TestBed.inject(GermanDateAdapter);
  });

  it('parses German dates', () => {
    expect(adapter.parse('21.11.2026')).toEqual(new Date(2026, 10, 21));
    expect(adapter.parse('1.3.26')).toEqual(new Date(2026, 2, 1));
    expect(adapter.parse('5.4.')).toEqual(new Date(new Date().getFullYear(), 3, 5));
  });

  it('rejects invalid dates and treats empty text as no date', () => {
    expect(adapter.isValid(adapter.parse('31.02.2026')!)).toBeFalse();
    expect(adapter.isValid(adapter.parse('2026-11-21x')!)).toBeFalse();
    expect(adapter.parse('')).toBeNull();
  });

  it('formats dates and times in German', () => {
    const d = new Date(2026, 10, 21, 7, 5);
    expect(adapter.format(d, {day: '2-digit', month: '2-digit', year: 'numeric'})).toBe('21.11.2026');
    expect(adapter.format(d, {hour: '2-digit', minute: '2-digit'})).toBe('07:05');
  });
});
