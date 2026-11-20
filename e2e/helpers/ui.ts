import {Locator, Page} from '@playwright/test';

/** Value for <input type="datetime-local"> today (+ day offset) at the given local time. */
export function localInput(hours: number, minutes = 0, dayOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(hours)}:${pad(minutes)}`;
}

/** Picks an option of a Material select identified by its label. */
export async function choose(scope: Page | Locator, label: string, option: string | RegExp): Promise<void> {
  await scope.getByRole('combobox', {name: label, exact: true}).click();
  const page = 'page' in scope ? scope.page() : scope;
  await page.getByRole('option', {name: option, exact: typeof option === 'string'}).click();
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
