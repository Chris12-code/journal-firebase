# Spec Delta

## MODIFIED Requirements

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

### Requirement: Rides can be edited and deleted
The system SHALL allow editing all fields of a stored ride, crew snapshot included, and deleting a ride after confirmation. A transport without return time SHALL offer setting the return time to the current minute with one action (at least one minute after the alarm time).

#### Scenario: Add return time later
- **WHEN** a user edits a ride and sets the return time 08:05
- **THEN** the ride is stored with that return time

#### Scenario: Return now
- **WHEN** a user chooses "Zurück jetzt" for a transport alarmed at 07:12 at 08:05
- **THEN** the ride is stored with return time 08:05
