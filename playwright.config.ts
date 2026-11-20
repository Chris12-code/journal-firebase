import {defineConfig, devices} from '@playwright/test';

// Test code computes local times; keep it in the same zone as the browser.
process.env['TZ'] = 'Europe/Vienna';

/** Dev server port for e2e runs (against the emulators). */
const E2E_PORT = 4300;

export default defineConfig({
  testDir: 'e2e/tests',
  globalSetup: 'e2e/global-setup.ts',
  // All tests share one emulator database, so run them one after another.
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
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
      // Own port: never reuse a developer's `npm start` on 4200, which talks to the real Firebase project.
      command: `${process.execPath} node_modules/.bin/ng serve --configuration=e2e --port ${E2E_PORT}`,
      url: `http://localhost:${E2E_PORT}`,
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000,
    },
  ],
});
