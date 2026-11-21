import {expect, test} from '@playwright/test';
import {loginAs} from '../helpers/auth';
import {seedEndedDayTour, seedMasterData} from '../helpers/emulator';
import {choose, dialog, fillDateTime, readDateTime, tourCard} from '../helpers/ui';

// Times relative to now, so every tour of the first test stays current (the view shows tours ended at most
// 4 h ago and starting within 4 h).
const now = new Date();
now.setSeconds(0, 0);
const B = new Date(now.getTime() - 13 * 3_600_000);
const at = (h: number, m = 0) => new Date(B.getTime() + (h * 60 + m) * 60_000);
const pad = (n: number) => n.toString().padStart(2, '0');
const hm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

test.beforeEach(async () => {
  await seedMasterData();
});

test('tour: start, crew change, early leave, handover warning and end with overtime', async ({page}) => {
  await loginAs(page);
  await page.getByRole('link', {name: /Dienstmannschaft/}).click();

  // Start the DAY tour on the RTW 13 h ago with three people
  await page.getByRole('button', {name: /Tour beginnen/}).click();
  const start = dialog(page);
  await choose(start, 'Schicht', 'Tag');
  await choose(start, 'Stammfahrzeug', '44.201 (RTW)');
  await fillDateTime(start, 'Beginn', B);
  await choose(start, 'Fahrer', 'Anders Anna');
  await choose(start, 'Transportführer', 'Berger Bernd');
  await choose(start, 'Dritter', 'Csar Clara');
  await start.getByRole('button', {name: 'Speichern'}).click();
  await expect(start).toBeHidden();

  const day = tourCard(page, 'Tag · 44.201 (RTW)');
  await expect(day.getByText('aktiv')).toBeVisible();
  await expect(day.locator('tbody tr')).toHaveCount(3);

  // Replace the transport lead 4:30 h later
  await day.getByRole('button', {name: 'Ersetzen Berger Bernd'}).click();
  const replace = dialog(page);
  await choose(replace, 'Neue Person', 'Doppler Daniel');
  await fillDateTime(replace, 'Zeitpunkt', at(4, 30));
  await replace.getByRole('button', {name: 'Mitglied ersetzen'}).click();
  await expect(replace).toBeHidden();
  await expect(day.locator('tbody tr')).toHaveCount(4);
  await expect(day.locator('tr', {hasText: 'Berger Bernd'})).toContainText(hm(at(4, 30)));
  await expect(day.locator('tr', {hasText: 'Doppler Daniel'})).toContainText('Transportführer');

  // Third person leaves after 8 h, the tour continues
  await day.getByRole('button', {name: 'Austragen Csar Clara'}).click();
  const leave = dialog(page);
  await fillDateTime(leave, 'Zeitpunkt', at(8));
  await leave.getByRole('button', {name: 'Mitglied austragen'}).click();
  await expect(leave).toBeHidden();
  await expect(day.locator('tr', {hasText: 'Csar Clara'})).toContainText(hm(at(8)));
  await expect(day.getByText('aktiv')).toBeVisible();

  // NIGHT tour starts an hour ago without vehicle; the driver of the DAY tour is added -> warning, but saved
  await page.getByRole('button', {name: /Tour beginnen/}).click();
  const night = dialog(page);
  await choose(night, 'Schicht', 'Nacht');
  await fillDateTime(night, 'Beginn', at(12));
  await choose(night, 'Fahrer', 'Anders Anna');
  await expect(night.getByText(/Anders Anna ist gleichzeitig in der Tour/)).toBeVisible();
  await night.getByRole('button', {name: 'Speichern'}).click();
  await expect(night).toBeHidden();
  const nightCard = tourCard(page, 'Nacht · ohne Fahrzeug');
  await expect(nightCard).toBeVisible();
  // The overlap is also shown on the DAY tour
  await expect(day.getByText(/Anders Anna ist gleichzeitig in der Tour „Nacht/)).toBeVisible();

  // End the DAY tour with overtime, 5 minutes ago
  await day.getByRole('button', {name: /Tour beenden/}).click();
  const end = dialog(page);
  await fillDateTime(end, 'Zeitpunkt', at(12, 55));
  await end.getByRole('button', {name: 'Tour beenden'}).click();
  await expect(end).toBeHidden();
  await expect(day.getByText(new RegExp(`^beendet .*${hm(at(12, 55))}$`))).toBeVisible();
  await expect(day.locator('tr', {hasText: 'Anders Anna'})).toContainText(hm(at(12, 55)));
  await expect(day.locator('tr', {hasText: 'Doppler Daniel'})).toContainText(hm(at(12, 55)));
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

test('tour: only current tours are shown (ended at most 4 h ago)', async ({page}) => {
  await seedEndedDayTour({id: 'recent', vehicle: '44.301', startHoursAgo: 10, endHoursAgo: 2});
  await seedEndedDayTour({id: 'old', vehicle: '44.201', startHoursAgo: 12, endHoursAgo: 5});
  await loginAs(page);
  await page.getByRole('link', {name: /Dienstmannschaft/}).click();
  await expect(tourCard(page, 'Tag · 44.301 (KTW)')).toBeVisible();
  await expect(tourCard(page, 'Tag · 44.201 (RTW)')).toHaveCount(0);
});

test('tour: a ride after the tour end extends the tour', async ({page}) => {
  await seedEndedDayTour({startHoursAgo: 6, endHoursAgo: 1});
  await loginAs(page);

  // The tour ended an hour ago, so it is offered but not pre-selected
  await page.getByRole('button', {name: /Neue Fahrt/}).click();
  const ride = dialog(page);
  await choose(ride, 'Tour', /^Tag · 44\.201 \(RTW\)/);
  await expect(ride.getByRole('combobox', {name: 'Person 1'})).toHaveValue('Anders Anna');
  await expect(ride.getByText(/Das Tour-Ende \(\d{2}:\d{2}\) wird auf \d{2}:\d{2} verlängert\./)).toBeVisible();
  const alarm = await readDateTime(ride, 'Alarmierung');
  await choose(ride, 'Art', 'RD');
  await ride.getByRole('button', {name: 'Speichern'}).click();
  await expect(ride).toBeHidden();

  // Return now extends it once more
  const row = page.locator('table.rides tbody tr').first();
  await row.getByRole('button', {name: /Zurück jetzt/}).click();
  await expect(page.getByText('Rückkehr eingetragen, Tour-Ende verlängert')).toBeVisible();

  await page.getByRole('link', {name: /Dienstmannschaft/}).click();
  const card = tourCard(page, 'Tag · 44.201 (RTW)');
  await expect(card.getByText(/^beendet \d{2}:\d{2}$/)).toBeVisible();
  const ended = (await card.getByText(/^beendet/).innerText()).replace('beendet ', '');
  // The tour now ends at the return time: one minute after the alarm (two if the clock ticked meanwhile)
  expect([hm(new Date(alarm.getTime() + 60_000)), hm(new Date(alarm.getTime() + 120_000))]).toContain(ended);
});
