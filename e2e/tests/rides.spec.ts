import {expect, test} from '@playwright/test';
import {loginAs} from '../helpers/auth';
import {seedActiveDayTour, seedMasterData} from '../helpers/emulator';
import {choose, confirmDialog, dateTimeInput, dialog, expectDateTime, fillDateTime, readDateTime, tourCard} from '../helpers/ui';

test.beforeEach(async () => {
  await seedMasterData();
  await seedActiveDayTour();
});

test('ride: RTW crew uses the KTW, the tour stays unchanged', async ({page}) => {
  await loginAs(page);
  await expect(page).toHaveURL(/\/fahrten$/);

  // New ride: the only active tour is pre-selected, with its home vehicle and crew
  await page.getByRole('button', {name: /Neue Fahrt/}).click();
  const ride = dialog(page);
  await expect(ride.getByRole('combobox', {name: 'Tour'})).toContainText('Tag · 44.201 (RTW)');
  await expect(ride.getByRole('combobox', {name: 'Fahrzeug'})).toHaveValue('44.201');
  await expect(ride.getByRole('combobox', {name: 'Person 1'})).toHaveValue('Anders Anna');
  await expect(ride.getByRole('combobox', {name: 'Person 3'})).toHaveValue('Csar Clara');

  // Use the KTW instead and leave the third person at the station
  await choose(ride, 'Fahrzeug', '44.301 (KTW)');
  await ride.getByRole('button', {name: 'Entfernen Csar Clara'}).click();
  await choose(ride, 'Art', 'KT');
  await ride.getByLabel('Einsatzort').fill('Strobl');
  await ride.getByLabel('Zielort').fill('LKH Bad Ischl');
  await ride.getByRole('button', {name: 'Speichern'}).click();
  await expect(ride).toBeHidden();

  const row = page.locator('table.rides tbody tr').first();
  await expect(row).toContainText('44.301 (KTW)');
  await expect(row).toContainText('KT');
  await expect(row).toContainText('Anders Anna, Berger Bernd');
  await expect(row).not.toContainText('Csar Clara');

  // Add the return time later
  await row.getByRole('button', {name: 'Bearbeiten'}).click();
  const edit = dialog(page);
  const alarm = await readDateTime(edit, 'Alarmierung');
  const returned = new Date(alarm.getTime() + 45 * 60_000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  await fillDateTime(edit, 'Rückkehr', returned);
  await edit.getByRole('button', {name: 'Speichern'}).click();
  await expect(edit).toBeHidden();
  await expect(row).toContainText(`${pad(returned.getHours())}:${pad(returned.getMinutes())}`);

  // The tour is unchanged: still on the RTW with all three members on duty
  await page.getByRole('link', {name: /Dienstmannschaft/}).click();
  const tour = tourCard(page, 'Tag · 44.201 (RTW)');
  await expect(tour.locator('tbody tr')).toHaveCount(3);
  await expect(tour.locator('tr', {hasText: 'Csar Clara'})).toBeVisible();
  await expect(tour.getByText('aktiv')).toBeVisible();

  // A tour with rides cannot be deleted
  await tour.getByRole('button', {name: /Löschen/}).click();
  await confirmDialog(page);
  await expect(page.getByText(/Diese Tour hat bereits Fahrten/)).toBeVisible();
  await expect(tour).toBeVisible();
});

test('ride: an invalid return time is refused', async ({page}) => {
  await loginAs(page);
  await page.getByRole('button', {name: /Neue Fahrt/}).click();
  const ride = dialog(page);
  await expect(ride.getByRole('combobox', {name: 'Fahrzeug'})).toHaveValue('44.201');
  const alarm = await readDateTime(ride, 'Alarmierung');
  await fillDateTime(ride, 'Rückkehr', new Date(alarm.getTime() - 10 * 60_000));
  await choose(ride, 'Art', 'RD');
  await ride.getByRole('button', {name: 'Speichern'}).click();
  await expect(ride.getByText('Die Rückkehr muss nach der Alarmierung liegen.')).toBeVisible();
});

test('ride: any other vehicle number can be entered', async ({page}) => {
  await loginAs(page);
  await page.getByRole('button', {name: /Neue Fahrt/}).click();
  const ride = dialog(page);
  const vehicle = ride.getByRole('combobox', {name: 'Fahrzeug'});
  await expect(vehicle).toHaveValue('44.201');

  // The defaults are suggested ...
  await vehicle.click();
  await expect(page.getByRole('option', {name: '44.201 (RTW)'})).toBeVisible();
  await expect(page.getByRole('option', {name: '44.301 (KTW)'})).toBeVisible();
  await expect(page.getByRole('option', {name: '20.410 (BTW)'})).toBeVisible();

  // ... but a replacement car with another number is accepted as typed
  await vehicle.fill('99.123');
  await expect(ride.getByText('Unbekannte Nummer – wird so übernommen.')).toBeVisible();
  await vehicle.press('Tab');
  await choose(ride, 'Art', 'RD');
  await ride.getByRole('button', {name: 'Speichern'}).click();
  await expect(ride).toBeHidden();
  await expect(page.locator('table.rides tbody tr').first()).toContainText('99.123');
});

test('ride: additional resources from suggestions and free text', async ({page}) => {
  await loginAs(page);
  await page.getByRole('button', {name: /Neue Fahrt/}).click();
  const ride = dialog(page);
  await expect(ride.getByRole('combobox', {name: 'Fahrzeug'})).toHaveValue('44.201');

  // The dialog focuses its first field once opened; wait for it, otherwise it scrolls back up mid-test.
  await expect(dateTimeInput(ride, 'Alarmierung')).toBeFocused();
  const resources = ride.getByPlaceholder('z. B. Polizei');
  await resources.fill('Notarzthub');
  await page.getByRole('option', {name: 'Notarzthubschrauber'}).click();
  await resources.fill('Rotes Kreuz Bad Ischl');
  await resources.press('Enter');
  // A suggestion already chosen is not offered again, a duplicate is ignored
  await resources.fill('notarzthubschrauber');
  await resources.press('Enter');
  await expect(ride.locator('mat-chip-row')).toHaveCount(2);

  await choose(ride, 'Art', 'NA');
  await ride.getByRole('button', {name: 'Speichern'}).click();
  await expect(ride).toBeHidden();
  await expect(page.locator('table.rides tbody tr').first()).toContainText('Notarzthubschrauber, Rotes Kreuz Bad Ischl');
});

test('ride: logged from the tour card with tour, vehicle and crew pre-filled, return set with one click', async ({page}) => {
  await loginAs(page);
  await page.getByRole('link', {name: /Dienstmannschaft/}).click();
  await tourCard(page, 'Tag · 44.201 (RTW)').getByRole('button', {name: /Fahrt erfassen/}).click();

  const ride = dialog(page);
  await expect(ride.getByRole('combobox', {name: 'Tour'})).toContainText('Tag · 44.201 (RTW)');
  await expect(ride.getByRole('combobox', {name: 'Fahrzeug'})).toHaveValue('44.201');
  await expect(ride.getByRole('combobox', {name: 'Person 1'})).toHaveValue('Anders Anna');
  await choose(ride, 'Art', 'RD');
  await ride.getByRole('button', {name: 'Speichern'}).click();
  await expect(ride).toBeHidden();
  await expect(page.getByText('Gespeichert')).toBeVisible();

  await page.getByRole('link', {name: /Fahrten/}).click();
  const row = page.locator('table.rides tbody tr').first();
  await row.getByRole('button', {name: /Zurück jetzt/}).click();
  await expect(row.getByRole('button', {name: /Zurück jetzt/})).toHaveCount(0);
  await expect(row.locator('td').nth(1)).toHaveText(/^\s*\d{2}:\d{2}\s*$/);
});

test('ride: a tour not active at the alarm time can still be chosen, with a warning', async ({page}) => {
  await loginAs(page);
  await page.getByRole('button', {name: /Neue Fahrt/}).click();
  const ride = dialog(page);
  await expect(ride.getByRole('combobox', {name: 'Fahrzeug'})).toHaveValue('44.201');

  // Alarm before the tour started: the tour moves to "Weitere Touren" but stays selectable
  const alarm = new Date(Date.now() - 3 * 3_600_000);
  await fillDateTime(ride, 'Alarmierung', alarm);
  await expect(ride.getByText('Die Tour war zur Alarmzeit nicht aktiv.')).toBeVisible();
  await ride.getByRole('combobox', {name: 'Tour'}).click();
  await expect(page.getByRole('group', {name: 'Weitere Touren'}).getByRole('option', {name: /Tag · 44\.201 \(RTW\)/})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(ride.getByRole('combobox', {name: 'Person 1'})).toHaveValue('Anders Anna');
});

test('ride: Escape closes the date-time popup first, then the dialog', async ({page}) => {
  await loginAs(page);
  await page.getByRole('button', {name: /Neue Fahrt/}).click();
  const ride = dialog(page);
  const alarm = await readDateTime(ride, 'Alarmierung');

  await ride.getByRole('button', {name: 'Alarmierung auswählen'}).click();
  const panel = page.getByRole('group', {name: 'Alarmierung auswählen'});
  await expect(panel).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(ride).toBeVisible();
  await expectDateTime(ride, 'Alarmierung', alarm);

  await page.keyboard.press('Escape');
  await expect(ride).toBeHidden();
});

test('ride: date and time picked in one popup', async ({page}) => {
  await loginAs(page);
  await page.getByRole('button', {name: /Neue Fahrt/}).click();
  const ride = dialog(page);
  const alarm = await readDateTime(ride, 'Alarmierung');

  await ride.getByRole('button', {name: 'Rückkehr auswählen'}).click();
  const panel = page.getByRole('group', {name: 'Rückkehr auswählen'});
  // Without a value, the time list follows the alarm (reference); a time earlier than the alarm means the next day
  const picked = new Date(alarm.getFullYear(), alarm.getMonth(), alarm.getDate(), 23, 55);
  await panel.getByRole('option', {name: '23:55'}).click();
  await expect(panel).toBeHidden();
  await expectDateTime(ride, 'Rückkehr', picked.getTime() > alarm.getTime() ? picked : new Date(picked.getTime() + 86_400_000));
});
