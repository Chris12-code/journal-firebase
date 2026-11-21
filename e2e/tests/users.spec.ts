import {expect, Page, test} from '@playwright/test';
import {loginAs, switchTo} from '../helpers/auth';
import {seedMasterData, TEST_ACCOUNTS} from '../helpers/emulator';
import {choose, confirmDialog, dialog} from '../helpers/ui';

// Roles and user maintenance (spec journal-access). Fictional accounts only.

test.beforeEach(async () => {
  await seedMasterData();
});

const userRow = (page: Page, email: string) => page.locator('table.users tbody tr', {hasText: email});

const logout = async (page: Page) => {
  await page.locator('mat-toolbar button', {hasText: 'logout'}).click();
  await expect(page).toHaveURL(/\/login$/);
};

test('station login: no report and no user maintenance, also not by address', async ({page}) => {
  await loginAs(page);
  await expect(page.getByRole('link', {name: /Fahrten/})).toBeVisible();
  await expect(page.getByRole('link', {name: /Dienstmannschaft/})).toBeVisible();
  await expect(page.getByRole('link', {name: /Jahresbericht/})).toHaveCount(0);
  await expect(page.getByRole('link', {name: /Benutzer/})).toHaveCount(0);

  await page.goto('/bericht');
  await expect(page).toHaveURL(/\/fahrten$/);
  await page.goto('/benutzer');
  await expect(page).toHaveURL(/\/fahrten$/);
});

test('account without user entry only sees "Kein Zugang"', async ({page}) => {
  await loginAs(page, TEST_ACCOUNTS.noAccess);
  await expect(page).toHaveURL(/\/kein-zugang$/);
  await expect(page.getByText('hat keinen Zugang zum Journalblatt')).toBeVisible();
  await expect(page.getByRole('link', {name: /Fahrten/})).toHaveCount(0);

  await page.goto('/fahrten');
  await expect(page).toHaveURL(/\/kein-zugang$/);

  await page.locator('main').getByRole('button', {name: 'Abmelden'}).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('admin adds a user who can log in, deactivates and removes them', async ({page}) => {
  const email = `neu-${Date.now()}@example.com`;
  await loginAs(page, TEST_ACCOUNTS.admin);
  await page.getByRole('link', {name: /Benutzer/}).click();
  await expect(userRow(page, TEST_ACCOUNTS.station.email)).toContainText('Station');

  // Add a station user
  await page.getByRole('button', {name: /Benutzer hinzufügen/}).click();
  const add = dialog(page);
  await add.getByLabel('E-Mail').fill(email);
  await add.getByLabel('Anfangspasswort').fill('secret123');
  await add.getByLabel('Name').fill('Neue Person');
  await choose(add, 'Rolle', 'Station');
  await add.getByRole('button', {name: 'Speichern'}).click();
  await expect(add).toBeHidden();
  await expect(page.getByText('Gespeichert')).toBeVisible();
  // The admin is still logged in as themselves
  await expect(page.locator('mat-toolbar')).toContainText(TEST_ACCOUNTS.admin.email);
  await expect(userRow(page, email)).toContainText('Neue Person');
  await expect(userRow(page, email)).toContainText('aktiv');

  // The new account can log in and works as station
  const account = {uid: '', email, password: 'secret123', name: 'Neue Person', role: 'STATION' as const};
  await switchTo(page, account);
  await expect(page).toHaveURL(/\/fahrten$/);
  await expect(page.getByRole('link', {name: /Jahresbericht/})).toHaveCount(0);

  // Deactivate it
  await switchTo(page, TEST_ACCOUNTS.admin);
  await page.getByRole('link', {name: /Benutzer/}).click();
  await userRow(page, email).getByRole('button', {name: 'Bearbeiten'}).click();
  const edit = dialog(page);
  await expect(edit.getByLabel('E-Mail')).not.toBeEditable();
  await edit.getByRole('switch', {name: 'Aktiv'}).click();
  await edit.getByRole('button', {name: 'Speichern'}).click();
  await expect(edit).toBeHidden();
  await expect(userRow(page, email)).toContainText('inaktiv');

  // The deactivated account gets no data
  await switchTo(page, account);
  await expect(page).toHaveURL(/\/kein-zugang$/);
  await page.locator('main').getByRole('button', {name: 'Abmelden'}).click();
  await expect(page).toHaveURL(/\/login$/);

  // Remove it
  await loginAs(page, TEST_ACCOUNTS.admin);
  await page.getByRole('link', {name: /Benutzer/}).click();
  await userRow(page, email).getByRole('button', {name: 'Entfernen'}).click();
  await confirmDialog(page, 'Entfernen');
  await expect(userRow(page, email)).toHaveCount(0);

  await switchTo(page, account);
  await expect(page).toHaveURL(/\/kein-zugang$/);
});

test('admin sends a password reset', async ({page}) => {
  await loginAs(page, TEST_ACCOUNTS.admin);
  await page.getByRole('link', {name: /Benutzer/}).click();
  await userRow(page, TEST_ACCOUNTS.station.email).getByRole('button', {name: 'Passwort zurücksetzen'}).click();
  await confirmDialog(page, 'Senden');
  await expect(page.getByText(`E-Mail an ${TEST_ACCOUNTS.station.email} gesendet`)).toBeVisible();
});

test('admin cannot lock themselves out', async ({page}) => {
  await loginAs(page, TEST_ACCOUNTS.admin);
  await page.getByRole('link', {name: /Benutzer/}).click();
  const own = userRow(page, TEST_ACCOUNTS.admin.email);
  await expect(own).toContainText('(du)');
  await expect(own.getByRole('button', {name: 'Entfernen'})).toHaveCount(0);

  await own.getByRole('button', {name: 'Bearbeiten'}).click();
  const d = dialog(page);
  await expect(d.getByRole('combobox', {name: 'Rolle'})).toHaveAttribute('aria-disabled', 'true');
  await expect(d.getByRole('switch', {name: 'Aktiv'})).toBeDisabled();
  await d.getByRole('button', {name: 'Abbrechen'}).click();

  await logout(page);
});
