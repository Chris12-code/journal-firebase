# Tasks

## 1. Foundation

- [x] 1.1 Create the folder skeleton `src/app/{domain,application,data,ui}`. Add a `npm run check:layers` script that fails when `firebase` is imported outside `src/app/data/` or when `domain/` imports Angular. Verify it fails on the current code and passes on the empty skeleton (design D1).
- [x] 1.2 Add `firestore.rules` (auth required; tours/rides writable with audit checks; persons/vehicles read-only; legacy `car-tour`/`rescue-operation` still allowed for logged-in users) and `firestore.indexes.json`, and wire both into `firebase.json` together with the emulator config. Verify `firebase emulators:start` loads the rules without errors (design D3, D8).
- [x] 1.3 Add rules tests using `@firebase/rules-unit-testing` against the emulator: unauthenticated read rejected, person write rejected, ride create with wrong `createdBy` rejected, valid ride create accepted. Verify with `npm run test:rules` (specs journal-access, master-data).
- [x] 1.4 Add an emulator seed script for persons and vehicles (test data only, no real personal data) and call it from `e2e/global-setup.ts`. Verify the seeded documents appear in the emulator UI.

## 2. Domain layer

- [x] 2.1 Implement the domain types for Person, Vehicle, Tour, CrewMember, Ride, Role, Shift and Audit in `domain/model.ts`. Verify `npm run check:layers` passes (design D2).
- [x] 2.2 Implement the tour functions `tourStart`, `tourEnd`, `isActive`, `activeMembersAt`, `endTour`, `addMember`, `endMember`, `swapRoles` and `validateTour`. Verify with unit tests covering every scenario in `specs/tours` (crossing midnight, early leave, replacement, role swap, end with overtime, empty crew, invalid range).
- [x] 2.3 Implement `findOverlaps(personId, interval, tours)`. Verify with unit tests for the same-tour and cross-tour overlap warning scenarios.
- [x] 2.4 Implement `validateRide` and `prefillRide(tour, alarmAt)` (crew from active members, vehicle from home vehicle) plus `toursActiveAt(tours, t)`. Verify with unit tests for the `specs/rides` scenarios (overtime tour offered, pre-fill after crew change, missing home vehicle, return before alarm).
- [x] 2.5 Implement `yearReport(year, tours, rides, persons)` with interval union, year clipping, open-entry notices and ride counting. Verify with unit tests for every `specs/yearly-report` scenario, including New Year's Eve and the DST night (design D10).

## 3. Data layer

- [x] 3.1 Implement the Firebase provider (native SDK, emulator switch via `environment.useEmulators`) and remove `@angular/fire` from `package.json`. Verify `npm install` and `ng build` succeed (design D6).
- [x] 3.2 Implement mappers between Firestore documents and domain types for persons, vehicles, tours and rides (Timestamp↔Date, denormalized tour `start`/`end`). Verify with round-trip unit tests.
- [x] 3.3 Define the repository ports in `application/ports.ts`. Implement the Firestore repositories: master data (read once), tours (daily listeners, year query, delete with ride check), rides (daily listener, year query, by-tour exists) and an auth gateway. Audit stamps are set on write. Verify with integration tests against the emulator (design D4, D8, D9).

## 4. Application layer

- [x] 4.1 Implement `SessionService` (current user signal, login, logout, starting/stopping listeners). Verify with unit tests using a fake auth gateway.
- [x] 4.2 Implement `MasterDataService` (persons and vehicles signals, active filters, lookup maps). Verify with unit tests: inactive entries are excluded from pickers but still resolvable.
- [x] 4.3 Implement `JournalService` with daily tours/rides signals and the actions start tour, add member, end member, swap roles, end tour, delete tour, log ride, edit ride and delete ride. It delegates the rules to the domain and surfaces validation errors and overlap warnings. Verify with unit tests using fake repositories.
- [x] 4.4 Implement `ReportService` (year selection, one-time load, `yearReport`). Verify with unit tests using fake repositories, including the "data since" first-tour date.

## 5. UI layer

- [x] 5.1 Switch to a standalone bootstrap (`app.config.ts`, `bootstrapApplication`), with the Router, three lazy routes (journal, tours, report), an auth guard and a login page. Delete `AppModule`. Verify `ng build` succeeds and update `e2e/tests/smoke.spec.ts` so it passes: login → journal visible, logout → login visible (design D7).
- [x] 5.2 Build the tour view: active tours grouped by shift, a start-tour dialog, crew-change actions (add, end, swap) with time input, an end-tour action, an overlap warning and the delete-tour guard message. Verify with a Playwright test covering a crew change and an end tour with overtime.
- [x] 5.3 Build the ride view: a daily ride list and a ride dialog (alarm and return time, tour picker of active tours, vehicle pre-fill and override, editable crew, classification). Verify with a Playwright test where an RTW tour logs a ride on the KTW and the tour remains unchanged.
- [x] 5.4 Build the report view: year selector, per-person table (hours, rides), open-entry notices and the "data since" hint. Verify with a Playwright test that seeds tours and rides and checks the expected totals.

## 6. Cleanup and docs

- [x] 6.1 Remove the old code (`app.module.ts`, `app.component.*` if replaced, `tour-modal/`, `rescue-operation-modal/`, `model/`, `lib/person-utils.service.ts`, `lib/auth.service.ts`) and `src/data/persons.json`. Verify `npm run check:layers`, `ng build` and `ng test` pass and `grep -r persons.json src` is empty.
- [x] 6.2 Update `CLAUDE.md` (stack, layer structure, collections, commands for emulators and rules tests) and `README.md` (how to maintain persons and vehicles in the console). Verify the documented commands run as written.

## 7. Integration check

- [x] 7.1 Run the full suite against the emulators (`ng test`, `npm run test:rules`, Playwright e2e), plus an end-to-end walkthrough: start the DAY tour, change crew, log rides (one on another vehicle), start the NIGHT tour while the DAY tour is in overtime, end both, then check the yearly report totals. Verify everything is green and the totals match the hand-calculated expectations.

## 8. Default vehicles and free vehicle entry

- [x] 8.1 Add the default vehicles 44.201 (RTW), 44.301 (KTW), 20.410 (BTW) as a domain constant merged with stored vehicles (stored entries win). Verify with unit tests for the merge, override/deactivation and number normalization.
- [x] 8.2 Turn the home-vehicle and ride-vehicle fields into free-text inputs with suggestions of active vehicles and a hint for unknown numbers. Verify with a Playwright test that enters 99.123 and finds it in the ride list, and with the updated ride and walkthrough tests using 44.301 (KTW).
- [x] 8.3 Stop seeding vehicles in the e2e emulator setup and run e2e on its own port (4300) so a running `npm start` against the real project is never reused. Verify the full e2e suite passes twice in a row.

## Workflow follow-up

- Before go-live: create the production `persons` and `vehicles` documents in the Firebase console.
- Deploy rules and indexes (`firebase deploy --only firestore`), then hosting at a shift change. Announce the cut-over date for statistics.
- After go-live: remove the legacy collection rules. Optionally export and delete `car-tour` / `rescue-operation`.
- Archive the change once implementation is reviewed and deployed.
