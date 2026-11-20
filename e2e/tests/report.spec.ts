import {expect, test} from '@playwright/test';
import {loginAs} from '../helpers/auth';
import {putDoc, seedMasterData} from '../helpers/emulator';

const year = new Date().getFullYear();
/** Local time on 2 January (+ day offset) of the current year. */
const jan = (h: number, m = 0, dayOffset = 0) => new Date(year, 0, 2 + dayOffset, h, m);
const stamp = {createdBy: 'seed', createdAt: new Date(), updatedBy: 'seed', updatedAt: new Date()};

test.beforeEach(async () => {
  await seedMasterData();

  // Closed DAY tour: Anna drives 06:00-18:55, TPF changes from Bernd to Daniel at 10:30
  await putDoc('tours/closed', {
    shift: 'DAY',
    homeVehicleId: '44.201',
    members: [
      {id: 'a', personId: '10001', role: 'DRIVER', from: jan(6), to: jan(18, 55)},
      {id: 'b', personId: '10002', role: 'TPF', from: jan(6), to: jan(10, 30)},
      {id: 'd', personId: '10004', role: 'TPF', from: jan(10, 30), to: jan(18, 55)},
    ],
    start: jan(6),
    end: jan(18, 55),
    ...stamp,
  });

  // Open tour: Clara never got an end time -> notice, not counted
  await putDoc('tours/open', {
    shift: 'NIGHT',
    homeVehicleId: null,
    members: [{id: 'c', personId: '10003', role: 'DRIVER', from: jan(18, 0, 1), to: null}],
    start: jan(18, 0, 1),
    end: null,
    ...stamp,
  });

  const ride = (alarmAt: Date, vehicleId: string, crew: string[]) => ({
    tourId: 'closed',
    vehicleId,
    alarmAt,
    returnedAt: null,
    crew: crew.map(personId => ({personId, role: 'DRIVER'})),
    type: 'RD',
    category: null,
    patient: null,
    pickup: null,
    destination: null,
    ...stamp,
  });
  await putDoc('rides/r1', ride(jan(8), '44.201', ['10001', '10002']));
  await putDoc('rides/r2', ride(jan(12), '80.103', ['10001', '10004'])); // other vehicle still counts
  await putDoc('rides/r3', ride(new Date(year - 1, 11, 31, 23, 0), '44.201', ['10001'])); // previous year
  await putDoc('rides/r4', ride(jan(9), '44.201', ['10009'])); // inactive person with activity
});

test('report: yearly hours and rides per person', async ({page}) => {
  await loginAs(page);
  await page.getByRole('link', {name: /Jahresbericht/}).click();

  const row = (personId: string) => page.locator(`tr[data-person="${personId}"]`);
  await expect(row('10001')).toContainText('Anders Anna');
  await expect(row('10001')).toContainText('12:55');
  await expect(row('10001').locator('td').nth(2)).toHaveText('2');

  await expect(row('10002').locator('td').nth(1)).toHaveText('4:30');
  await expect(row('10002').locator('td').nth(2)).toHaveText('1');
  await expect(row('10004').locator('td').nth(1)).toHaveText('8:25');
  await expect(row('10004').locator('td').nth(2)).toHaveText('1');

  // Open entry: not counted, but listed
  await expect(row('10003').locator('td').nth(1)).toHaveText('0:00');
  await expect(page.getByText('Offene Einträge (nicht gezählt)')).toBeVisible();
  await expect(page.locator('section.open li')).toContainText('Csar Clara');

  // Active person without activity, inactive person with activity
  await expect(row('10005').locator('td').nth(2)).toHaveText('0');
  await expect(row('10009')).toContainText('(inaktiv)');
  await expect(row('10009').locator('td').nth(2)).toHaveText('1');

  // Totals and data-since hint
  await expect(page.locator('tfoot')).toContainText('25:50');
  await expect(page.locator('tfoot td').nth(2)).toHaveText('5');
  await expect(page.getByText(`Daten seit 02.01.${year}`)).toBeVisible();

  // Previous year: only the New Year's Eve ride of Anna
  await page.getByRole('combobox', {name: 'Jahr'}).click();
  await page.getByRole('option', {name: String(year - 1)}).click();
  await expect(row('10001').locator('td').nth(2)).toHaveText('1');
  await expect(row('10001').locator('td').nth(1)).toHaveText('0:00');
});
