# rides Specification

## Purpose

Logs each ride on the journal sheet: when it happened, which vehicle was used, which tour carried it out and who was on board. These records are the source for ride statistics per person.

## Requirements

### Requirement: Ride records alarm time and optional return time
Every ride SHALL have an alarm time. A ride MAY have a return time. When a return time is set, it MUST be later than the alarm time.

#### Scenario: Ride without return time
- **WHEN** a user logs a ride with alarm time 07:12 and no return time
- **THEN** the ride is stored and shown as not yet returned

#### Scenario: Return before alarm is rejected
- **WHEN** a user sets a return time of 07:00 for a ride alarmed at 07:12 on the same day
- **THEN** the system refuses to save and reports the invalid time range

### Requirement: Ride belongs to a tour
Every transport SHALL reference exactly one tour. An ambulance shift SHALL NOT reference a tour. When logging a transport, the system SHALL offer every tour of the display window, including extra car tours, with the tours active at the alarm time listed first. When the alarm time lies before the display window, the tours active at that time SHALL be loaded and offered. A tour not active at the alarm time MAY be chosen; the system SHALL then show a warning that does not block saving.

#### Scenario: Overtime tour is offered
- **WHEN** a ride is logged with alarm time 18:20, the DAY tour is still active until 18:55 and the NIGHT tour started at 18:00
- **THEN** both tours are offered first for selection

#### Scenario: Extra car offered
- **WHEN** a transport is logged while an extra car tour is active
- **THEN** the extra car tour is offered for selection

#### Scenario: Tour not active at the alarm time
- **WHEN** a user enters alarm time 05:00 and chooses the DAY tour that started at 06:00
- **THEN** the tour is selectable, a warning "Die Tour war zur Alarmzeit nicht aktiv." is shown and the ride can be saved

#### Scenario: Ride logged from a tour
- **WHEN** a user starts a new ride from an active tour
- **THEN** that tour is preselected and its vehicle and crew are prefilled

### Requirement: Ride records the vehicle actually used
Every ride SHALL record its vehicles as a list. A transport SHALL have exactly one vehicle. The vehicle SHALL be pre-filled with the selected tour's home vehicle and can be changed to any other vehicle number without changing the tour.

#### Scenario: RTW crew uses the KTW
- **WHEN** a user logs a ride for a tour with home vehicle 44.201 (RTW) and changes the vehicle to 44.301 (KTW)
- **THEN** the ride is stored with vehicle 44.301 and the tour's home vehicle stays 44.201

#### Scenario: Tour without home vehicle
- **WHEN** a user logs a ride for a tour that has no home vehicle
- **THEN** the vehicle field is empty and must be chosen before saving

### Requirement: Ride stores a crew snapshot
Every ride SHALL store its crew as a list of persons with positions, with at least one person. For transports the snapshot SHALL be pre-filled from the selected tour's members active at the alarm time and SHALL be editable before saving. When the tour was not active at the alarm time, the snapshot SHALL be pre-filled from the members active at the nearest moment within the tour (its start for an earlier alarm, its last minute for a later alarm).

#### Scenario: Pre-fill after crew change
- **WHEN** a ride is logged at 11:40 for a tour whose transport lead was replaced at 10:30
- **THEN** the pre-filled crew contains the new transport lead and not the previous one

#### Scenario: Crew adjusted manually
- **WHEN** a user removes the third person from the pre-filled crew before saving
- **THEN** the stored ride contains only the remaining persons

#### Scenario: Pre-fill from an ended tour
- **WHEN** a ride is logged at 20:00 for a DAY tour that ended at 18:55
- **THEN** the pre-filled crew contains the members on duty at 18:54

### Requirement: Crew snapshot is independent of later tour edits
Changing a tour's members or member times SHALL NOT change the crew snapshot of rides that are already stored.

#### Scenario: Tour corrected after the ride
- **WHEN** a member of a tour is replaced in the tour after a ride was logged
- **THEN** the stored ride still lists the crew as it was saved

### Requirement: Ride classification and locations
A transport SHALL record a type (NA, RD or KT). It MAY record a category (CPR, VU or Kinder), a patient type (Mann, Frau or Kind), a pickup location and a destination. An ambulance shift SHALL NOT require a type.

#### Scenario: Minimal ride
- **WHEN** a user saves a ride with only type, alarm time, tour, vehicle and crew
- **THEN** the ride is stored and the optional fields are empty

### Requirement: Rides can be edited and deleted
The system SHALL allow editing all fields of a stored ride, crew snapshot included, and deleting a ride after confirmation. A transport without return time SHALL offer setting the return time to the current minute with one action (at least one minute after the alarm time).

#### Scenario: Add return time later
- **WHEN** a user edits a ride and sets the return time 08:05
- **THEN** the ride is stored with that return time

#### Scenario: Return now
- **WHEN** a user chooses "Zurück jetzt" for a transport alarmed at 07:12 at 08:05
- **THEN** the ride is stored with return time 08:05

### Requirement: Daily ride list
The journal view SHALL list the rides whose alarm time lies within the configured display window, newest first. Each entry shows the alarm time, vehicles, type, locations and crew, and the additional resources present, if any. Ambulance shifts SHALL show their event, start and end, and the number of assistances.

#### Scenario: Old ride hidden from daily list
- **WHEN** a ride's alarm time is older than the display window
- **THEN** it is not listed in the daily view but remains stored and counted in reports

#### Scenario: Ambulance shift in the list
- **WHEN** an ambulance shift "Seefest Strobl" from 14:00 to 23:00 with 3 assistances lies within the display window
- **THEN** the list shows it with event, times and "3 Hilfeleistungen"

### Requirement: Ambulance shifts
The system SHALL let a user record an ambulance shift as a ride with an event or location, a required start and end time, zero or more vehicles, a crew of any size and a number of assistances (zero or more). The end MUST be later than the start.

#### Scenario: Event with two cars and five people
- **WHEN** a user records "Seefest Strobl" from 14:00 to 23:00 with vehicles 44.301 and 45.201, five crew members and 3 assistances
- **THEN** the ambulance shift is stored with all of these values and without a tour

#### Scenario: Missing end time
- **WHEN** a user tries to save an ambulance shift without an end time
- **THEN** the system refuses to save and asks for the end time

#### Scenario: Negative assistances
- **WHEN** a user enters -1 assistances
- **THEN** the system refuses to save

### Requirement: Positions on ambulance shifts
Crew members of an ambulance shift SHALL have a position from the list Fahrer, Transportführer, Sanitäter, Einsatzleiter and Praktikant, or a free-text position. Transports SHALL keep the roles driver, transport lead and third person.

#### Scenario: Free-text position
- **WHEN** a user assigns the position "Fußtrupp" to a crew member of an ambulance shift
- **THEN** the crew member is stored and displayed with the position "Fußtrupp"

### Requirement: Additional resources present
A ride MAY record a list of additional resources that were present, for transports and ambulance shifts alike. The system SHALL suggest Notarzt, Notarzthubschrauber, Polizei, Feuerwehr, Bergrettung and Wasserrettung, and SHALL accept any other entry as free text. Entries SHALL be stored as entered (trimmed), without duplicates.

#### Scenario: Helicopter and police
- **WHEN** a user adds "Notarzthubschrauber" and "Polizei" to a transport
- **THEN** the ride is stored with both resources and the ride list shows them

#### Scenario: Free-text resource
- **WHEN** a user enters "Rotes Kreuz Bad Ischl" as a resource
- **THEN** it is stored and shown exactly as entered

#### Scenario: Duplicate entry
- **WHEN** a user adds "Polizei" twice
- **THEN** it is stored once
