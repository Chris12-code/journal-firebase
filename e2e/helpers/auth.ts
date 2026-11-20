import {Page} from '@playwright/test';

/** Opens the app, logs in on the login page and waits until the journal is shown. */
export async function loginAs(page: Page, email = 'test@example.com', password = 'password123') {
  await page.goto('/');
  await page.locator('mat-card-title', {hasText: 'Login'}).waitFor();

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]', {hasText: 'Login'}).click();

  await page.locator('mat-toolbar button mat-icon', {hasText: 'logout'}).waitFor();
}
