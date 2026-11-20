# Spec Delta

## Purpose

Derives the planned shift slots of the station from the calendar (working day, weekend, Austrian public holiday), so the journal can show which shifts are planned, which are occupied and which are still open.

## ADDED Requirements

### Requirement: Austrian public holidays
The system SHALL treat the 13 national Austrian public holidays as holidays: 1 Jan, 6 Jan, Easter Monday, 1 May, Ascension Day, Whit Monday, Corpus Christi, 15 Aug, 26 Oct, 1 Nov, 8 Dec, 25 Dec and 26 Dec. No other days SHALL count as holidays.

#### Scenario: Movable holidays
- **WHEN** the year is 2027 (Easter Sunday 28 March)
- **THEN** 29 March, 6 May, 17 May and 27 May 2027 are holidays

#### Scenario: Christmas Eve is no holiday
- **WHEN** 24 December falls on a Thursday
- **THEN** that day is a working day

### Requirement: Working days, weekends and holidays
A date SHALL be a working day when it is Monday to Friday and not a public holiday. Saturdays, Sundays and public holidays SHALL use the weekend plan.

#### Scenario: Holiday on a weekday
- **WHEN** 26 October is a Tuesday
- **THEN** the weekend plan applies to that date

### Requirement: Planned slots on working days
On a working day the system SHALL plan the following slots: RTW 44.201 day 07:30–19:00, KTW 44.301 day 06:00–17:00, BTW 20.410 day 06:30–18:00, and RTW 44.201 night starting at 19:00.

#### Scenario: Wednesday
- **WHEN** the plan for a Wednesday that is not a holiday is requested
- **THEN** it contains four slots: RTW day, KTW day, BTW day and RTW night, with the times above

### Requirement: Planned slots on weekends and holidays
On a Saturday, Sunday or public holiday the system SHALL plan only the RTW 44.201: a day slot 07:00–19:00 and a night slot starting at 19:00.

#### Scenario: Saturday
- **WHEN** the plan for a Saturday is requested
- **THEN** it contains exactly two slots: RTW day 07:00–19:00 and RTW night from 19:00

### Requirement: Night shift end depends on the following day
A night slot SHALL end at 06:00 on the following day when that day is a working day. Otherwise it SHALL end at 07:00.

#### Scenario: Friday night
- **WHEN** the night slot of a Friday (not followed by a holiday) is planned
- **THEN** it ends on Saturday at 07:00

#### Scenario: Sunday night
- **WHEN** the night slot of a Sunday is planned and Monday is a working day
- **THEN** it ends on Monday at 06:00

#### Scenario: Night before a holiday
- **WHEN** the night slot of a working day is planned and the next day is a public holiday
- **THEN** it ends at 07:00

### Requirement: KTW covers the RTW in the morning gap
On working days the RTW day slot SHALL carry the note that the time from 06:00 to 07:30 is covered by the KTW. This gap SHALL NOT be shown as unoccupied.

#### Scenario: Morning on a working day
- **WHEN** the planned slots of a working day are displayed
- **THEN** the RTW day slot shows "06:00–07:30 durch KTW abgedeckt"

### Requirement: Slot occupation status
A planned slot SHALL be occupied when a shift tour is linked to it. A slot without a linked tour SHALL be unoccupied once its start time has passed, and upcoming before that.

#### Scenario: KTW not staffed
- **WHEN** it is 08:00 on a working day and no tour is linked to the KTW day slot
- **THEN** the KTW slot is shown as unoccupied

#### Scenario: Night slot ahead
- **WHEN** it is 15:00 and no tour is linked to the RTW night slot
- **THEN** the night slot is shown as upcoming

### Requirement: Planned slots in the Dienstmannschaft view
The Dienstmannschaft view SHALL show the planned slots that are running, start within the next 24 hours, or ended within the display window. Each SHALL show its vehicle, shift, planned times, status and, when occupied, the linked tour.

#### Scenario: Evening overview
- **WHEN** a user opens the view at 18:30 on a working day
- **THEN** the RTW day and night slots of today and the slots of tomorrow are listed with their status
