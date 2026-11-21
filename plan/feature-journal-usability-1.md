---
goal: Simplify the journal sheet UI - dialog spacing, Material date/time pickers, tour-based ride prefill, searchable persons, quick actions, Material confirm dialog
version: 1.1
date_created: 2026-11-21
owner: christoph
status: 'Completed'
last_updated: 2026-11-21
tags: [feature, ui, usability]
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

**Context.** Users find the dialogs cramped (form fields stack with no gap because `subscriptSizing: 'dynamic'` removes the hint space, and outline labels touch the dialog top), date/time entry uses the browser's native `datetime-local` input (inconsistent, awkward on desktop), and the ride dialog's "Tour" select is empty until the alarm time matches a tour exactly. Goal: make entering tours, rides and ambulance shifts as simple as possible.

Decisions taken with the user (2026-11-21): Angular Material datepicker + timepicker (no new dependency); the ride dialog's tour picker always lists tours (active-at-alarm first) and prefills from the chosen one; extras = quick actions in lists, type-to-search person fields, Material confirm dialog. Mobile full-screen dialogs are out of scope.

On implementation start, this file is also saved as `plan/feature-journal-usability-1.md` (skill convention).

## 1. Requirements & Constraints

- **REQ-001**: Every dialog (`tour-dialog`, `crew-change-dialog`, `ride-dialog`, `ambulance-dialog`) has a vertical gap of 16px between fields and no clipped floating labels.
- **REQ-002**: Every date/time input in dialogs is replaced by one shared component `app-datetime-field` = one text field (`21.11.2026 14:05`; date or time alone allowed) + popup with `mat-calendar` and a 5-minute time list + "Jetzt" icon button. (v1.0 used separate `mat-datepicker`/`mat-timepicker` fields; replaced in v1.1 at the user's request.)
- **REQ-010** (v1.1): Smart end time – `app-datetime-field` input `reference` (start of the range); a time entered alone into an empty end field lands on the reference's day, or the next day when not after the reference. Used for Rückkehr, Ende, Bis.
- **REQ-003**: Ride dialog "Tour" select always lists every tour of the display window (plus tours loaded via `toursForAlarm` for older alarm times). Tours active at the alarm time are listed first under the group "Aktiv zur Alarmzeit", the rest under "Weitere Touren". Selecting any tour prefills vehicle and crew.
- **REQ-004**: When the chosen tour is not active at the alarm time, crew is prefilled from the members active at the tour's last covered instant (`min(alarm, tourEnd)` clamped to ≥ tour start), and a warning "Die Tour war zur Alarmzeit nicht aktiv." is shown (non-blocking).
- **REQ-005**: Ride dialog accepts `tourId` in `RideDialogData` to open with a preselected tour.
- **REQ-006**: Person fields (ride crew, ambulance crew, tour start/correct, crew-change add/replace) are type-to-search autocompletes matching name or employee number; inactive selected person still shown; persons already chosen in other rows of the same dialog are not offered.
- **REQ-007**: Rides list: open transports (no `returnedAt`) show a "Zurück jetzt" button that saves `returnedAt = nowMinute()`; tour cards of active tours show "Fahrt erfassen" opening the ride dialog with that tour.
- **REQ-008**: After a dialog saves successfully, the page shows a snackbar "Gespeichert" (3 s).
- **REQ-009**: `window.confirm()` in `tours.page.ts` and `rides.page.ts` replaced by a Material confirm dialog.
- **CON-001**: Layer rules (`npm run check:layers`): new UI code only in `ui/`; business rule for prefill crew in `domain/ride.ts` (pure, unit tested).
- **CON-002**: Zoneless + OnPush: new component state uses signals; plain fields changed after `await` need `markForCheck()`.
- **CON-003**: No new npm dependencies.
- **CON-004**: Spec change for REQ-003/REQ-004 recorded as an OpenSpec change (`openspec/changes/<date>-journal-usability/`) with a delta to `openspec/specs/rides/spec.md` requirement "Ride belongs to a tour".
- **PAT-001**: Shared UI pieces live in `src/app/ui/shared/` like `chip-list-input.component.ts` (standalone, OnPush, `input()`/`model()` signals).

## 2. Implementation Steps

### Implementation Phase 1 – Foundations (shared components, locale, spacing)

- GOAL-001: Provide shared building blocks and global spacing.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | `src/app/app.config.ts`: add `provideNativeDateAdapter()` replaced by `{provide: DateAdapter, useClass: GermanDateAdapter}`, `{provide: MAT_DATE_LOCALE, useValue: 'de-AT'}`, `{provide: MAT_DATE_FORMATS, useValue: GERMAN_DATE_FORMATS}`; `{provide: LOCALE_ID, useValue: 'de-AT'}` + `registerLocaleData(localeDeAt)` in `src/main.ts`. | ✅ | 2026-11-21 |
| TASK-002 | New `src/app/ui/shared/german-date-adapter.ts`: `GermanDateAdapter extends NativeDateAdapter`; `parse(value)` accepts `d.M.yyyy`, `d.M.yy`, `d.M.` (current year), else `super.parse`; `parseTime` accepts `HH:mm`, `H:mm`, `HHmm`, `H`. Export `GERMAN_DATE_FORMATS` (display `dateInput: {day:'2-digit',month:'2-digit',year:'numeric'}`, `timeInput: {hour:'2-digit',minute:'2-digit'}`, `timeOptionLabel` same). | ✅ | 2026-11-21 |
| TASK-003 | New `src/app/ui/shared/datetime-field.component.ts` (`app-datetime-field`): inputs `label` (required), `required` (bool), `hint`; `value = model<Date \| undefined>()`. Template: `.dialog-row` with `mat-form-field` "`{label}` – Datum" (`matInput [matDatepicker]`, `mat-datepicker-toggle`) and "`{label}` – Uhrzeit" (`matInput [matTimepicker]`, `mat-timepicker interval="15min"`, `mat-timepicker-toggle`), and `mat-icon-button` "Jetzt" (`aria-label="{label} jetzt"`, icon `schedule`) setting `nowMinute()`. Combining: changing date keeps hours/minutes of current value (default 00:00 → current time-of-day if empty); changing time keeps the date (default today). Emits `undefined` when date empty. | ✅ | 2026-11-21 |
| TASK-004 | New `src/app/ui/shared/person-field.component.ts` (`app-person-field`): inputs `label`, `exclude: string[]`, `allowNone` (adds "– niemand –"); `personId = model<string>('')`. `mat-autocomplete` with `displayWith` = name; options = `md.activePersons()` + selected-if-inactive, minus `exclude`, filtered case-insensitively on name or number (`toLocaleLowerCase('de')`). Clearing text sets `''`; typed text not matching a person reverts on blur. | ✅ | 2026-11-21 |
| TASK-005 | New `src/app/ui/shared/confirm-dialog.component.ts`: `ConfirmDialogComponent` (data `{title, message, confirmLabel}`), returns `true` on confirm; helper `confirmAction(dialog: MatDialog, data): Promise<boolean>` using `firstValueFrom(afterClosed())`. Confirm button `mat-flat-button color="warn"`. | ✅ | 2026-11-21 |
| TASK-006 | `src/styles.css`: `.dialog-form { display:flex; flex-direction:column; gap:16px; }`; `.dialog-row { gap:16px; }`; `.mat-mdc-dialog-content.mdc-dialog__content { padding-top: 12px !important; }` (prevents label clipping); `fieldset.crew, fieldset.member` shared style moved here with `display:flex; flex-direction:column; gap:12px; padding:12px 16px;` (remove duplicates from component `styles`). | ✅ | 2026-11-21 |
| TASK-007 | `src/app/ui/shared/datetime.ts`: remove `toLocalInput`/`fromLocalInput` once Phase 2 no longer uses them (grep before deleting); adjust `datetime.spec.ts`. | ✅ | 2026-11-21 |

### Implementation Phase 2 – Apply to dialogs

- GOAL-002: All four dialogs use `.dialog-form`, `app-datetime-field`, `app-person-field`.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-008 | `src/app/ui/tours/tour-dialog.component.ts`: wrap content in `<div class="dialog-form">`; `start` becomes `signal<Date \| undefined>`; `MemberRow.from/to` become `Date \| undefined`; "Beginn" and per-entry "Von"/"Bis" use `app-datetime-field`; `startChanged` → `effect`-free handler on `(valueChange)` copying to rows; person selects → `app-person-field` with `exclude` = other rows' personIds; `draft()` uses Dates directly. | ✅ | 2026-11-21 |
| TASK-009 | `src/app/ui/tours/crew-change-dialog.component.ts`: `at` → `signal<Date \| undefined>`; "Zeitpunkt" via `app-datetime-field`; person selects → `app-person-field` (exclude active members of the tour); `.dialog-form`. | ✅ | 2026-11-21 |
| TASK-010 | `src/app/ui/rides/ambulance-dialog.component.ts`: "Beginn"/"Ende" via `app-datetime-field` (`start`/`end` signals); crew person → `app-person-field` with exclude; `.dialog-form`. | ✅ | 2026-11-21 |
| TASK-011 | `src/app/ui/rides/ride-dialog.component.ts`: "Alarmierung"/"Rückkehr" via `app-datetime-field`; `alarm` signal is the field's model (drop `alarmAt` string); `(valueChange)` on Alarmierung calls `alarmChanged()`; crew person → `app-person-field` with exclude; `.dialog-form`. | ✅ | 2026-11-21 |

### Implementation Phase 3 – Tour picker always filled (ride dialog)

- GOAL-003: Selecting a tour prefills the ride regardless of the alarm time.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-012 | `src/app/domain/ride.ts`: add `prefillInstant(tour: Tour, alarmAt: Date): Date` = alarmAt if `isActiveAt(tour, alarmAt)`, else clamp alarmAt into `[tourStart(tour), tourEnd(tour) - 1ms]` (open tour: `tourEnd` undefined → clamp to start only). `prefillRide` uses `crewAt(tour, prefillInstant(tour, alarmAt))`. Add `isTourActiveAt` re-export if needed. Unit tests in `src/app/domain/ride.spec.ts`. | ✅ | 2026-11-21 |
| TASK-013 | `src/app/ui/rides/ride-dialog.component.ts`: replace `tourOptions` with `tourGroups = computed(() => ({active, others}))`: `all` = `journal.tours()` ∪ `olderTours()` ∪ own tour (dedupe by id), `active` = `toursActiveAt(all, alarm)`, `others` = rest sorted by start desc. Template uses `<mat-optgroup label="Aktiv zur Alarmzeit">` / `"Weitere Touren"`. `loadOlderToursIfNeeded` unchanged. Auto-select effect: if `isNew && !tourId` and `active.length === 1`. Add `notActiveWarning = computed(...)` shown as `.warning-text`. Add `RideDialogData.tourId?: string` initialising `tourId` and calling `tourChanged()` in `ngOnInit`. | ✅ | 2026-11-21 |
| TASK-014 | `openspec/changes/2026-11-21-journal-usability/` with `proposal.md`, `tasks.md`, `specs/rides/spec.md` delta: MODIFIED "Ride belongs to a tour" – system offers all tours of the display window, active-at-alarm first; new scenario "Tour not active at alarm time" (crew prefilled from the tour's nearest members, warning shown, saving allowed). | ✅ | 2026-11-21 |

### Implementation Phase 4 – Quick actions, feedback, confirm dialog

- GOAL-004: Fewer clicks for common actions.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-015 | `src/app/ui/rides/rides.page.ts`: for `kind !== 'AMBULANCE' && !returnedAt` render `mat-stroked-button` "Zurück jetzt" (icon `keyboard_return`) in the "Zurück" cell calling `returnNow(ride)` → `journal.saveRide({...ride, returnedAt: nowMinute()})`; errors via snackbar (`joinErrors`/`backendErrorMessage`). | ✅ | 2026-11-21 |
| TASK-016 | `src/app/ui/tours/tours.page.ts`: in `mat-card-actions` of active tours add first button "Fahrt erfassen" (icon `add`) opening `RideDialogComponent` with `{tourId: tour.id}`, width 640px. | ✅ | 2026-11-21 |
| TASK-017 | Both pages: every `dialog.open(...)` → `afterClosed()`; when result is truthy show `snack.open('Gespeichert', undefined, {duration: 3000})`. Extract helper `openForm(dialog, snack, component, config)` in `src/app/ui/shared/dialogs.ts`. | ✅ | 2026-11-21 |
| TASK-018 | Both pages: replace `confirm(...)` in `remove()` with `await confirmAction(this.dialog, {title: 'Löschen?', message: <existing text>, confirmLabel: 'Löschen'})`. | ✅ | 2026-11-21 |

### Implementation Phase 5 – Tests

- GOAL-005: All suites green.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-019 | `e2e/helpers/ui.ts`: add `fillDateTime(scope, label, d: Date)` (fills "`label` – Datum" with `dd.MM.yyyy`, "`label` – Uhrzeit" with `HH:mm`, then blur) and `readDateTime(scope, label): Promise<Date>`; replace `localInput`/`toInput` usages in `e2e/tests/*.spec.ts` (tours, rides, walkthrough, extra-car, ambulance, shift-plan) accordingly; `shift-plan.spec.ts` `toHaveValue` checks → compare both fields. Person `choose(...)` calls for converted fields → new helper `pickPerson(scope, label, name)` (type name, click option). Delete confirmations → click "Löschen" in confirm dialog instead of `page.on('dialog')`. | ✅ | 2026-11-21 |
| TASK-020 | Add e2e cases: ride from tour card "Fahrt erfassen" prefilled; "Zurück jetzt" sets return time; ride dialog lists a non-active tour under "Weitere Touren" and shows the warning. | ✅ | 2026-11-21 |

## 3. Alternatives

- **ALT-001**: Keep native `datetime-local` restyled – rejected by user (browser-dependent UX).
- **ALT-002**: Third-party combined datetime picker – rejected (dependency must track Angular 21; Material 21 ships `MatTimepicker`).
- **ALT-003**: Reactive Forms migration of all dialogs – not needed; signals/`ngModel` suffice and keep the change small.
- **ALT-004**: Make alarm time follow the chosen tour – not chosen; warning + clamped prefill instead.

## 4. Dependencies

- **DEP-001**: `@angular/material` 21 – `MatDatepickerModule`, `MatTimepickerModule`, `MatAutocompleteModule`, `MatDialogModule`, `NativeDateAdapter`.
- **DEP-002**: `@angular/common/locales/de-AT` for `registerLocaleData`.

## 5. Files

- **FILE-001**: `src/app/app.config.ts`, `src/main.ts` – date adapter, locale.
- **FILE-002**: `src/app/ui/shared/{german-date-adapter.ts, datetime-field.component.ts, person-field.component.ts, confirm-dialog.component.ts, dialogs.ts, datetime.ts}` – new/changed shared UI.
- **FILE-003**: `src/styles.css` – dialog spacing.
- **FILE-004**: `src/app/ui/tours/{tour-dialog, crew-change-dialog}.component.ts`, `tours.page.ts`.
- **FILE-005**: `src/app/ui/rides/{ride-dialog, ambulance-dialog}.component.ts`, `rides.page.ts`.
- **FILE-006**: `src/app/domain/ride.ts` (+ spec) – `prefillInstant`.
- **FILE-007**: `e2e/helpers/ui.ts`, `e2e/tests/*.spec.ts`.
- **FILE-008**: `openspec/changes/2026-11-21-journal-usability/**`.

## 6. Testing

- **TEST-001**: `german-date-adapter.spec.ts` – parse `21.11.2026`, `1.3.26`, `5.4.`, invalid → null; parseTime `14:05`, `905`, `9`.
- **TEST-002**: `datetime-field.component.spec.ts` – date change keeps time, time change keeps date, "Jetzt" sets current minute, empty date → `undefined`.
- **TEST-003**: `person-field.component.spec.ts` – filter by name/number, exclude list, inactive selected shown.
- **TEST-004**: `domain/ride.spec.ts` – `prefillInstant` inside, before start, after end, open tour; `prefillRide` crew for non-active tour.
- **TEST-005**: e2e updates + new cases (TASK-019/020).
- **TEST-006**: Verification commands: `npm run check:layers`, `npm run test:ci`, `npm run test:integration`, `npm run e2e`, `npm run build`; manual check with `npx ng serve --configuration=e2e --port 4300` against emulators: open each dialog, verify spacing, pickers, keyboard typing of `21.11.2026` / `14:05`.

## 7. Risks & Assumptions

- **RISK-001**: `MatTimepicker` with `NativeDateAdapter` requires `parseTime`/`addSeconds` – provided by Material ≥19 NativeDateAdapter; verify in TASK-002 tests.
- **RISK-002**: Large e2e churn (label changes); mitigated by central helpers in `e2e/helpers/ui.ts`.
- **RISK-004**: MatTimepicker clears the time on Escape and keeps the dialog open; resolved by intercepting Escape in `app-datetime-field` (closes the dialog instead).
- **RISK-003**: Offering non-active tours could lead to rides attached to the wrong tour; mitigated by grouping and the warning.
- **ASSUMPTION-001**: Users run current desktop/tablet browsers; no mobile-specific dialog layout required in this iteration.

## 8. Related Specifications / Further Reading

- `openspec/specs/rides/spec.md`, `openspec/specs/tours/spec.md`
- https://material.angular.dev/components/timepicker
- https://material.angular.dev/components/datepicker
