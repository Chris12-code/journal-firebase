# Proposal

## Why

The Dienstmannschaft view shows too much history and future. Planned slots go from 20 hours back to 24 hours ahead, and every tour that ended in the last 20 hours stays visible. The ride dialog offers the same 20 hours of tours. Users only need what matters now.

When the crew signs off and enters the last ride afterwards, the ride ends after the tour. The tour should then end with the ride.

## What Changes

- **Current tours only.** The Dienstmannschaft view shows tours that are active, ended at most 4 hours ago, or start within 4 hours. Active tours stay visible in overtime.
- **Current planned slots only.** The slot table shows slots that are running, ended at most 4 hours ago, or start within 4 hours, plus the slot of a current tour that runs long.
- **Ride dialog.** It offers the same current tours, plus the ride's own tour when an existing ride is edited.
- **Late ride extends the tour.** Saving a transport whose end (return, else alarm) lies after the end of its ended tour moves the tour end to the ride end. The members who closed the tour get the new end. The dialog shows this before saving, and "Zurück jetzt" reports it.

## Impact

- Domain: `isCurrentTour`, `extendTourEnd` (`domain/tour.ts`).
- Application: `JournalService.currentTours`, `plannedSlots` window, `saveRide` extends the tour, `CURRENT_HOURS = 4`.
- UI: tours page, ride dialog, ride list.
- No data model or rules change. Extending a tour adds hours for the members who closed it.
