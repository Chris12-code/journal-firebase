import {expect, test} from '@playwright/test';
import {loginAs} from '../helpers/auth';
import {putDoc, seedMasterData, TEST_ACCOUNTS} from '../helpers/emulator';

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
    vehicleIds: [vehicleId],
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
  await putDoc('rides/r2', ride(jan(12), '44.301', ['10001', '10004'])); // other vehicle still counts
  await putDoc('rides/r3', ride(new Date(year - 1, 11, 31, 23, 0), '44.201', ['10001'])); // previous year
  await putDoc('rides/r4', ride(jan(9), '44.201', ['10009'])); // inactive person with activity

  // Ambulance shift on 3 January 14:00-23:00: Eva (Sanitäter) and Anna (free-text position)
  await putDoc('rides/amb', {
    ...ride(jan(14, 0, 1), '44.301', []),
    kind: 'AMBULANCE',
    tourId: null,
    type: null,
    vehicleIds: ['44.301', '45.201'],
    returnedAt: jan(23, 0, 1),
    crew: [{personId: '10005', role: 'MEDIC'}, {personId: '10001', role: 'Fußtrupp'}],
    event: 'Seefest Strobl',
    assistances: 3,
    resources: [],
  });

  // Extra car on 4 January: first ride 10:00-11:00 (Eva + Bernd), second ride 12:00 without return time (Eva)
  await putDoc('tours/extra', {
    kind: 'EXTRA',
    slotKey: null,
    shift: 'DAY',
    homeVehicleId: '44.301',
    members: [
      {id: 'x1', personId: '10005', role: 'DRIVER', from: jan(9, 0, 2), to: jan(20, 0, 2)},
      {id: 'x2', personId: '10002', role: 'TPF', from: jan(9, 0, 2), to: jan(20, 0, 2)},
    ],
    start: jan(9, 0, 2),
    end: jan(20, 0, 2),
    ...stamp,
  });
  await putDoc('rides/x1', {...ride(jan(10, 0, 2), '44.301', ['10005', '10002']), tourId: 'extra', returnedAt: jan(11, 0, 2)});
  await putDoc('rides/x2', {...ride(jan(12, 0, 2), '44.301', ['10005']), tourId: 'extra'});
});

test('report: yearly hours and rides per person', async ({page}) => {
  await loginAs(page, TEST_ACCOUNTS.admin);
  await page.getByRole('link', {name: /Jahresbericht/}).click();

  const row = (personId: string) => page.locator(`tr[data-person="${personId}"]`);
  await expect(row('10001')).toContainText('Anders Anna');
  // Anna: 12:55 shift + 9:00 ambulance; rides r1, r2 and the ambulance shift
  await expect(row('10001').locator('td').nth(1)).toHaveText('21:55');
  await expect(row('10001').locator('td').nth(2)).toHaveText('3');

  // Bernd: 4:30 shift + 1:00 extra car (first to last ride with return time); rides r1, x1
  await expect(row('10002').locator('td').nth(1)).toHaveText('5:30');
  await expect(row('10002').locator('td').nth(2)).toHaveText('2');
  await expect(row('10004').locator('td').nth(1)).toHaveText('8:25');
  await expect(row('10004').locator('td').nth(2)).toHaveText('1');

  // Open entry: not counted, but listed
  await expect(row('10003').locator('td').nth(1)).toHaveText('0:00');
  await expect(page.getByText('Offene Einträge (nicht gezählt)')).toBeVisible();
  await expect(page.locator('section.open li.member')).toContainText('Csar Clara');
  // Extra-car ride without return time: flagged, not counted
  await expect(page.locator('section.open li.ride')).toContainText('Eder Eva');
  await expect(page.locator('section.open li.ride')).toContainText('Rückkehrzeit fehlt');

  // Eva: 9:00 ambulance + 1:00 extra car; rides: ambulance, x1, x2
  await expect(row('10005').locator('td').nth(1)).toHaveText('10:00');
  await expect(row('10005').locator('td').nth(2)).toHaveText('3');

  // Inactive person with activity
  await expect(row('10009')).toContainText('(inaktiv)');
  await expect(row('10009').locator('td').nth(2)).toHaveText('1');

  // Totals and data-since hint
  await expect(page.locator('tfoot td').nth(1)).toHaveText('45:50');
  await expect(page.locator('tfoot td').nth(2)).toHaveText('10');
  await expect(page.getByText(`Daten seit 02.01.${year}`)).toBeVisible();

  // Previous year: only the New Year's Eve ride of Anna
  await page.getByRole('combobox', {name: 'Jahr'}).click();
  await page.getByRole('option', {name: String(year - 1)}).click();
  await expect(row('10001').locator('td').nth(2)).toHaveText('1');
  await expect(row('10001').locator('td').nth(1)).toHaveText('0:00');
});
