import {provideZonelessChangeDetection} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE} from '@angular/material/core';
import {DateTimeFieldComponent} from './datetime-field.component';
import {GERMAN_DATE_FORMATS, GermanDateAdapter} from './german-date-adapter';

describe('DateTimeFieldComponent', () => {
  let fixture: ComponentFixture<DateTimeFieldComponent>;
  let input: HTMLInputElement;

  const type = async (text: string) => {
    input.dispatchEvent(new Event('focus'));
    input.value = text;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {provide: MAT_DATE_LOCALE, useValue: 'de-AT'},
        {provide: DateAdapter, useClass: GermanDateAdapter},
        {provide: MAT_DATE_FORMATS, useValue: GERMAN_DATE_FORMATS},
      ],
    });
    fixture = TestBed.createComponent(DateTimeFieldComponent);
    fixture.componentRef.setInput('label', 'Ende');
    fixture.componentInstance.value.set(new Date(2027, 2, 3, 14, 5));
    await fixture.whenStable();
    input = fixture.nativeElement.querySelector('input');
  });

  it('shows an outside value as text', () => {
    expect(input.value).toBe('03.03.2027 14:05');
  });

  it('emits a typed value and shows it completed after leaving the field', async () => {
    await type('18:55');
    expect(fixture.componentInstance.value()).toEqual(new Date(2027, 2, 3, 18, 55));
    expect(input.value).toBe('03.03.2027 18:55');
  });

  it('uses the reference day (or the next day) for a time typed into an empty field', async () => {
    fixture.componentInstance.value.set(undefined);
    fixture.componentRef.setInput('reference', new Date(2027, 2, 3, 19, 0));
    await fixture.whenStable();
    await type('06:00');
    expect(fixture.componentInstance.value()).toEqual(new Date(2027, 2, 4, 6, 0));
  });

  it('is undefined and flagged after leaving the field with invalid text', async () => {
    await type('31.02.2027 10:00');
    expect(fixture.componentInstance.value()).toBeUndefined();
    expect(fixture.nativeElement.textContent).toContain('Ungültig');
  });

  it('is undefined for empty text', async () => {
    await type('');
    expect(fixture.componentInstance.value()).toBeUndefined();
    expect(fixture.nativeElement.textContent).not.toContain('Ungültig');
  });

  it('sets the current minute with the now button', async () => {
    (fixture.nativeElement.querySelector('button[aria-label="Ende jetzt"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    const v = fixture.componentInstance.value()!;
    expect(v.getSeconds()).toBe(0);
    expect(Math.abs(v.getTime() - Date.now())).toBeLessThan(61_000);
  });
});
