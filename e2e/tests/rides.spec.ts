import {expect, test} from '@playwright/test';
import {loginAs} from '../helpers/auth';
import {seedActiveDayTour, seedMasterData} from '../helpers/emulator';
import {choose, dialog, tourCard} from '../helpers/ui';

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
  await expect(ride.getByRole('combobox', {name: 'Fahrzeug'})).toContainText('44.201 (RTW)');
  await expect(ride.getByRole('combobox', {name: 'Person 1'})).toContainText('Anders Anna');
  await expect(ride.getByRole('combobox', {name: 'Person 3'})).toContainText('Csar Clara');

  // Use the KTW instead and leave the third person at the station
  await choose(ride, 'Fahrzeug', '80.103 (KTW)');
  await ride.getByRole('button', {name: 'Entfernen Csar Clara'}).click();
  await choose(ride, 'Art', 'KT');
  await ride.getByLabel('Einsatzort').fill('Strobl');
  await ride.getByLabel('Zielort').fill('LKH Bad Ischl');
  await ride.getByRole('button', {name: 'Speichern'}).click();
  await expect(ride).toBeHidden();

  const row = page.locator('table.rides tbody tr').first();
  await expect(row).toContainText('80.103 (KTW)');
  await expect(row).toContainText('KT');
  await expect(row).toContainText('Anders Anna, Berger Bernd');
  await expect(row).not.toContainText('Csar Clara');

  // Add the return time later
  await row.getByRole('button', {name: 'Bearbeiten'}).click();
  const edit = dialog(page);
  const alarm = await edit.getByLabel('Alarmierung').inputValue();
  const returned = new Date(new Date(alarm).getTime() + 45 * 60_000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const returnedValue = `${returned.getFullYear()}-${pad(returned.getMonth() + 1)}-${pad(returned.getDate())}T${pad(returned.getHours())}:${pad(returned.getMinutes())}`;
  await edit.getByLabel('Rückkehr').fill(returnedValue);
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
  page.once('dialog', d => d.accept());
  await tour.getByRole('button', {name: /Löschen/}).click();
  await expect(page.getByText(/Diese Tour hat bereits Fahrten/)).toBeVisible();
  await expect(tour).toBeVisible();
});

test('ride: an invalid return time is refused', async ({page}) => {
  await loginAs(page);
  await page.getByRole('button', {name: /Neue Fahrt/}).click();
  const ride = dialog(page);
  await expect(ride.getByRole('combobox', {name: 'Fahrzeug'})).toContainText('44.201 (RTW)');
  const alarm = new Date(await ride.getByLabel('Alarmierung').inputValue());
  alarm.setMinutes(alarm.getMinutes() - 10);
  const pad = (n: number) => n.toString().padStart(2, '0');
  await ride.getByLabel('Rückkehr').fill(`${alarm.getFullYear()}-${pad(alarm.getMonth() + 1)}-${pad(alarm.getDate())}T${pad(alarm.getHours())}:${pad(alarm.getMinutes())}`);
  await choose(ride, 'Art', 'RD');
  await ride.getByRole('button', {name: 'Speichern'}).click();
  await expect(ride.getByText('Die Rückkehr muss nach der Alarmierung liegen.')).toBeVisible();
});
