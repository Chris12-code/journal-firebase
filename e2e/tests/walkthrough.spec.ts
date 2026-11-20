import {expect, Page, test} from '@playwright/test';
import {loginAs} from '../helpers/auth';
import {seedMasterData} from '../helpers/emulator';
import {choose, dialog, toInput, tourCard} from '../helpers/ui';

// Full day on the journal sheet through the UI, then the yearly report against hand-calculated totals.
//
//             B      B+1h   B+4h   B+5h   B+6h        B+12h  B+12:20  B+12:55  B+13h (= now)
// DAY  Anna   |-----------------------------------------------------------|           12:55
//      Bernd  |--------------|                                                         4:00
//      Daniel                |------------------------------------------|             8:55
//      Clara  |---------------------------|                                            6:00
// NIGHT Eva                                           |-----------------------------|  1:00
//      Bernd                                          |-----------------------------|  1:00
// rides         R1 (RTW)            R2 (KTW)                   R3 (RTW, DAY tour in overtime)

const now = new Date();
now.setSeconds(0, 0);
const B = new Date(now.getTime() - 13 * 3_600_000);
const at = (h: number, m = 0) => new Date(B.getTime() + (h * 60 + m) * 60_000);

async function logRide(page: Page, alarm: Date, opts: {tour?: RegExp; vehicle?: string; removeCrew?: string; type: string}) {
  await page.getByRole('link', {name: /Fahrten/}).click();
  await page.getByRole('button', {name: /Neue Fahrt/}).click();
  const ride = dialog(page);
  await ride.getByLabel('Alarmierung').fill(toInput(alarm));
  await ride.getByLabel('Alarmierung').blur();
  if (opts.tour) await choose(ride, 'Tour', opts.tour);
  await expect(ride.getByRole('combobox', {name: 'Person 1'})).not.toBeEmpty();
  if (opts.vehicle) await choose(ride, 'Fahrzeug', opts.vehicle);
  if (opts.removeCrew) await ride.getByRole('button', {name: `Entfernen ${opts.removeCrew}`}).click();
  await choose(ride, 'Art', opts.type);
  await ride.getByRole('button', {name: 'Speichern'}).click();
  await expect(ride).toBeHidden();
}

async function crewChange(page: Page, card: ReturnType<typeof tourCard>, button: string | RegExp, time: Date, confirm: string, person?: string) {
  await card.getByRole('button', {name: button}).click();
  const d = dialog(page);
  if (person) await choose(d, 'Neue Person', person);
  await d.getByLabel('Zeitpunkt').fill(toInput(time));
  await d.getByRole('button', {name: confirm}).click();
  await expect(d).toBeHidden();
}

test.beforeEach(async () => {
  await seedMasterData();
});

test('walkthrough: a full day on the journal sheet adds up in the yearly report', async ({page}) => {
  test.setTimeout(120_000);
  await loginAs(page);

  // DAY tour on the RTW
  await page.getByRole('link', {name: /Dienstmannschaft/}).click();
  await page.getByRole('button', {name: /Tour beginnen/}).click();
  let d = dialog(page);
  await choose(d, 'Schicht', 'Tag');
  await choose(d, 'Stammfahrzeug', '44.201 (RTW)');
  await d.getByLabel('Beginn').fill(toInput(B));
  await choose(d, 'Fahrer', 'Anders Anna');
  await choose(d, 'Transportführer', 'Berger Bernd');
  await choose(d, 'Dritter', 'Csar Clara');
  await d.getByRole('button', {name: 'Speichern'}).click();
  await expect(d).toBeHidden();
  const day = tourCard(page, 'Tag · 44.201 (RTW)');

  // R1 with the full crew; then Daniel replaces Bernd
  await logRide(page, at(1), {type: 'RD'});
  await page.getByRole('link', {name: /Dienstmannschaft/}).click();
  await crewChange(page, day, 'Ersetzen Berger Bernd', at(4), 'Mitglied ersetzen', 'Doppler Daniel');

  // R2 on the KTW without the third person; then Clara leaves
  await logRide(page, at(5), {vehicle: '80.103 (KTW)', removeCrew: 'Csar Clara', type: 'KT'});
  await page.getByRole('link', {name: /Dienstmannschaft/}).click();
  await crewChange(page, day, 'Austragen Csar Clara', at(6), 'Mitglied austragen');

  // NIGHT tour without vehicle starts while the DAY tour is still out
  await page.getByRole('button', {name: /Tour beginnen/}).click();
  d = dialog(page);
  await choose(d, 'Schicht', 'Nacht');
  await d.getByLabel('Beginn').fill(toInput(at(12)));
  await choose(d, 'Fahrer', 'Eder Eva');
  await choose(d, 'Transportführer', 'Berger Bernd');
  await d.getByRole('button', {name: 'Speichern'}).click();
  await expect(d).toBeHidden();
  const night = tourCard(page, 'Nacht · ohne Fahrzeug');
  await expect(night).toBeVisible();

  // R3 during the handover: both tours are offered, the DAY crew takes it
  await logRide(page, at(12, 20), {tour: /^Tag · 44\.201 \(RTW\)/, type: 'RD'});

  // Daily ride list
  const rows = page.locator('table.rides tbody tr');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText('Anders Anna, Doppler Daniel');
  await expect(rows.nth(1)).toContainText('80.103 (KTW)');
  await expect(rows.nth(1)).toContainText('Anders Anna, Doppler Daniel');
  await expect(rows.nth(2)).toContainText('Anders Anna, Berger Bernd, Csar Clara');

  // End both tours (DAY with overtime)
  await page.getByRole('link', {name: /Dienstmannschaft/}).click();
  await crewChange(page, day, /Tour beenden/, at(12, 55), 'Tour beenden');
  await crewChange(page, night, /Tour beenden/, at(13), 'Tour beenden');
  await expect(day.getByText(/^beendet/)).toBeVisible();
  await expect(night.getByText(/^beendet/)).toBeVisible();

  // Yearly report against hand-calculated values
  await page.getByRole('link', {name: /Jahresbericht/}).click();
  if (B.getFullYear() !== now.getFullYear()) {
    await page.getByRole('combobox', {name: 'Jahr'}).click();
    await page.getByRole('option', {name: String(B.getFullYear())}).click();
  }
  const expected: [string, string, string][] = [
    ['10001', '12:55', '3'], // Anders Anna: whole DAY tour incl. overtime, R1-R3
    ['10002', '5:00', '1'], // Berger Bernd: 4:00 DAY + 1:00 NIGHT, R1
    ['10003', '6:00', '1'], // Csar Clara: until she left, R1 only
    ['10004', '8:55', '2'], // Doppler Daniel: from the replacement, R2 + R3
    ['10005', '1:00', '0'], // Eder Eva: NIGHT tour
  ];
  for (const [id, hours, rides] of expected) {
    const row = page.locator(`tr[data-person="${id}"]`);
    await expect(row.locator('td').nth(1), `hours of ${id}`).toHaveText(hours);
    await expect(row.locator('td').nth(2), `rides of ${id}`).toHaveText(rides);
  }
  await expect(page.locator('tfoot td').nth(1)).toHaveText('33:50');
  await expect(page.locator('tfoot td').nth(2)).toHaveText('7');
  await expect(page.getByText('Offene Einträge (nicht gezählt)')).toHaveCount(0);
});
