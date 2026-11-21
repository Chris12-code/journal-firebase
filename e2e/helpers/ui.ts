import {expect, Locator, Page} from '@playwright/test';

/** Value for <input type="datetime-local"> today (+ day offset) at the given local time. */
export function localInput(hours: number, minutes = 0, dayOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(hours)}:${pad(minutes)}`;
}

/** Picks an option of a Material select or autocomplete identified by its label. */
export async function choose(scope: Page | Locator, label: string, option: string | RegExp): Promise<void> {
  await scope.getByRole('combobox', {name: label, exact: true}).click();
  const page = 'page' in scope ? scope.page() : scope;
  await page.getByRole('option', {name: option, exact: typeof option === 'string'}).click();
  // Wait until the panel and its transparent backdrop are gone; otherwise the next click is intercepted.
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(page.locator('.cdk-overlay-transparent-backdrop')).toHaveCount(0);
}

export function dialog(page: Page): Locator {
  return page.getByRole('dialog');
}

/** The tour card whose title is exactly `title` (e.g. "Tag · 44.201 (RTW)"). */
export function tourCard(page: Page, title: string): Locator {
  return page.locator('mat-card').filter({has: page.locator('mat-card-title', {hasText: new RegExp(`^\\s*${title.replace(/[.()]/g, '\\$&')}\\s*$`)})});
}

/** Value for <input type="datetime-local"> for the given date (local time). */
export function toInput(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const pad2 = (n: number) => n.toString().padStart(2, '0');

/** "21.11.2026 14:05", as shown by an app-datetime-field. */
export function dateTimeText(d: Date): string {
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** The text input of the app-datetime-field labelled `label`. */
export function dateTimeInput(scope: Page | Locator, label: string): Locator {
  return scope.getByRole('textbox', {name: label, exact: true});
}

/** Types a point in time (or any text, e.g. "06:00") into an app-datetime-field and leaves the field. */
export async function fillDateTime(scope: Page | Locator, label: string, value: Date | string): Promise<void> {
  const field = dateTimeInput(scope, label);
  await field.fill(typeof value === 'string' ? value : dateTimeText(value));
  await field.blur();
}

/** Reads the point in time shown by an app-datetime-field. */
export async function readDateTime(scope: Page | Locator, label: string): Promise<Date> {
  const [date, time] = (await dateTimeInput(scope, label).inputValue()).split(' ');
  const [day, month, year] = date.split('.').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes);
}

/** Asserts the point in time shown by an app-datetime-field. */
export async function expectDateTime(scope: Page | Locator, label: string, d: Date): Promise<void> {
  await expect(dateTimeInput(scope, label)).toHaveValue(dateTimeText(d));
}

/** Today (+ day offset) at the given local time. */
export function todayAt(hours: number, minutes = 0, dayOffset = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

/** Confirms the Material confirm dialog (e.g. before deleting). */
export async function confirmDialog(page: Page, button = 'Löschen'): Promise<void> {
  const d = page.getByRole('dialog').filter({has: page.getByRole('button', {name: button, exact: true})});
  await d.getByRole('button', {name: button, exact: true}).click();
  await expect(d).toBeHidden();
}
