# Proposal

## Why

The journal sheet only knows one kind of tour, a crew with its own start and end times. Real duty at Strobl has more structure:
- a fixed **shift plan** that depends on the weekday and Austrian public holidays
- **ambulance shifts** at events, with several cars and more people in additional positions
- **extra cars** that people take when the RTW is out and another request comes in

Without these, the sheet cannot show which planned shifts are still unoccupied, and hours for ambulance shifts and extra cars cannot be recorded correctly.

## What Changes

- **Shift plan.** The planned shift slots are derived from the date:
  - Working days (Mon–Fri, not a public holiday): RTW 44.201 day 07:30–19:00, KTW 44.301 day 06:00–17:00, BTW 20.410 day 06:30–18:00, RTW night from 19:00.
  - Weekends (Sat, Sun) and the 13 national Austrian public holidays: RTW day 07:00–19:00 and RTW night from 19:00.
  - A night shift ends at 06:00 when it ends on a working day, otherwise at 07:00.
  - On working days, the KTW covers the RTW between 06:00 and 07:30.
- **Dienstmannschaft view.** It shows the planned slots around now, each marked as occupied, upcoming or unoccupied. Starting a tour from a slot pre-fills car, shift and the planned start. Ending it proposes the planned end. Actual times remain the source of hours.
- **Tour kinds.** A tour is either a planned **shift** (as today, with member times) or an **extra car**. The crew of an extra car is credited with hours from the start of their first ride to the end of their last ride on that tour.
- **Ambulance shifts.** They are recorded as a special ride, not tied to a tour. Each has:
  - an event or location
  - a required start and end
  - zero or more vehicles
  - a crew of any size
  - the number of assistances given

  Every crew member gets its full time span as hours, and it counts as one ride.
- **Additional resources.** Rides (transports and ambulance shifts) record which other resources were present, e.g. emergency doctor, ambulance helicopter, police or fire brigade. The fixed suggestions are complemented by free text.
- **Crew positions.** On ambulance shifts the positions are Fahrer, Transportführer, Sanitäter, Einsatzleiter and Praktikant, plus free-text positions. Shifts and extra cars keep their three roles.
- **BREAKING** A ride stores a list of vehicles instead of a single vehicle (a transport has exactly one). The app has not gone live, so no stored data needs migrating.
- **Yearly report.** It merges member times, extra-car spans and ambulance spans per person, without double counting. Rides of extra cars without a return time are flagged instead of counted.

## Capabilities

### New Capabilities
- `shift-plan`: Planned shift slots per date (working day, weekend, Austrian public holiday), their times, and their occupation status.

### Modified Capabilities
- `tours`: Tour kinds (shift, extra car), link from a tour to its planned slot, planned times as defaults.
- `rides`: Ambulance shifts as a ride kind with event, start/end, several vehicles, open crew with positions and number of assistances; vehicles as a list; additional resources present (suggestions plus free text).
- `yearly-report`: Hours from extra-car and ambulance spans, ambulance shifts counted as rides, flags for missing return times.

## Impact

- **Domain:** new `calendar` (Easter and Austrian public holidays) and `shift-plan` modules. `Tour`, `Ride` and the report calculation are extended.
- **Data:** the `tours` and `rides` documents get new fields (`kind`, `slotKey`, `vehicleIds`, `event`, `assistances`, `resources`). Mappers default missing fields, so existing tours read as shifts.
- **UI:** a planned-slot overview on the Dienstmannschaft page, an "Extra car" start, an ambulance dialog, and ride list entries for ambulance shifts.
- **Out of scope:**
  - marking external cars separately (they stay free-text numbers such as 45.201)
  - assistance totals in the report
  - editing the shift plan in the app (it is a code constant)
