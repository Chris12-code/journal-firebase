import {expect, test} from '@playwright/test';
import {loginAs, switchTo} from '../helpers/auth';
import {seedMasterData, TEST_ACCOUNTS} from '../helpers/emulator';
import {choose, dialog, fillDateTime, tourCard} from '../helpers/ui';

// RTW is out, Eva and Bernd take the KTW for two transports.
//   B      B+1h  B+2h  B+3h      B+4:30
//   start  |R1==|      |R2=======|        -> hours from first ride start to last ride end: 3:30
const now = new Date();
now.setSeconds(0, 0);
const B = new Date(now.getTime() - 6 * 3_600_000);
const at = (h: number, m = 0) => new Date(B.getTime() + (h * 60 + m) * 60_000);

test.beforeEach(async () => {
  await seedMasterData();
});

test('extra car: hours run from the first ride to the last ride', async ({page}) => {
  await loginAs(page);

  await page.getByRole('link', {name: /Dienstmannschaft/}).click();
  await page.getByRole('button', {name: /Zusatzfahrzeug/}).click();
  const d = dialog(page);
  await expect(d.getByRole('heading', {name: 'Zusatzfahrzeug'})).toBeVisible();
  await choose(d, 'Stammfahrzeug', '44.301 (KTW)');
  await fillDateTime(d, 'Beginn', B);
  await choose(d, 'Fahrer', 'Eder Eva');
  await choose(d, 'Transportführer', 'Berger Bernd');
  await d.getByRole('button', {name: 'Speichern'}).click();
  await expect(d).toBeHidden();
  await expect(tourCard(page, 'Zusatzfahrzeug · 44.301 (KTW)')).toBeVisible();
  // An extra car does not occupy a planned slot
  await expect(page.locator('table.slots tr.status-OCCUPIED')).toHaveCount(0);

  for (const [alarm, back] of [[at(1), at(2)], [at(3), at(4, 30)]]) {
    await page.getByRole('link', {name: /Fahrten/}).click();
    await page.getByRole('button', {name: /Neue Fahrt/}).click();
    const ride = dialog(page);
    await fillDateTime(ride, 'Alarmierung', alarm);
    await expect(ride.getByRole('combobox', {name: 'Tour'})).toContainText('Zusatzfahrzeug · 44.301 (KTW)');
    await expect(ride.getByRole('combobox', {name: 'Fahrzeug'})).toHaveValue('44.301');
    await expect(ride.getByRole('combobox', {name: 'Person 2'})).toHaveValue('Berger Bernd');
    await fillDateTime(ride, 'Rückkehr', back);
    await choose(ride, 'Art', 'KT');
    await ride.getByRole('button', {name: 'Speichern'}).click();
    await expect(ride).toBeHidden();
  }

  // The report is for admins only
  await switchTo(page, TEST_ACCOUNTS.admin);
  await page.getByRole('link', {name: /Jahresbericht/}).click();
  if (B.getFullYear() !== now.getFullYear()) {
    await page.getByRole('combobox', {name: 'Jahr'}).click();
    await page.getByRole('option', {name: String(B.getFullYear())}).click();
  }
  for (const id of ['10005', '10002']) {
    const row = page.locator(`tr[data-person="${id}"]`);
    await expect(row.locator('td').nth(1), `hours of ${id}`).toHaveText('3:30');
    await expect(row.locator('td').nth(2), `rides of ${id}`).toHaveText('2');
  }
  // The open member entries of the extra car are not flagged: its hours come from the rides
  await expect(page.getByText('Offene Einträge (nicht gezählt)')).toHaveCount(0);
});
