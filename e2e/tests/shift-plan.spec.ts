import {expect, test} from '@playwright/test';
import {isWorkingDay} from '../../src/app/domain/calendar';
import {slotByKey} from '../../src/app/domain/shift-plan';
import {loginAs} from '../helpers/auth';
import {seedMasterData} from '../helpers/emulator';
import {choose, dialog, toInput, tourCard} from '../helpers/ui';

test.beforeEach(async () => {
  await seedMasterData();
});

test('shift plan: occupy a planned slot with pre-filled values, planned end proposed', async ({page}) => {
  await loginAs(page);
  await page.getByRole('link', {name: /Dienstmannschaft/}).click();

  // Without tours, no planned slot is occupied
  const slots = page.locator('table.slots tr[data-slot]');
  await expect(slots.first()).toBeVisible();
  await expect(page.locator('table.slots tr.status-OCCUPIED')).toHaveCount(0);

  // The RTW day slot of a working day carries the KTW note
  for (const key of await slots.evaluateAll(rows => rows.map(r => r.getAttribute('data-slot')!))) {
    const s = slotByKey(key)!;
    if (s.shift === 'DAY' && s.vehicleType === 'RTW') {
      const note = page.locator(`tr[data-slot="${key}"] .note`);
      if (isWorkingDay(s.start)) await expect(note).toHaveText('06:00–07:30 durch KTW abgedeckt');
      else await expect(note).toHaveCount(0);
    }
  }

  // Occupy the first open slot
  const row = slots.filter({has: page.getByRole('button', {name: /^Besetzen/})}).first();
  const key = (await row.getAttribute('data-slot'))!;
  const slot = slotByKey(key)!;
  await row.getByRole('button', {name: /^Besetzen/}).click();

  const d = dialog(page);
  await expect(d.getByRole('heading', {name: 'Dienst besetzen'})).toBeVisible();
  await expect(d.getByRole('combobox', {name: 'Schicht'})).toContainText(slot.shift === 'DAY' ? 'Tag' : 'Nacht');
  await expect(d.getByRole('combobox', {name: 'Stammfahrzeug'})).toHaveValue(slot.vehicleId);
  await expect(d.getByLabel('Beginn')).toHaveValue(toInput(slot.start));
  await choose(d, 'Fahrer', 'Anders Anna');
  await d.getByRole('button', {name: 'Speichern'}).click();
  await expect(d).toBeHidden();

  // The slot is occupied by the new tour
  const occupied = page.locator(`tr[data-slot="${key}"]`);
  await expect(occupied.locator('.status')).toHaveText('besetzt');
  await expect(occupied).toContainText('Anders Anna');
  await expect(occupied.getByRole('button', {name: /^Besetzen/})).toHaveCount(0);

  // Ending the tour proposes the planned end
  const card = tourCard(page, `${slot.shift === 'DAY' ? 'Tag' : 'Nacht'} · ${slot.vehicleId} (${slot.vehicleType})`);
  await card.getByRole('button', {name: /Tour beenden/}).click();
  const end = dialog(page);
  await expect(end.getByLabel('Zeitpunkt')).toHaveValue(toInput(slot.end));
  await end.getByRole('button', {name: 'Abbrechen'}).click();
  await expect(end).toBeHidden();
});
