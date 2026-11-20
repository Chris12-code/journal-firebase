# Design

## Context

See `proposal.md` for the motivation. Constraints from the current code base:

- Angular 21 with an NgModule bootstrap (`AppModule`), Angular Material, and Karma/Jasmine unit tests. A Playwright e2e setup exists in `e2e/`, with a single smoke test.
- Firestore is accessed directly from `AppComponent` and `RescueOperationModalComponent`, through a mix of the native SDK (`getFirestore(getApp())`) and `@angular/fire` (`collectionData`, `Auth`). Conversion between app objects and Firestore documents is duplicated in about seven places.
- There is no `firestore.rules` file in the repository, and `firebase.json` only configures hosting.
- Data volume is small: three vehicles, about 10-20 people, and a few thousand rides per year.
- Because we start fresh, there is no legacy data to stay compatible with. Old collections are ignored.

## Goals / Non-Goals

**Goals:**
- A strict layer structure in which Firebase is replaceable and business rules are unit-testable without Angular or Firebase.
- One mapping per document type, owned by the data layer.
- A data shape that makes daily views and yearly reports possible with bounded queries.
- Less UI plumbing: no `@Input`/`@Output` chains to pass data and callbacks around.

**Non-Goals:**
- Offline support beyond what the Firestore SDK provides by default.
- Server-side aggregation (Cloud Functions, BigQuery). Reports are computed in the browser.
- Routing beyond what the three views need.
- Pixel-level UI redesign. Existing Material look and feel is kept.

## Decisions

### D1: Four layers with a one-way dependency rule

```
ui/           standalone components, templates, dialogs
  |  depends on
application/  use-case services (signals), repository ports (abstract classes)
  |  depends on
domain/       plain TypeScript: types, rules, calculations   <-- no Angular, no Firebase
  ^
  |  implements ports, depends on domain
data/         Firestore repositories, mappers, auth gateway  <-- only place importing firebase/*
```

- `domain/` imports nothing outside itself.
- `application/` defines repository ports as abstract classes, which also serve as DI tokens. `data/` provides the implementations in `app.config.ts`.
- `ui/` talks only to `application/` services and uses domain types for display.
- The rule is enforced by convention plus a simple check (a lint rule or a grep in CI) that `firebase` imports appear only under `data/`.

*Alternative considered:* a feature-folder layout (`tours/`, `rides/` with their own layers). It was rejected because the app is small and features share the same domain, so feature folders would mostly repeat the same structure.

### D2: Domain model

```ts
type Role = 'DRIVER' | 'TPF' | 'THIRD';
type Shift = 'DAY' | 'NIGHT';
type VehicleType = 'RTW' | 'KTW' | 'BTW';

interface Person  { number: string; name: string; phone?: string; email?: string; active: boolean }
interface Vehicle { number: string; type: VehicleType; active: boolean }

interface CrewMember { id: string; personId: string; role: Role; from: Date; to?: Date }
interface Tour {
  id: string; shift: Shift; homeVehicleId?: string;
  members: CrewMember[]; audit: Audit;
}
interface Ride {
  id: string; tourId: string; vehicleId: string;
  alarmAt: Date; returnedAt?: Date;
  crew: { personId: string; role: Role }[];
  type: 'NA' | 'RD' | 'KT'; category?: 'CPR' | 'VU' | 'Kinder';
  patient?: 'Mann' | 'Frau' | 'Kind'; pickup?: string; destination?: string;
  audit: Audit;
}
interface Audit { createdBy: string; createdAt: Date; updatedBy: string; updatedAt: Date }
```

The domain functions are pure and unit tested:
- `tourStart(tour)`, `tourEnd(tour)`, `isActive(tour)`
- `activeMembersAt(tour, t)`, which pre-fills the ride crew
- `endTour(tour, t)`, `changeMember(...)`, `swapRoles(...)`, which return new tours (immutable)
- `validateTour(tour)`, `validateRide(ride)`, which return a list of errors
- `findOverlaps(personId, interval, tours)`, which produces the conflict warning
- `yearReport(year, tours, rides, persons)`, which produces rows plus open-entry notices; this covers interval union, year clipping and ride counting

Crew member IDs are generated on the client (`crypto.randomUUID()`), so individual entries can be edited.

### D3: Firestore document shapes

| Collection | Doc ID | Fields |
|---|---|---|
| `persons` | employee number | `name`, `phone?`, `email?`, `active` |
| `vehicles` | vehicle number | `type`, `active` |
| `tours` | auto | `shift`, `homeVehicleId?`, `members[]`, `start`, `end` (null while active), audit fields |
| `rides` | auto | `tourId`, `vehicleId`, `alarmAt`, `returnedAt?`, `crew[]`, `type`, `category?`, `patient?`, `pickup?`, `destination?`, audit fields |

- **Members are embedded in the tour document**, not stored in a subcollection. A tour has at most a handful of entries, changes are atomic, and one listener covers the whole tour.
- **`start`/`end` on tours are denormalized** from the members by the domain on every save. They exist only for querying. Report math always uses `members`.
- **Default vehicles** (44.201 RTW, 44.301 KTW, 20.410 BTW) are a domain constant merged with the stored `vehicles` (stored entries win, so the console can deactivate a default). Vehicle fields are free text with suggestions, because replacement cars must be recordable without first touching master data; `vehicleId` is therefore the plain vehicle number and may reference no document.
- **Using business keys as document IDs** for master data means that a document created by hand in the console can't get a mismatched reference.
- Times are stored as Firestore `Timestamp`. Mappers convert them to `Date`, and no other layer sees `Timestamp`.

