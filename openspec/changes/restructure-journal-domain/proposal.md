# Proposal

## Why

The journal sheet needs to support yearly statistics: hours worked and rides per person. In its current shape it cannot. Times are optional, a tour is tied to one car, a ride's timestamp is the moment it was entered, and every entry stores a full copy of the tour including personal contact data. Firestore access and data mapping are also spread across UI components with heavy duplication, which makes the app hard to change and impossible to unit test. A restructure with a clean domain model and a layered architecture fixes the data so statistics can be trusted, and it gives future, more advanced reports a stable foundation.

## What Changes

- **BREAKING** New domain model, stored in new Firestore collections (`tours`, `rides`, `persons`, `vehicles`). The existing `car-tour` and `rescue-operation` collections are no longer read or written. There is no migration: statistics start at the cut-over date.
- A **tour** is one shift on the journal sheet. Crew members carry their own `from`/`to` times and role, so people can join, leave or switch roles without starting a new tour. A tour has an optional home vehicle and does not own a car. Tours may overlap in time (handover, overtime).
- A **ride** records the vehicle actually used, an alarm time, an optional return time, the tour it belongs to and a frozen crew snapshot. The snapshot is pre-filled from the tour members active at alarm time.
- Tours and rides carry author stamps (`createdBy/At`, `updatedBy/At`) taken from the personal login.
- **Persons and vehicles** become master data in Firestore. They are maintained in the Firebase console, are read-only in the app, and are deactivated instead of deleted.
- **BREAKING** `src/data/persons.json` and the hard-coded car list are removed. Personal data is no longer bundled with the app.
- New **yearly report**: hours worked and number of rides per person for a selected year. It is visible to every logged-in user. Open (unfinished) member intervals are flagged instead of counted.
- Firestore security rules are checked into the repository: only authenticated users have access, and master data is read-only.
- The time-based `visibleUntil` field is removed. What the daily view shows is decided by the UI, not stored on records.
- The app moves to a layered architecture (UI → application → domain ← data) with standalone components and signals. Only the data layer imports Firebase.

## Capabilities

### New Capabilities
- `tours`: Recording shifts on the journal sheet, including crew members with individual times and roles, the optional home vehicle, overlap and conflict rules, and the daily tour overview.
- `rides`: Logging rides with the vehicle used, alarm and return times, the link to a tour, the crew snapshot and ride classification, plus the daily ride list.
- `master-data`: Persons and vehicles as read-only reference data with active/inactive status.
- `yearly-report`: Per-person yearly statistics for hours worked and number of rides.
- `journal-access`: Authentication requirements and author stamps on journal records.

### Modified Capabilities
<!-- None: no specs exist yet. -->

## Impact

- **Code**: Nearly all of `src/app` is rewritten. `AppComponent`, `tour-modal/*`, `rescue-operation-modal/*`, `model/*` and `lib/person-utils.service.ts` are replaced by `domain/`, `data/`, `application/` and `ui/` layers. `AppModule` is replaced by a standalone bootstrap.
- **Data**: Four new Firestore collections. The old collections stay untouched as an archive.
- **Config**: A new `firestore.rules` file, referenced from `firebase.json`.
- **Operations**: The person and vehicle documents must be created in the Firebase console before go-live. Users need to know that yearly statistics start at the cut-over date.
- **Tests**: Unit tests for the domain rules and report calculations. The e2e tests in `e2e/` need to be adapted to the new UI.
- **Out of scope**: An admin screen for master data, linking logins to persons ("my hours"), roles and permissions, advanced reports, and purging `persons.json` from git history.
