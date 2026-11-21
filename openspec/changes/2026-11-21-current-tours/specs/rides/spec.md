# Spec Delta

## MODIFIED Requirements

### Requirement: Ride belongs to a tour
Every transport SHALL reference exactly one tour. An ambulance shift SHALL NOT reference a tour. When logging a transport, the system SHALL offer the current tours as shown in the Dienstmannschaft view (active, ended at most 4 hours ago, or starting within 4 hours), including extra car tours, with the tours active at the alarm time listed first. When an existing ride is edited, its own tour SHALL also be offered. A tour not active at the alarm time MAY be chosen; the system SHALL then show a warning that does not block saving.

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

#### Scenario: Old tour not offered
- **WHEN** a tour ended 6 hours ago
- **THEN** it is not offered for a new ride

#### Scenario: Editing an old ride
- **WHEN** a user edits a ride from yesterday
- **THEN** its own tour is still selected and offered
