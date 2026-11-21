# journal-access Specification

## Purpose

Defines who may access the journal sheet and how authorship of journal records is tracked, based on a shared station login and personal admin logins.

## Requirements

### Requirement: Journal requires a login with access
Users SHALL log in with an email and password before any journal data is shown. A logged-in account SHALL only see journal data if it has an active user entry with a role. Users who are not logged in SHALL only see the login.

#### Scenario: Not logged in
- **WHEN** a user opens the app without being logged in
- **THEN** only the login is offered and no tours, rides, persons or vehicles are loaded

#### Scenario: Logout
- **WHEN** a logged-in user logs out
- **THEN** journal data is no longer displayed and the login is offered

#### Scenario: Account without user entry
- **WHEN** a user logs in with an account that has no user entry, or whose user entry is inactive
- **THEN** a message says the account has no access, no journal data is loaded, and logging out is offered

### Requirement: Access is enforced by the backend
The backend SHALL reject all reads and writes of journal data from clients that are not logged in or whose account has no active user entry. Accounts with role `STATION` or `ADMIN` SHALL be able to read and write tours and rides and read persons and vehicles. User entries SHALL be readable and writable only by `ADMIN` accounts; every account SHALL be able to read its own user entry.

#### Scenario: Unauthenticated read rejected
- **WHEN** an unauthenticated client queries the rides collection directly
- **THEN** the backend rejects the request

#### Scenario: Account without user entry rejected
- **WHEN** a logged-in account without a user entry queries the persons collection directly
- **THEN** the backend rejects the request

#### Scenario: Inactive user rejected
- **WHEN** an account whose user entry is inactive writes a ride
- **THEN** the backend rejects the request

#### Scenario: Station account cannot change users
- **WHEN** a `STATION` account writes a user entry, including its own
- **THEN** the backend rejects the request

### Requirement: Journal records carry author stamps
Every tour and ride SHALL record the account that created it and when, and the account that last changed it and when. These values SHALL be set by the system, not entered by users. Records entered under the shared station login SHALL carry the station account as author.

#### Scenario: Ride edited by another user
- **WHEN** a ride is logged under the station login and an admin later edits it
- **THEN** the ride records the station account as creator and the admin account as last editor, each with the time of their action

### Requirement: Roles STATION and ADMIN
Each user entry SHALL have exactly one role: `STATION` for the shared login used for the daily work, or `ADMIN` for personal accounts that also see the report and maintain users. Each user entry SHALL also have a name, the account's email and an active flag.

#### Scenario: Station login sees the daily pages
- **WHEN** a user is logged in with a `STATION` account
- **THEN** the rides and tours pages are offered, and the report and user maintenance are not

#### Scenario: Admin sees everything
- **WHEN** a user is logged in with an `ADMIN` account
- **THEN** the rides, tours, report and user maintenance pages are offered

### Requirement: Yearly report is offered to admins only
The app SHALL offer the yearly report only to `ADMIN` accounts. This restriction applies to the user interface only; the backend does not need to prevent a `STATION` account from reading the underlying tours and rides.

#### Scenario: Station opens the report address
- **WHEN** a `STATION` user navigates directly to the report address
- **THEN** the report is not shown and the user is sent to a page they may use

### Requirement: Admins see the user list
The app SHALL show `ADMIN` accounts a list of all user entries with name, email, role and active state.

#### Scenario: User list
- **WHEN** an admin opens the user maintenance
- **THEN** every user entry is listed with name, email, role and whether it is active

### Requirement: Admins add users
An admin SHALL be able to add a user by entering email, initial password, name and role. The system SHALL create the login account and the user entry. The admin SHALL stay logged in as themselves.

#### Scenario: Add a user
- **WHEN** an admin adds a user with a new email, a password, a name and role `ADMIN`
- **THEN** the new account can log in with that password and sees the admin pages, and the admin is still logged in

#### Scenario: Email already in use
- **WHEN** an admin adds a user with an email that already has a login account
- **THEN** no user entry is created and a message says the email is already in use

### Requirement: Admins change users
An admin SHALL be able to change the name, role and active flag of a user entry. The email SHALL NOT be changeable in the app.

#### Scenario: Deactivate a user
- **WHEN** an admin deactivates another user
- **THEN** that account no longer gets journal data, also in sessions that are already open, at the latest on their next backend access

### Requirement: Admins remove a user's access
An admin SHALL be able to remove a user. Removing SHALL delete the user entry, so the account loses all access. The login account itself SHALL remain and can only be deleted outside the app.

#### Scenario: Remove a user
- **WHEN** an admin removes a user after confirming
- **THEN** the user is no longer listed and that account gets no journal data when logging in

### Requirement: Admins send password resets
An admin SHALL be able to send a password reset email to the email of a user entry. The app SHALL NOT let admins set another user's password directly.

#### Scenario: Reset the shared password
- **WHEN** an admin sends a password reset for the station account
- **THEN** a reset email is sent to the station account's email address and a confirmation is shown

### Requirement: Admins cannot lock themselves out
An admin SHALL NOT be able to change their own role, deactivate themselves or remove their own user entry.

#### Scenario: Own entry protected
- **WHEN** an admin opens their own user entry
- **THEN** role and active flag cannot be changed and removing is not offered, and the backend rejects such a change if attempted directly
