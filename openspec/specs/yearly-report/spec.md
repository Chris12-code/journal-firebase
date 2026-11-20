# yearly-report Specification

## Purpose

Produces per-person statistics for a calendar year, covering hours worked and number of rides, from the journal sheet's tours and rides.

## Requirements

### Requirement: Report per person for a selected year
The system SHALL let a logged-in user select a calendar year and see, for each person, the hours worked and the number of rides in that year. Every logged-in user SHALL be able to view the report.

#### Scenario: View report
- **WHEN** a logged-in user opens the report and selects 2027
- **THEN** a list of persons with hours worked and number of rides in 2027 is shown

### Requirement: Hours are the sum of closed member intervals
A person's hours SHALL be the total length of all their closed member entries across all tours, regardless of role. Time where the same person's entries overlap SHALL be counted once.

#### Scenario: Crew change within a tour
- **WHEN** a person was transport lead from 06:00 to 10:30 and driver from 10:30 to 18:00 in the same tour
- **THEN** 12 hours are counted for that person

#### Scenario: Overtime and handover both counted
- **WHEN** the DAY crew is recorded until 18:55 and the NIGHT crew from 18:00
- **THEN** the DAY crew's hours include 18:00-18:55 and the NIGHT crew's hours include it too

#### Scenario: Overlapping entries of the same person
- **WHEN** a person has an entry from 06:00 to 18:55 and another from 18:00 to 06:00 the next day
- **THEN** 24 hours are counted for that person, not 24 hours 55 minutes

### Requirement: Intervals crossing the year boundary are split
Only the part of a member interval that lies within the selected year SHALL count toward that year.

#### Scenario: New Year's Eve night shift
- **WHEN** a member entry runs from 31 December 18:00 to 1 January 06:00
- **THEN** 6 hours count toward the earlier year and 6 hours toward the later year

### Requirement: Open member entries are flagged, not counted
Member entries without an end time SHALL NOT count toward hours. The report SHALL list them so that missing end times can be fixed.

#### Scenario: Forgotten end of tour
- **WHEN** a person has a member entry started on 3 March with no end time
- **THEN** that entry adds no hours and the report shows a notice naming the person, the tour and its start time

### Requirement: Rides are counted per person from the crew snapshot
A person's ride count SHALL be the number of rides whose alarm time falls in the selected year and whose crew snapshot contains that person, regardless of role or vehicle.

#### Scenario: Ride on a different vehicle
- **WHEN** a person is in the crew snapshot of a ride on vehicle 80.103 while their tour's home vehicle is 44.201
- **THEN** the ride counts toward that person's ride total

### Requirement: Report includes all persons with activity
The report SHALL list every active person, with zero values when they have no activity, and every inactive person with activity in the selected year.

#### Scenario: Active person without activity
- **WHEN** an active person has no member entries and no rides in the selected year
- **THEN** the person is listed with 0 hours and 0 rides
