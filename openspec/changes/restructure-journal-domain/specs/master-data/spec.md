# Spec Delta

## Purpose

Provides the persons and vehicles that tours and rides refer to, as reference data that is maintained outside the app and stays resolvable for historical records.

## ADDED Requirements

### Requirement: Persons are reference data
The system SHALL read persons from the backend. Each person has an employee number (unique, used as identifier), a name, optional contact data and an active flag.

#### Scenario: Person resolved by employee number
- **WHEN** a tour member references employee number 07414
- **THEN** the system displays that person's name

### Requirement: Vehicles are reference data
The system SHALL read vehicles from the backend. Each vehicle has a vehicle number (unique, used as identifier), a type (RTW, KTW or BTW) and an active flag.

#### Scenario: Vehicle type shown
- **WHEN** a ride references vehicle 80.103
- **THEN** the system displays it with its type KTW

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
