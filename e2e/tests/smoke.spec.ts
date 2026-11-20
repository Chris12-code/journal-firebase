import {expect, test} from '@playwright/test';
import {loginAs} from '../helpers/auth';

test('smoke: only the login is shown until logged in, logout returns to login', async ({page}) => {
  await page.goto('/');

  // Not logged in: redirected to the login page, no journal navigation
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('mat-card-title', {hasText: 'Login'})).toBeVisible();
  await expect(page.getByRole('link', {name: /Fahrten/})).toHaveCount(0);

  // Wrong password shows an error
  await page.locator('input[type="email"]').fill('test@example.com');
  await page.locator('input[type="password"]').fill('wrong-password');
  await page.locator('button[type="submit"]', {hasText: 'Login'}).click();
  await expect(page.getByText('E-Mail oder Passwort ist falsch.')).toBeVisible();

  // Log in: the journal (rides page) is the default view
  await loginAs(page);
  await expect(page).toHaveURL(/\/fahrten$/);
  await expect(page.locator('app-rides-page')).toBeVisible();
  await expect(page.getByRole('link', {name: /Dienstmannschaft/})).toBeVisible();

  // Log out: back to the login page
  await page.locator('mat-toolbar button', {hasText: 'logout'}).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('mat-card-title', {hasText: 'Login'})).toBeVisible();

  // Journal routes are guarded
  await page.goto('/bericht');
  await expect(page).toHaveURL(/\/login$/);
});
