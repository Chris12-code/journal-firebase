import {expect, test} from '@playwright/test';
import {loginAs} from '../helpers/auth';
import {seedMasterData} from '../helpers/emulator';
import {choose, dialog, localInput, tourCard} from '../helpers/ui';

test.beforeEach(async () => {
  await seedMasterData();
});

test('tour: start, crew change, early leave, handover warning and end with overtime', async ({page}) => {
  await loginAs(page);
  await page.getByRole('link', {name: /Dienstmannschaft/}).click();

  // Start the DAY tour on the RTW at 06:00 with three people
  await page.getByRole('button', {name: /Tour beginnen/}).click();
  const start = dialog(page);
  await choose(start, 'Schicht', 'Tag');
  await choose(start, 'Stammfahrzeug', '44.201 (RTW)');
  await start.getByLabel('Beginn').fill(localInput(6));
  await choose(start, 'Fahrer', 'Anders Anna');
  await choose(start, 'Transportführer', 'Berger Bernd');
  await choose(start, 'Dritter', 'Csar Clara');
  await start.getByRole('button', {name: 'Speichern'}).click();
  await expect(start).toBeHidden();

  const day = tourCard(page, 'Tag · 44.201 (RTW)');
  await expect(day.getByText('aktiv')).toBeVisible();
  await expect(day.locator('tbody tr')).toHaveCount(3);

  // Replace the transport lead at 10:30
  await day.getByRole('button', {name: 'Ersetzen Berger Bernd'}).click();
  const replace = dialog(page);
  await choose(replace, 'Neue Person', 'Doppler Daniel');
  await replace.getByLabel('Zeitpunkt').fill(localInput(10, 30));
  await replace.getByRole('button', {name: 'Mitglied ersetzen'}).click();
  await expect(replace).toBeHidden();
  await expect(day.locator('tbody tr')).toHaveCount(4);
  await expect(day.locator('tr', {hasText: 'Berger Bernd'})).toContainText('10:30');
  await expect(day.locator('tr', {hasText: 'Doppler Daniel'})).toContainText('Transportführer');

  // Third person leaves at 14:00, the tour continues
  await day.getByRole('button', {name: 'Austragen Csar Clara'}).click();
  const leave = dialog(page);
  await leave.getByLabel('Zeitpunkt').fill(localInput(14));
  await leave.getByRole('button', {name: 'Mitglied austragen'}).click();
  await expect(leave).toBeHidden();
  await expect(day.locator('tr', {hasText: 'Csar Clara'})).toContainText('14:00');
  await expect(day.getByText('aktiv')).toBeVisible();

  // NIGHT tour starts at 18:00 without vehicle; the driver of the DAY tour is added -> warning, but saved
  await page.getByRole('button', {name: /Tour beginnen/}).click();
  const night = dialog(page);
  await choose(night, 'Schicht', 'Nacht');
  await night.getByLabel('Beginn').fill(localInput(18));
  await choose(night, 'Fahrer', 'Anders Anna');
  await expect(night.getByText(/Anders Anna ist gleichzeitig in der Tour/)).toBeVisible();
  await night.getByRole('button', {name: 'Speichern'}).click();
  await expect(night).toBeHidden();
  const nightCard = tourCard(page, 'Nacht · ohne Fahrzeug');
  await expect(nightCard).toBeVisible();
  // The overlap is also shown on the DAY tour
  await expect(day.getByText(/Anders Anna ist gleichzeitig in der Tour „Nacht/)).toBeVisible();

  // End the DAY tour with overtime at 18:55
  await day.getByRole('button', {name: /Tour beenden/}).click();
  const end = dialog(page);
  await end.getByLabel('Zeitpunkt').fill(localInput(18, 55));
  await end.getByRole('button', {name: 'Tour beenden'}).click();
  await expect(end).toBeHidden();
  await expect(day.getByText('beendet 18:55')).toBeVisible();
  await expect(day.locator('tr', {hasText: 'Anders Anna'})).toContainText('18:55');
  await expect(day.locator('tr', {hasText: 'Doppler Daniel'})).toContainText('18:55');
  await expect(nightCard.getByText('aktiv')).toBeVisible();
});

test('tour: a tour without crew is refused', async ({page}) => {
  await loginAs(page);
  await page.getByRole('link', {name: /Dienstmannschaft/}).click();
  await page.getByRole('button', {name: /Tour beginnen/}).click();
  const start = dialog(page);
  await start.getByRole('button', {name: 'Speichern'}).click();
  await expect(start.getByText('Eine Tour braucht mindestens ein Besatzungsmitglied.')).toBeVisible();
});
