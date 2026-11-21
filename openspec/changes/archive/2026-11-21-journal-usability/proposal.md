# Proposal

## Why

Entering data on the journal sheet takes more effort than it should:
- The dialogs are cramped. The fields stack without gaps and the first label is clipped.
- Date and time are entered in the browser's native `datetime-local` field. It looks and behaves differently in every browser and is awkward to type into.
- The ride dialog only offers a tour once the alarm time matches it exactly. Until then the tour list is empty and nothing is prefilled.
- Persons are picked from long select lists.
- Common actions need several clicks, e.g. setting the return time or logging a ride for the tour just viewed.

## What Changes

- **Dialog layout.** All dialogs use one form layout with 16 px between fields, so no label is clipped.
- **Date-time picker.** Every point in time is one field. It can be typed (`21.11.2026 14:05`, `21.11. 1405`, a date alone or a time alone) or picked in one popup with a calendar and a time list in 5-minute steps. A "now" button sits next to each field. Escape closes the popup first, then the dialog.
- **Smart end times.** An end field (Rückkehr, Ende, Bis) that is still empty completes a time typed or picked alone with the start's day, or the next day when the time is not after the start (start 19:00, end 06:00 = next morning).
- **Tour picker always filled.** The ride dialog lists every tour of the display window. Tours active at the alarm time come first. Choosing a tour that was not active at the alarm time is allowed: the crew is prefilled from the nearest moment within the tour, and a warning is shown.
- **Log a ride from the tour.** Active tour cards get a "Fahrt erfassen" button that opens the ride dialog with this tour already selected.
- **Return now.** Open transports in the ride list get a "Zurück jetzt" button that sets the return time to the current minute.
- **Person search.** Person fields are searched by typing a name or employee number. Persons already chosen in the same dialog are not offered again.
- **Feedback and confirmation.** A short "Gespeichert" message appears after saving. Deleting asks in an app dialog instead of the browser's confirm box.

## Impact

- UI only (`src/app/ui/**`), plus a small change to the prefill rule in `domain/ride.ts` (`prefillInstant`).
- No change to the data model, Firestore rules or the yearly report.
- Specs: `rides` (tour offering, prefill, return now), `tours` (log a ride from a tour).
