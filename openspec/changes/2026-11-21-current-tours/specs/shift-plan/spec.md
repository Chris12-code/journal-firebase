# Spec Delta

## MODIFIED Requirements

### Requirement: Planned slots in the Dienstmannschaft view
The Dienstmannschaft view SHALL show the planned slots that are running, ended at most 4 hours ago, or start within the next 4 hours, plus the slot of every current tour linked to a slot. Each SHALL show its vehicle, shift, planned times, status and, when occupied, the linked tour.

#### Scenario: Evening overview
- **WHEN** a user opens the view at 19:00 on a working day
- **THEN** the KTW, BTW and RTW day slots of today and the RTW night slot are listed with their status, and the slots of tomorrow are not

#### Scenario: Morning ahead
- **WHEN** a user opens the view at 02:30 before a working day
- **THEN** the running night slot and the KTW day slot starting at 06:00 are listed

#### Scenario: Long overtime keeps the slot
- **WHEN** the tour occupying the KTW day slot (planned until 17:00) is still active at 22:00
- **THEN** the KTW day slot is still listed as occupied
