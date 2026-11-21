# Tasks

Detailed plan: `plan/feature-journal-usability-1.md`.

## 1. Shared UI building blocks

- [x] 1.1 German date adapter (`ui/shared/german-date-adapter.ts`), `de-AT` locale and date formats in `app.config.ts`/`main.ts`. Verify with unit tests for date and time parsing.
- [x] 1.2 `app-datetime-field`: one text field (`parseDateTime`), popup with calendar and time list, now button, smart end time via `reference`. Verify with unit tests (parsing, field) and e2e (popup, Escape, end after a 19:00 start).
- [x] 1.3 `app-person-field` (search by name or number, exclude list). Verify with unit tests for the filter.
- [x] 1.4 Confirm dialog and `openForm` helper ("Gespeichert" snackbar).
- [x] 1.5 Dialog form spacing in `styles.css`.

## 2. Dialogs

- [x] 2.1 Tour, crew change, ride and ambulance dialogs use the new fields and the form layout.

## 3. Ride prefill from any tour

- [x] 3.1 `prefillInstant` in `domain/ride.ts`. Verify with unit tests (before start, after end, inside).
- [x] 3.2 Ride dialog lists all tours (grouped), warns about a tour not active at the alarm time, accepts a preselected tour.

## 4. Quick actions

- [x] 4.1 "Fahrt erfassen" on active tour cards; "Zurück jetzt" in the ride list; confirm dialog for deletions.

## 5. Tests

- [x] 5.1 e2e helpers `fillDateTime`, `readDateTime`, `expectDateTime`, `confirmDialog`; existing e2e tests migrated; new e2e tests for tour card ride, return now, non-active tour and Escape.
