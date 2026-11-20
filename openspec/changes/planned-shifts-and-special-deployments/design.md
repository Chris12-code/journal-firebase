# Design

## Context

Builds on the layered architecture of `restructure-journal-domain`:
- `domain/` holds pure rules
- `application/` holds the signal services
- `data/` is the only layer that knows Firestore
- `ui/` holds the standalone components

The app has not gone live yet, so document shapes can still change without migrating stored data. See `proposal.md` for motivation and the specs for requirements.

## Goals / Non-Goals

**Goals:**
- Derive the shift plan from the date, with no stored plan data and no external holiday service.
- Keep one ride model for transports and ambulance shifts, so lists, queries and ride counting stay uniform.
- Put all hour rules into the one `yearReport` function.

**Non-Goals:**
- Editing the plan in the app, or keeping a plan history (if the plan changes, older dates are shown with the new plan).
- Organisation or "external" flags for cars.
- Reporting totals of assistances.

## Decisions

### D1: Holidays computed in the domain
`domain/calendar.ts` computes Easter Sunday with the anonymous Gregorian algorithm and derives the 13 national holidays per year. The movable ones are Easter Monday (+1), Ascension Day (+39), Whit Monday (+50) and Corpus Christi (+60). Dates are local calendar dates (`YYYY-MM-DD`).

*Alternative considered:* a holiday API or a stored list. Rejected, because the rules are stable and computable, and an API would add a runtime dependency.

### D2: Shift plan as a domain constant
`domain/shift-plan.ts` holds the plan as data (working day / weekend+holiday → list of `{shift, vehicleId, start "HH:MM", end "HH:MM" | night-rule, note?}`). It exposes three functions:
- `slotsForDate(date)`: the slots of one service date. A night slot belongs to the date it starts on.
- `slotsBetween(from, to)`: all slots that overlap a time span.
- `slotStatus(slot, tours, now)`: `OCCUPIED` | `UPCOMING` | `UNOCCUPIED`.

The night end is decided by the following date: 06:00 if that date is a working day, otherwise 07:00. Times are built with `new Date(y, m, d, h, min)`, so DST is handled like in the rest of the app.

Every slot has a stable key, `YYYY-MM-DD|DAY|44.201`.

### D3: Tour kind and slot link
`Tour` gets two fields:
- `kind: 'SHIFT' | 'EXTRA'`. Mappers default a missing kind to `SHIFT`.
- an optional `slotKey`, set when a tour is started from a slot.

A slot is occupied when some SHIFT tour has its key. The link is stored instead of matched by vehicle and time, because a shift crew may start early, late or on another car and still fill the slot.

### D4: One ride model with a kind
`Ride` gets these changes:
- `kind: 'TRANSPORT' | 'AMBULANCE'`, defaulting to `TRANSPORT`.
- `vehicleIds: string[]` replaces `vehicleId` (BREAKING, no stored data yet). The mapper still reads a legacy `vehicleId` as a one-element list.
- `tourId` is optional, and validation requires it for transports.
- `event?` and `assistances?` are added.
- `resources: string[]` lists the additional resources present (transports and ambulance shifts). They are stored as display text rather than codes, because suggestions and free text look the same and nothing calculates with them. Normalization: trim, drop empty entries, remove duplicates. The suggestions (Notarzt, Notarzthubschrauber, Polizei, Feuerwehr, Bergrettung, Wasserrettung) are a domain constant `RESOURCE_SUGGESTIONS`. In the UI the field is a chip list with the same autocomplete pattern as the vehicle field.

For an ambulance shift, `alarmAt` is the start and `returnedAt` the (required) end. This keeps the existing `alarmAt` queries and the daily list working unchanged. Only the UI labels differ ("Beginn/Ende").

Crew entries keep the field name `role`, but its type becomes `string`. Known codes (`DRIVER`, `TPF`, `THIRD`, `MEDIC`, `LEAD`, `TRAINEE`) have German labels, and any other value is a free-text position shown as entered.

*Alternative considered:* a separate `ambulances` collection. It would need its own queries, list and ride counting for something that behaves like a ride in every report.

### D5: Hours in `yearReport`
Working intervals per person are collected from three sources, clipped to the year, merged with the existing union logic, then summed:
1. closed member entries of SHIFT tours (as today)
2. EXTRA tours: per tour and person, the span from the earliest `alarmAt` to the latest `returnedAt` of that tour's rides containing the person. Only rides with a return time are used. Rides without one produce a notice.
3. AMBULANCE rides: `alarmAt`–`returnedAt` for every crew member.

Member times of EXTRA tours are ignored. A ride whose tour is not among the loaded tours is treated as a plain transport, so it counts as a ride but adds no hours.

Notices get a discriminator: `{kind: 'MEMBER', ...}` for open member entries, and `{kind: 'RIDE', rideId, ...}` for extra-car rides without a return time.

### D6: UI
- **Dienstmannschaft** gets a "Geplante Dienste" section above the tours, built from `slotsBetween(now - DISPLAY_HOURS, now + 24 h)`. Each slot shows vehicle, shift, planned times, note and status, plus a "Besetzen" button (or the linked tour).
- The tour dialog accepts `kind` and an optional slot. A new "Zusatzfahrzeug" button starts an EXTRA tour.
- "Tour beenden" proposes the slot's planned end for linked tours.
- **Fahrten** gets an "Ambulanz erfassen" button with its own dialog:
  - event, start, end, vehicles (chips with the free-text vehicle field)
  - crew rows with a position select (fixed list + "Andere…" free text)
  - assistances

  Ambulance shifts appear in the ride list with event, times and assistances.

## Risks / Trade-offs

- [The plan changes in the future] → One constant to edit. Past dates are shown with the new plan, which is acceptable because the plan only drives display and defaults, not hours.
- [Ambulance shifts without a tour have no tour-based picker] → The crew is entered directly. Persons and free-text vehicles are already supported.
- [An extra-car ride never gets a return time] → It is flagged in the report, and the return time can be added later.
- [Free-text positions collide with known codes] → Codes are uppercase English identifiers, which are unlikely as German free text.

## Migration Plan

No data migration is needed (not live yet). Mappers default `kind` and read a legacy `vehicleId`. The rules are unchanged: new fields need no extra checks, and audit stamps stay as they are.
