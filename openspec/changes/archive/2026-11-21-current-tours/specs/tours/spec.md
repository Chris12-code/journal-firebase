# Spec Delta

## MODIFIED Requirements

### Requirement: Daily tour overview
The journal view SHALL show the current tours: tours that are active, tours that ended at most 4 hours ago, and tours that start within the next 4 hours. Active tours SHALL stay visible regardless of their start, as long as they started before the next 4 hours. Tours are grouped by shift, and each shows its home vehicle and its crew with their times. Extra car tours SHALL be marked as such.

#### Scenario: Old tour hidden
- **WHEN** a tour ended 5 hours ago
- **THEN** it is not shown in the daily overview but remains stored and counted in reports

#### Scenario: Recently ended tour shown
- **WHEN** a tour ended 2 hours ago
- **THEN** it is shown in the daily overview as ended

#### Scenario: Overtime tour shown
- **WHEN** a DAY tour is still active at 23:00
- **THEN** it is shown in the daily overview

#### Scenario: Extra car marked
- **WHEN** an extra car tour is active
- **THEN** it is shown with the label "Zusatzfahrzeug"

## ADDED Requirements

### Requirement: Late ride extends the tour end
When a transport is saved whose end (the return time, otherwise the alarm time) lies after the end of its already ended tour, the system SHALL move the tour end to the ride end: every member entry that ended at the tour end SHALL end at the ride end instead. The ride dialog SHALL show the new tour end before saving. Active tours and rides within the tour SHALL leave the tour unchanged.

#### Scenario: Last ride entered after sign-off
- **WHEN** the DAY tour ended at 18:55 and a ride of that tour is saved with return time 19:40
- **THEN** the members who ended at 18:55 end at 19:40 and the tour shows "beendet 19:40"

#### Scenario: Member who left earlier
- **WHEN** the third person left the tour at 14:00 and the tour is extended from 18:55 to 19:40
- **THEN** the third person still ends at 14:00
