# Spec Delta

## Purpose

Records the shifts on the ambulance journal sheet: which people were on duty, in which role, and from when until when. These times are the source of truth for working-hour statistics.

## ADDED Requirements

### Requirement: Tour represents one shift on the journal sheet
The system SHALL let a user create a tour with a shift (DAY or NIGHT), an optional home vehicle and at least one crew member. A tour SHALL NOT require a vehicle.

#### Scenario: Create a tour with a home vehicle
- **WHEN** a user creates a DAY tour with home vehicle 44.201 and a driver starting at 06:00
- **THEN** the tour is stored with shift DAY, home vehicle 44.201 and one open member entry for the driver from 06:00

#### Scenario: Create a tour without a vehicle
- **WHEN** a user creates a NIGHT tour at 18:00 without choosing a home vehicle
- **THEN** the tour is stored without a home vehicle and is shown as an active tour

#### Scenario: Tour without crew is rejected
- **WHEN** a user tries to save a tour with no crew member
- **THEN** the system refuses to save and tells the user that at least one crew member is required

### Requirement: Crew members carry individual times and roles
Each crew member entry SHALL hold a person, a role (driver, transport lead or third person), a required start time and an optional end time. When an end time is set, it MUST be later than the start time.

#### Scenario: End time before start time is rejected
- **WHEN** a user sets a member's end time to 05:00 when the start time is 06:00 on the same day
- **THEN** the system refuses to save and reports the invalid time range

#### Scenario: Interval across midnight
- **WHEN** a member starts at 18:00 on 3 March and ends at 06:00 on 4 March
- **THEN** the entry is accepted with a duration of 12 hours

### Requirement: Crew can change during a tour
The system SHALL let a user add a member at a given time and end a member's participation at a given time without ending the tour. A role change SHALL be recorded as ending the current entry and starting a new entry for the same person with the new role at the same time.

#### Scenario: Third person leaves early
- **WHEN** the third person's participation is ended at 14:00 on a tour that continues
- **THEN** that member entry ends at 14:00 and the other members' entries stay open

#### Scenario: Transport lead is replaced
- **WHEN** at 10:30 the transport lead's entry is ended and another person is added as transport lead
- **THEN** the tour has two transport-lead entries, 06:00-10:30 and from 10:30 onward

#### Scenario: Driver and transport lead swap roles
- **WHEN** at 12:00 the driver becomes transport lead and the transport lead becomes driver
- **THEN** each person has two entries in the tour with the respective roles before and after 12:00

### Requirement: Ending a tour closes all open member entries
The system SHALL provide an action to end a tour at a given time. It sets that end time on every member entry that is still open.

#### Scenario: End tour with overtime
- **WHEN** a DAY tour is ended at 18:55 while all members are still open
- **THEN** every open member entry ends at 18:55

### Requirement: Tour start and end are derived from its members
The tour's start SHALL be the earliest member start time. Its end SHALL be the latest member end time, but only once all entries are closed. While any entry is open, the tour SHALL be considered active.

#### Scenario: Tour still active
- **WHEN** one member entry of a tour is still open
- **THEN** the tour is shown as active and has no end time

### Requirement: Tours may overlap in time and do not own a vehicle
The system SHALL allow tours that overlap in time, including tours with the same home vehicle, so that handovers and overtime can be recorded.

#### Scenario: Handover while the previous crew is still on a ride
- **WHEN** a NIGHT tour starts at 18:00 while the DAY tour is still active until 18:55
- **THEN** both tours are stored and both are shown as active between 18:00 and 18:55

### Requirement: Person on overlapping tours triggers a warning
When a member entry overlaps in time with another entry of the same person, in the same tour or in another one, the system SHALL warn the user. It SHALL still allow saving.

#### Scenario: Same person on two tours
- **WHEN** a user adds a person to the NIGHT tour from 18:00 while that person's DAY tour entry is open until 18:55
- **THEN** the system shows a warning naming the conflicting tour and still lets the user save

### Requirement: Only active master data can be selected
The person picker and the home-vehicle suggestions SHALL offer only active persons and active vehicles. The home vehicle MAY also be any other vehicle number entered as free text. Existing entries that reference inactive ones SHALL still be displayed.

#### Scenario: Inactive person not offered
- **WHEN** a user opens the person picker for a crew member
- **THEN** persons marked inactive are not listed

### Requirement: Tours with rides cannot be deleted
The system SHALL allow deleting a tour only when no ride references it.

#### Scenario: Delete blocked
- **WHEN** a user tries to delete a tour that has at least one ride
- **THEN** the system refuses and tells the user to delete or reassign the rides first

### Requirement: Daily tour overview
The journal view SHALL show all active tours, plus tours that ended within the configured display window. Tours are grouped by shift, and each shows its home vehicle and its crew with their times.

#### Scenario: Old tour hidden
- **WHEN** a tour ended longer ago than the display window
- **THEN** it is not shown in the daily overview but remains stored and counted in reports
