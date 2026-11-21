# Tasks

## 1. Domain

- [x] 1.1 `isCurrentTour` and `extendTourEnd` in `domain/tour.ts`. Verify with unit tests (active, ended 3 h / 5 h ago, starting in 3 h / 5 h; extension of the closing members only, no change for active tours or earlier times).

## 2. Application

- [x] 2.1 `CURRENT_HOURS`, `currentTours`, planned slot window of ±4 h plus slots of current tours. Verify with unit tests.
- [x] 2.2 `saveRide` extends an ended tour; `tourExtension` preview. Verify with unit tests.

## 3. UI

- [x] 3.1 Tours page and ride dialog use the current tours; extension hint in the ride dialog; "Zurück jetzt" reports an extension.

## 4. Tests

- [x] 4.1 e2e: `seedEndedDayTour`; old tour hidden, recent tour shown; ride after the tour end extends the tour. Tours test uses times relative to now.
