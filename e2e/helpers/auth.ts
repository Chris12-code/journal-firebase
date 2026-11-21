import {Page} from '@playwright/test';
import {TEST_ACCOUNTS, TestAccount} from './emulator';

/** Opens the app, logs in on the login page and waits until the toolbar shows the logout button. Defaults to the station login. */
export async function loginAs(page: Page, account: TestAccount = TEST_ACCOUNTS.station) {
  await page.goto('/');
  await page.locator('mat-card-title', {hasText: 'Login'}).waitFor();

  await page.locator('input[type="email"]').fill(account.email);
  await page.locator('input[type="password"]').fill(account.password);
  await page.locator('button[type="submit"]', {hasText: 'Login'}).click();

  await page.locator('mat-toolbar button mat-icon', {hasText: 'logout'}).waitFor();
}

/** Logs out and logs in again with another account, e.g. the admin to look at the report after the station work. */
export async function switchTo(page: Page, account: TestAccount) {
  await page.locator('mat-toolbar button', {hasText: 'logout'}).click();
  await page.locator('mat-card-title', {hasText: 'Login'}).waitFor();
  await loginAs(page, account);
}
