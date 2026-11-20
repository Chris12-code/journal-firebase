# Spec Delta

## Purpose

Logs each ride on the journal sheet: when it happened, which vehicle was used, which tour carried it out and who was on board. These records are the source for ride statistics per person.

## ADDED Requirements

### Requirement: Ride records alarm time and optional return time
Every ride SHALL have an alarm time. A ride MAY have a return time. When a return time is set, it MUST be later than the alarm time.

#### Scenario: Ride without return time
- **WHEN** a user logs a ride with alarm time 07:12 and no return time
- **THEN** the ride is stored and shown as not yet returned

#### Scenario: Return before alarm is rejected
- **WHEN** a user sets a return time of 07:00 for a ride alarmed at 07:12 on the same day
- **THEN** the system refuses to save and reports the invalid time range

### Requirement: Ride belongs to a tour
Every ride SHALL reference exactly one tour. When logging a ride, the system SHALL offer the tours that are active at the alarm time.

#### Scenario: Overtime tour is offered
- **WHEN** a ride is logged with alarm time 18:20, the DAY tour is still active until 18:55 and the NIGHT tour started at 18:00
- **THEN** both tours are offered for selection

### Requirement: Ride records the vehicle actually used
Every ride SHALL record a vehicle. The vehicle SHALL be pre-filled with the selected tour's home vehicle and can be changed to any other vehicle number without changing the tour.

#### Scenario: RTW crew uses the KTW
- **WHEN** a user logs a ride for a tour with home vehicle 44.201 (RTW) and changes the vehicle to 44.301 (KTW)
- **THEN** the ride is stored with vehicle 44.301 and the tour's home vehicle stays 44.201

#### Scenario: Tour without home vehicle
- **WHEN** a user logs a ride for a tour that has no home vehicle
- **THEN** the vehicle field is empty and must be chosen before saving

### Requirement: Ride stores a crew snapshot
Every ride SHALL store its crew as a list of persons with roles, with at least one person. The snapshot SHALL be pre-filled from the selected tour's members active at the alarm time and SHALL be editable before saving.

#### Scenario: Pre-fill after crew change
- **WHEN** a ride is logged at 11:40 for a tour whose transport lead was replaced at 10:30
- **THEN** the pre-filled crew contains the new transport lead and not the previous one

#### Scenario: Crew adjusted manually
- **WHEN** a user removes the third person from the pre-filled crew before saving
- **THEN** the stored ride contains only the remaining persons

### Requirement: Crew snapshot is independent of later tour edits
Changing a tour's members or member times SHALL NOT change the crew snapshot of rides that are already stored.

#### Scenario: Tour corrected after the ride
- **WHEN** a member of a tour is replaced in the tour after a ride was logged
- **THEN** the stored ride still lists the crew as it was saved

### Requirement: Ride classification and locations
A ride SHALL record a type (NA, RD or KT). It MAY record a category (CPR, VU or Kinder), a patient type (Mann, Frau or Kind), a pickup location and a destination.

#### Scenario: Minimal ride
- **WHEN** a user saves a ride with only type, alarm time, tour, vehicle and crew
- **THEN** the ride is stored and the optional fields are empty

### Requirement: Rides can be edited and deleted
The system SHALL allow editing all fields of a stored ride, crew snapshot included, and deleting a ride.

#### Scenario: Add return time later
- **WHEN** a user edits a ride and sets the return time 08:05
- **THEN** the ride is stored with that return time

### Requirement: Daily ride list
The journal view SHALL list the rides whose alarm time lies within the configured display window, newest first. Each entry shows the alarm time, vehicle, type, locations and crew.

#### Scenario: Old ride hidden from daily list
- **WHEN** a ride's alarm time is older than the display window
- **THEN** it is not listed in the daily view but remains stored and counted in reports
