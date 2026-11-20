# RK Strobl Journalblatt

Digital journal sheet for **Red Cross Strobl** (Rotes Kreuz Strobl): records the crew on duty (tours), the rides,
and produces yearly statistics (hours worked and rides per person). The UI is in German.

## Tech Stack

- **Angular 21**, standalone components, **signals**, **zoneless** change detection, Angular Router, Angular Material 21
- **Firebase** with the **native SDK only** (`firebase` 10): Firestore, Authentication (email/password, personal logins), Hosting. No `@angular/fire`.
- Tests: Karma/Jasmine (unit + integration), `@firebase/rules-unit-testing` (rules), Playwright (e2e), all against the Firebase emulators
- Firebase project ID: `rk-strobl-journalblatt`

## Architecture: four layers

```
src/app/
  ui/           standalone components, dialogs, routes, guards     -> application, domain
  application/  services with signals, repository ports (ports.ts)  -> domain
  domain/       plain TypeScript: model, rules, report calculation   (imports nothing)
  data/         Firestore repositories, mappers, Firebase providers  -> application (ports), domain
  app.config.ts composition root: binds data implementations to the ports
```

Rules, enforced by `npm run check:layers` (`scripts/check-layers.mjs`):
- `firebase/*` may only be imported in `data/`.
- `domain/` imports nothing outside `domain/` (no Angular, no rxjs).
- `application/` must not import `ui/` or `data/`; `ui/` must not import `data/`.

Business rules belong in `domain/` as pure functions with unit tests. Firestore document shapes are only known to
`data/mappers.ts` (Timestamps never leave it; optional fields are stored as explicit `null`).

## Domain (see `openspec/changes/restructure-journal-domain/` until archived, then `openspec/specs/`)

- **Tour** = one shift (DAY/NIGHT) with an optional home vehicle. Crew members have their own role
  (DRIVER/TPF/THIRD) and `from`/`to` times; people can join, leave, be replaced or swap roles mid-tour.
  A tour does not own a car; tours may overlap (handover, overtime). Ending a tour closes all open entries.
- **Ride** = alarm time, optional return time, the vehicle actually used, the tour, a **frozen crew snapshot**
  (pre-filled from members active at alarm time), type (NA/RD/KT), optional category/patient/locations.
- **Yearly report**: hours = union of a person's closed member intervals clipped to the year (local time);
  open entries are listed, not counted. Rides = rides in the year whose snapshot contains the person.
- Persons and vehicles are read-only master data maintained in the Firebase console (doc ID = employee number /
  vehicle number), deactivated instead of deleted.

## Firestore collections

- `persons`, `vehicles` – master data, read-only for clients
- `tours` – `members[]` embedded; denormalized `start`/`end` (end = null while active) for queries only
- `rides`
- All tours/rides carry `createdBy/createdAt/updatedBy/updatedAt`, set by the repositories and checked by `firestore.rules`
- Legacy `car-tour` / `rescue-operation` are no longer used (rules keep them open until the cut-over cleanup)

## Commands

- `npm start` – dev server on localhost:4200 (real Firebase project)
- `npx ng serve --configuration=e2e` – dev server against the emulators (`firebase emulators:start --only auth,firestore`)
- `npm run build` – production build to `dist/journal-firebase`
- `npm run test:ci` – unit tests (headless Chrome, `TZ=Europe/Vienna`)
- `npm run test:integration` – repository tests against the emulators (`*.integration.spec.ts`)
- `npm run test:rules` – Firestore rules tests
- `npm run e2e` – Playwright tests; starts emulators and dev server, seeds fictional test data
- `npm run check:layers` – layer rule check
- `firebase deploy --only firestore` / `--only hosting`

## Gotchas

- Zoneless: plain component fields changed after an `await` need `ChangeDetectorRef.markForCheck()` (or use signals).
- In functional guards, call `inject()` before the first `await`.
- Never put real personnel data into the repo; e2e/emulator seeds use fictional persons only.
