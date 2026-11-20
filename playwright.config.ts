import {defineConfig, devices} from '@playwright/test';

// Test code computes local times; keep it in the same zone as the browser.
process.env['TZ'] = 'Europe/Vienna';

export default defineConfig({
  testDir: 'e2e/tests',
  globalSetup: 'e2e/global-setup.ts',
  // All tests share one emulator database, so run them one after another.
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on',
    screenshot: 'on',
  },
  projects: [
    {
      name: 'chromium',
      use: {...devices['Desktop Chrome'], timezoneId: 'Europe/Vienna', locale: 'de-AT'},
    },
  ],
  webServer: [
    {
      command: 'firebase emulators:start --only auth,firestore',
      // Readiness is checked on the Auth emulator: it only runs inside the Firebase CLI process,
      // so a leftover Firestore emulator process cannot be mistaken for a running setup.
      url: 'http://localhost:9099',
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000,
      // Let the Firebase CLI stop its emulators; a hard kill leaves the Firestore JVM running.
      gracefulShutdown: {signal: 'SIGTERM', timeout: 15_000},
    },
    {
      command: `${process.execPath} node_modules/.bin/ng serve --configuration=e2e`,
      url: 'http://localhost:4200',
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000,
    },
  ],
});
