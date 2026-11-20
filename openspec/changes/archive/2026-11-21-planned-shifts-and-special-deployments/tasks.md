# Tasks

## 1. Calendar and shift plan (domain)

- [x] 1.1 Implement `domain/calendar.ts` (Easter Sunday, the 13 national Austrian holidays, `isWorkingDay`, local date keys). Verify with unit tests: 2027 movable holidays, Christmas Eve is a working day, 26 Oct on a Tuesday uses the weekend plan.
- [x] 1.2 Implement `domain/shift-plan.ts` (plan constant, `slotsForDate`, `slotsBetween`, slot keys, night-end rule, KTW morning note). Verify with unit tests: four slots on a Wednesday, two on a Saturday, Friday night ends Saturday 07:00, Sunday night ends Monday 06:00, the night before a holiday ends at 07:00.
- [x] 1.3 Implement `slotStatus` (occupied via linked shift tour, upcoming, unoccupied). Verify with unit tests: an unstaffed KTW at 08:00 is unoccupied, the night slot at 15:00 is upcoming, a linked tour means occupied.

## 2. Tour and ride model (domain + data)

- [x] 2.1 Extend `Tour` with `kind` and `slotKey`, and extend validation (no slot on EXTRA). Update the mappers to default a missing kind to SHIFT. Verify with domain and mapper round-trip tests.
- [x] 2.2 Extend `Ride` with `kind`, `vehicleIds`, optional `tourId`, `event`, `assistances` and `resources` (trimmed, no empty entries, no duplicates; suggestions as `RESOURCE_SUGGESTIONS`), and make crew `role` a position string with labels. Extend `validateRide` (transport: tour, exactly one vehicle and type required; ambulance: end required and after start, assistances ≥ 0, no tour). Update `prefillRide` and the mappers (legacy `vehicleId` read as a list). Verify with unit tests for every new ride scenario and with mapper round trips.
- [x] 2.3 Adapt the repositories and integration tests to the new fields. Verify with `npm run test:integration`.

## 3. Yearly report

- [x] 3.1 Extend `yearReport` with extra-car spans, ambulance spans, union with member intervals, ride notices and ambulance ride counting. Verify with unit tests for every scenario in `specs/yearly-report` (extra car 3.5 h incl. the gap, a person only on the second ride 1.5 h, ambulance 9 h, missing return flagged, ambulance counts as one ride, overlap with a shift counted once).
- [x] 3.2 Show both notice kinds on the report page. Verify with the report Playwright test extended by an extra-car ride without a return time and an ambulance shift.

## 4. Application and UI

- [x] 4.1 Expose planned slots with status in the application layer (from the clock and the daily tours). Verify with unit tests using fake repositories.
- [x] 4.2 Add the "Geplante Dienste" section to the Dienstmannschaft page, with status, the KTW note and "Besetzen", which pre-fills the tour dialog and links the slot. "Tour beenden" proposes the planned end. Verify with a Playwright test that occupies a planned slot and checks pre-filled values and the status change.
- [x] 4.3 Add the "Zusatzfahrzeug" start and the extra-car label, and offer extra-car tours in the ride dialog. Verify with a Playwright test: extra car on 44.301, two rides, the report shows the first-to-last-ride hours.
- [x] 4.4 Add the ambulance dialog (event, start/end, vehicle list, crew with positions incl. free text, assistances) and the ambulance rows in the ride list. Add the additional-resources chip field (suggestions + free text) to both the transport and the ambulance dialog, and show resources in the ride list. Switch the transport dialog to `vehicleIds`. Verify with a Playwright test that records "Seefest Strobl" with two vehicles, a free-text position and 3 assistances, then checks the list and the report hours, and with a transport that gets "Notarzthubschrauber" plus a free-text resource that both appear in the list.

## 5. Docs and integration check

- [x] 5.1 Update CLAUDE.md (tour kinds, ride kinds, shift plan, hour rules) and the README (shift plan overview for users). Verify the documented commands still run.
- [x] 5.2 Run the full suite (`check:layers`, `test:ci`, `test:rules`, `test:integration`, `e2e` twice). Verify everything passes.

## Workflow follow-up

- Sync the delta specs to the main specs and archive the change after review.
