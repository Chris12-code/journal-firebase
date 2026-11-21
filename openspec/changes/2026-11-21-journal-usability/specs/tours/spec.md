# Spec Delta

## ADDED Requirements

### Requirement: Log a ride from an active tour
Each active tour SHALL offer logging a ride for it. The ride dialog SHALL open with that tour preselected and its home vehicle and current crew prefilled.

#### Scenario: Ride from the tour card
- **WHEN** a user chooses "Fahrt erfassen" on the active DAY tour on 44.201
- **THEN** the ride dialog opens with the DAY tour, vehicle 44.201 and the members on duty
