# master-data Specification

## Purpose

Provides the persons and vehicles that tours and rides refer to, as reference data that is maintained outside the app and stays resolvable for historical records.

## Requirements

### Requirement: Persons are reference data
The system SHALL read persons from the backend. Each person has an employee number (unique, used as identifier), a name, optional contact data and an active flag.

#### Scenario: Person resolved by employee number
- **WHEN** a tour member references employee number 07414
- **THEN** the system displays that person's name

### Requirement: Vehicles are reference data
The system SHALL read vehicles from the backend. Each vehicle has a vehicle number (unique, used as identifier), a type (RTW, KTW or BTW) and an active flag.

#### Scenario: Vehicle type shown
- **WHEN** a ride references vehicle 80.103 that is stored with type KTW
- **THEN** the system displays it with its type KTW

### Requirement: Default vehicles exist without master data
The system SHALL know the vehicles 44.201 (RTW), 44.301 (KTW) and 20.410 (BTW) as active defaults, even when no vehicles are stored in the backend. A stored vehicle with the same number SHALL replace the default, for example to deactivate it.

#### Scenario: Fresh installation
- **WHEN** the backend contains no vehicle documents
- **THEN** the vehicle suggestions offer 44.201 (RTW), 44.301 (KTW) and 20.410 (BTW)

#### Scenario: Default deactivated in the console
- **WHEN** the backend stores vehicle 20.410 with active set to false
- **THEN** 20.410 is no longer suggested but is still displayed as 20.410 (BTW) on existing rides

### Requirement: Any vehicle number can be entered
Vehicle fields on tours and rides SHALL accept any vehicle number as free text and SHALL suggest the active known vehicles. A number without master data SHALL be stored and displayed as entered, without a type.

#### Scenario: Replacement car
- **WHEN** a user enters vehicle number 99.123, which is neither a default nor stored
- **THEN** the system shows a hint that the number is unknown, stores the ride with vehicle 99.123 and displays 99.123 in the ride list

### Requirement: Master data is read-only in the app
The app SHALL NOT create, modify or delete persons or vehicles. The backend SHALL reject such writes from app users.

#### Scenario: Write attempt rejected
- **WHEN** a logged-in client tries to write a person document
- **THEN** the backend rejects the write

### Requirement: Deactivated master data stays resolvable
Persons and vehicles SHALL be deactivated instead of deleted. Inactive entries SHALL NOT be offered for new selections. They SHALL still be displayed in existing tours, rides and reports.

#### Scenario: Former member in last year's report
- **WHEN** a person who has since been deactivated has hours in the selected report year
- **THEN** the report lists that person with their hours and rides

### Requirement: Personal data is not bundled with the app
Person data, including contact details, SHALL NOT be part of the application bundle or the source repository. It SHALL be available only to logged-in users.

#### Scenario: Anonymous access
- **WHEN** a user who is not logged in loads the application
- **THEN** no person data is delivered to the browser
