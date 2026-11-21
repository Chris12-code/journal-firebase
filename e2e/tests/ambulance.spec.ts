import {expect, test} from '@playwright/test';
import {loginAs, switchTo} from '../helpers/auth';
import {seedMasterData, TEST_ACCOUNTS} from '../helpers/emulator';
import {choose, dialog, expectDateTime, fillDateTime} from '../helpers/ui';

const now = new Date();
now.setSeconds(0, 0);
const start = new Date(now.getTime() - 10 * 3_600_000);
const end = new Date(start.getTime() + 9 * 3_600_000);

test.beforeEach(async () => {
  await seedMasterData();
});

test('ambulance shift: event with two cars, positions, assistances and resources counts start to end', async ({page}) => {
  await loginAs(page);
  await page.getByRole('button', {name: /Ambulanz erfassen/}).click();
  const d = dialog(page);

  await d.getByLabel('Veranstaltung / Ort').fill('Seefest Strobl');
  await fillDateTime(d, 'Beginn', start);
  await fillDateTime(d, 'Ende', end);

  // Vehicles: a default suggestion and an external number typed in
  const vehicles = d.getByPlaceholder('Nummer eingeben, z. B. 45.201');
  await vehicles.fill('44.3');
  await page.getByRole('option', {name: '44.301 (KTW)'}).click();
  await vehicles.fill('45.201');
  await vehicles.press('Enter');

  // Crew: Sanitäter and a free-text position
  await choose(d, 'Person 1', 'Eder Eva');
  await choose(d, 'Position 1', 'Sanitäter');
  await d.getByRole('button', {name: /Person hinzufügen/}).click();
  await choose(d, 'Person 2', 'Anders Anna');
  await choose(d, 'Position 2', 'Andere …');
  await d.getByLabel('Andere Position 2').fill('Fußtrupp');

  await d.getByLabel('Hilfeleistungen').fill('3');

  // Additional resources: a suggestion and free text
  const resources = d.getByPlaceholder('z. B. Polizei');
  await resources.fill('Notarzthub');
  await page.getByRole('option', {name: 'Notarzthubschrauber'}).click();
  await resources.fill('Rotes Kreuz Bad Ischl');
  await resources.press('Enter');

  await d.getByRole('button', {name: 'Speichern'}).click();
  await expect(d).toBeHidden();

  const row = page.locator('table.rides tr[data-kind="AMBULANCE"]');
  await expect(row).toContainText('Seefest Strobl · 3 Hilfeleistungen');
  await expect(row).toContainText('44.301 (KTW), 45.201');
  await expect(row).toContainText('Eder Eva (Sanitäter), Anders Anna (Fußtrupp)');
  await expect(row).toContainText('Notarzthubschrauber, Rotes Kreuz Bad Ischl');

  // Missing end is refused
  await page.getByRole('button', {name: /Ambulanz erfassen/}).click();
  const invalid = dialog(page);
  await invalid.getByLabel('Veranstaltung / Ort').fill('Ohne Ende');
  await choose(invalid, 'Person 1', 'Eder Eva');
  await invalid.getByRole('button', {name: 'Speichern'}).click();
  await expect(invalid.getByText('Bitte das Ende der Ambulanz angeben.')).toBeVisible();
  await invalid.getByRole('button', {name: 'Abbrechen'}).click();

  // Report: 9 hours and one ride for both
  // The report is for admins only
  await switchTo(page, TEST_ACCOUNTS.admin);
  await page.getByRole('link', {name: /Jahresbericht/}).click();
  if (start.getFullYear() !== now.getFullYear()) {
    await page.getByRole('combobox', {name: 'Jahr'}).click();
    await page.getByRole('option', {name: String(start.getFullYear())}).click();
  }
  for (const id of ['10005', '10001']) {
    const r = page.locator(`tr[data-person="${id}"]`);
    await expect(r.locator('td').nth(1), `hours of ${id}`).toHaveText('9:00');
    await expect(r.locator('td').nth(2), `rides of ${id}`).toHaveText('1');
  }
});

test('ambulance shift: an end time typed alone after a 19:00 start lands on the next day', async ({page}) => {
  await loginAs(page);
  await page.getByRole('button', {name: /Ambulanz erfassen/}).click();
  const d = dialog(page);
  const begin = new Date();
  begin.setHours(19, 0, 0, 0);
  await fillDateTime(d, 'Beginn', begin);
  await fillDateTime(d, 'Ende', '06:00');
  const next = new Date(begin);
  next.setDate(next.getDate() + 1);
  next.setHours(6, 0, 0, 0);
  await expectDateTime(d, 'Ende', next);
});