*Alternative considered:* separate `crewMembers` documents. That would make per-person queries easy, but with three cars, loading a year of tours is cheap, and it would cost atomicity and extra reads.

### D4: Queries

- **Daily tours:** two listeners merged in the application service: `end == null` (active, including forgotten ones) and `end >= now - DISPLAY_HOURS`.
- **Daily rides:** `alarmAt >= now - DISPLAY_HOURS`, ordered by `alarmAt desc`.
- **Year report:** one-time reads of tours with `start` in `[Jan 1 - 2 days, Dec 31 end)` and rides with `alarmAt` in the year. The 2-day buffer catches tours that started in the previous year and cross the boundary. Clipping in `yearReport` discards time outside the year. Tours with `start` older than the buffer that are still open show up as open-entry notices through the active-tour query.
- **Ride tour picker:** chooses from the tours already loaded for the daily view, filtered by `isActive at alarmAt`. When an earlier alarm time is entered, a one-time query for `start` within 2 days before the alarm time is run.

The required composite indexes are kept in `firestore.indexes.json`.

### D5: State management with signals, real-time where it matters

- `JournalService` exposes `tours`, `rides` and `activeTours` as signals, fed from Firestore listeners. The listeners are wrapped with `toSignal`, or with manual subscriptions and a `DestroyRef`.
- `MasterDataService` loads persons and vehicles once after login and exposes them as signals, with maps by ID for lookups.
- `ReportService` uses one-time reads, triggered by year selection. It doesn't keep a listener open.
- `SessionService` exposes the current user as a signal and starts or stops the listeners on login and logout.

*Alternative considered:* keeping the BehaviorSubjects. Signals remove the `ngOnChanges` and `@Input` plumbing and match Angular 21 defaults.

### D6: Native Firebase SDK only, drop `@angular/fire`

The data layer creates the Firebase app, Firestore and Auth using the native SDK, behind a small provider function. It connects to the emulators when `environment.useEmulators` is set (for e2e). `@angular/fire` is removed. This removes the current mix of two APIs and the version coupling between `@angular/fire` and Angular, and with D1 nothing outside `data/` needs Firebase anyway.

*Alternative considered:* keeping `@angular/fire`. It's convenient for DI, but its main value (zone-aware observables) matters less with signals, and it has historically lagged behind Angular major versions.

### D7: Standalone bootstrap and three views

`main.ts` uses `bootstrapApplication` with `app.config.ts`. `AppModule` is deleted. There are three views (Journal, Team/Tours, Report). Using the Angular Router with lazy-loaded routes gives deep links and a back button for free, and `@angular/router` is already a dependency. A route guard handles redirecting to login.

### D8: Audit stamps set in the data layer, checked in rules

Repositories add `createdBy/createdAt` on create and `updatedBy/updatedAt` on every write, using the current auth UID and `serverTimestamp()`. Firestore rules require `request.auth != null`, require `createdBy == request.auth.uid` on create and `updatedBy == request.auth.uid` on update, and deny writes to `persons` and `vehicles`. The rules are stored in `firestore.rules` and wired into `firebase.json`.

### D9: Deleting a tour checks for rides

Before deleting a tour, the data layer queries `rides where tourId == id limit 1`. The check runs on the client, which is acceptable without roles, since every user can write anyway.

### D10: Time zone

All times are entered and shown in the browser's local time, which is expected to be Europe/Vienna. Year boundaries for reports are local midnight on 1 January. DST transitions are handled by `Date` arithmetic on absolute timestamps, so a night shift on the DST change counts 11 or 13 hours.

## Risks / Trade-offs

- [Statistics for the go-live year are partial] → Communicate the cut-over date. The report shows "data since <first tour date>".
- [Forgotten end times distort hours] → Open entries are flagged in the report and remain visible as active tours in the daily view until closed.
- [Client-side report computation grows with data] → A year is a few thousand documents, which is fine. If multi-year or advanced reports outgrow this, add aggregation via Cloud Functions without changing the domain functions.
- [Crew snapshot can diverge from tour corrections] → This is accepted by design (the sheet is treated as a record). Rides can be edited individually.
- [Master data typos in the console] → Using business keys as document IDs limits the damage. An admin screen comes later.
- [Rewrite instead of incremental refactor] → The code base is about 1,800 lines, and the old collections are untouched, so the previous build can be redeployed as a rollback.
- [Ride/tour delete check runs only on the client] → Acceptable without roles. It can move into rules or a function if roles are introduced.

## Migration Plan

1. Create `persons` and `vehicles` documents in the Firebase console (production). For e2e/emulator runs, use a seed script.
2. Deploy `firestore.rules` and `firestore.indexes.json` (`firebase deploy --only firestore`). Check that the old app still works under the new rules for any collections it uses; the rules keep `car-tour` and `rescue-operation` readable and writable for logged-in users until the cut-over.
3. Deploy hosting with the new app at a chosen cut-over moment, ideally at a shift change.
4. Afterwards, remove the rules for the legacy collections. Optionally export and then delete the old collections.

**Rollback:** redeploy the previous hosting build. Data entered in the new collections stays, but the old app won't show it.

## Open Questions

- The exact display window (`DISPLAY_HOURS`, currently 20) can be tuned after go-live.
- Whether to purge `persons.json` from git history. This is independent of the implementation.
