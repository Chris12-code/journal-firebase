# journal-access Specification

## Purpose

Defines who may access the journal sheet and how authorship of journal records is tracked, based on personal logins.

## Requirements

### Requirement: Journal requires a personal login
Users SHALL log in with a personal email and password before any journal data is shown. Users who are not logged in SHALL only see the login.

#### Scenario: Not logged in
- **WHEN** a user opens the app without being logged in
- **THEN** only the login is offered and no tours, rides, persons or vehicles are loaded

#### Scenario: Logout
- **WHEN** a logged-in user logs out
- **THEN** journal data is no longer displayed and the login is offered

### Requirement: Access is enforced by the backend
The backend SHALL reject all reads and writes of journal data from unauthenticated clients. Authenticated users SHALL be able to read and write tours and rides and read persons and vehicles. No further roles are distinguished.

#### Scenario: Unauthenticated read rejected
- **WHEN** an unauthenticated client queries the rides collection directly
- **THEN** the backend rejects the request

### Requirement: Journal records carry author stamps
Every tour and ride SHALL record the user who created it and when, and the user who last changed it and when. These values SHALL be set by the system, not entered by users.

#### Scenario: Ride edited by another user
- **WHEN** user A logs a ride and user B later edits it
- **THEN** the ride shows A as creator and B as last editor, each with the time of their action
