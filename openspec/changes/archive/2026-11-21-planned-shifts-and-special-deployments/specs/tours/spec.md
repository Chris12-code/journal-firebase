# Spec Delta

## MODIFIED Requirements

### Requirement: Tour represents one shift on the journal sheet
The system SHALL let a user create a tour of kind shift or extra car, with a shift (DAY or NIGHT), an optional home vehicle and at least one crew member. A tour SHALL NOT require a vehicle. A shift tour MAY be linked to a planned slot. An extra car tour SHALL NOT be linked to a slot.

#### Scenario: Create a tour with a home vehicle
- **WHEN** a user creates a DAY tour with home vehicle 44.201 and a driver starting at 06:00
- **THEN** the tour is stored with shift DAY, home vehicle 44.201 and one open member entry for the driver from 06:00

#### Scenario: Create a tour without a vehicle
- **WHEN** a user creates a NIGHT tour at 18:00 without choosing a home vehicle
- **THEN** the tour is stored without a home vehicle and is shown as an active tour

#### Scenario: Tour without crew is rejected
- **WHEN** a user tries to save a tour with no crew member
- **THEN** the system refuses to save and tells the user that at least one crew member is required

#### Scenario: Existing tours without kind
- **WHEN** a stored tour has no kind
- **THEN** it is treated as a shift tour

### Requirement: Daily tour overview
The journal view SHALL show all active tours, plus tours that ended within the configured display window. Tours are grouped by shift, and each shows its home vehicle and its crew with their times. Extra car tours SHALL be marked as such.

#### Scenario: Old tour hidden
- **WHEN** a tour ended longer ago than the display window
- **THEN** it is not shown in the daily overview but remains stored and counted in reports

#### Scenario: Extra car marked
- **WHEN** an extra car tour is active
- **THEN** it is shown with the label "Zusatzfahrzeug"

## ADDED Requirements

### Requirement: Starting a tour from a planned slot
The system SHALL let a user start a shift tour from a planned slot. The shift, the home vehicle and the start time SHALL be pre-filled from the slot, and the tour SHALL be linked to it. All pre-filled values SHALL remain editable.

#### Scenario: Occupy the KTW slot
- **WHEN** a user starts a tour from the KTW day slot of a working day
- **THEN** the tour dialog shows shift DAY, home vehicle 44.301 and start 06:00, and the saved tour is linked to that slot

### Requirement: Planned end proposed when ending a tour
When a shift tour linked to a planned slot is ended, the system SHALL propose the slot's planned end as the end time. The actual end time entered SHALL be stored.

#### Scenario: Overtime after the planned end
- **WHEN** a user ends the RTW day tour of a working day and changes the proposed 19:00 to 19:25
- **THEN** all open members end at 19:25

### Requirement: Extra car tours
The system SHALL let a user start an extra car tour for people who take a free car while the regular crew is out. Its crew SHALL use the roles driver, transport lead and third person. It SHALL be offered for rides while it is active. The member times of an extra car tour SHALL NOT be used for hours.

#### Scenario: RTW out, second request
- **WHEN** the RTW is on a ride and two people take the KTW for a transport
- **THEN** a user starts an extra car tour on 44.301 with the two people and logs the transport for that tour
