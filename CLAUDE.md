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

## Domain (specs in `openspec/specs/`, open changes in `openspec/changes/`)

- **Shift plan** (`domain/shift-plan.ts`, `domain/calendar.ts`): planned slots derived from the date.
  Working day (Mon–Fri, not one of the 13 national Austrian holidays): RTW 44.201 day 07:30–19:00, KTW 44.301 day
  06:00–17:00, BTW 20.410 day 06:30–18:00, RTW night from 19:00 (KTW covers the RTW 06:00–07:30). Weekend/holiday:
  RTW day 07:00–19:00 and night. A night ends at 06:00 if the next day is a working day, otherwise 07:00.
  Slot key `YYYY-MM-DD|DAY|44.201`; a slot is occupied when a SHIFT tour carries its `slotKey`.
- **Tour** = kind `SHIFT` (planned duty, optionally linked to a slot) or `EXTRA` (extra car when the RTW is out),
  shift DAY/NIGHT, optional home vehicle. Crew members have their own role (DRIVER/TPF/THIRD) and `from`/`to`
  times; people can join, leave, be replaced or swap roles mid-tour. Tours may overlap (handover, overtime).
- **Ride** = kind `TRANSPORT` (alarm, optional return, exactly one vehicle in `vehicleIds`, tour, type NA/RD/KT, ...)
  or `AMBULANCE` (event, start = `alarmAt`, required end = `returnedAt`, 0..n vehicles, no tour, `assistances`).
  The crew is a **frozen snapshot** of persons with positions (codes DRIVER/TPF/THIRD/MEDIC/LEAD/TRAINEE or free
  text). `resources` lists additional resources present (suggestions or free text).
- **Yearly report**: hours = union per person of closed SHIFT member intervals, EXTRA tour spans (first ride alarm
  to last ride return, per tour and person) and AMBULANCE start–end, clipped to the year (local time). Open member
  entries and EXTRA rides without return time are listed, not counted. Rides = rides in the year whose snapshot
  contains the person (an ambulance shift counts once).
- Persons and vehicles are read-only master data maintained in the Firebase console (doc ID = employee number /
  vehicle number), deactivated instead of deleted. Default vehicles 44.201 (RTW), 44.301 (KTW), 20.410 (BTW)
  are built in (`domain/vehicles.ts`, stored docs override them); vehicle fields accept any number as free text.

## Firestore collections

- `persons`, `vehicles` – master data, read-only for clients
- `tours` – `members[]` embedded; denormalized `start`/`end` (end = null while active) for queries only
- `rides`
- All tours/rides carry `createdBy/createdAt/updatedBy/updatedAt`, set by the repositories and checked by `firestore.rules`
- Legacy `car-tour` / `rescue-operation` are no longer used (rules keep them open until the cut-over cleanup)

## Commands

- `npm start` – dev server on localhost:4200 (real Firebase project)
- `npx ng serve --configuration=e2e --port 4300` – dev server against the emulators (e2e uses port 4300 so it never reuses `npm start` on 4200, which talks to the real project) (`firebase emulators:start --only auth,firestore`)
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
