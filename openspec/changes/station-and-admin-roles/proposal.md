# Proposal

## Why

Every crew member currently needs a personal login just to set up tours and log rides. Maintaining one account per person is not practical for the station. The daily work should run under one shared station login, while a few personal accounts keep access to the yearly report and decide who may log in.

There is also a gap: today, any Firebase Auth account gets full access, including person contact data. Email/password sign-up is open to any client, so anyone can create such an account.

## What Changes

- **Roles.** Access is granted by a user entry in the backend with role `STATION` or `ADMIN` and an active flag. Having an Auth account alone no longer grants access. **BREAKING**: existing personal accounts lose access until they get a user entry.
- **Shared station login.** One generic "RK Strobl" account with role `STATION`, used by everybody for the daily work. It reads and writes tours and rides and reads persons and vehicles.
- **Admins.** Personal accounts with role `ADMIN` have the same access as the station login, plus the yearly report and user maintenance.
- **Report hidden from the station login.** The yearly report is not offered to `STATION` users. This is hidden in the UI only, and the data stays readable.
- **User maintenance.** Admins see a user list and can add a user (email, initial password, name, role), change name, role and active flag, send a password reset email, and remove a user's access. Removing access does not delete the Auth account. Admins cannot demote or deactivate themselves.
- **Author stamps unchanged.** Tours and rides keep recording the writing account. Entries made under the station login show the station account as author.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `journal-access`: personal login becomes a role-based login (STATION or ADMIN). Access requires an active user entry. The report is limited to admins. New requirements for user maintenance and the self-lockout guard. Author stamps stay, but are no longer tied to persons.

## Impact

- `firestore.rules`: new `users` collection and role checks replace `signedIn()` for all journal collections, including the legacy ones.
- New `users` collection (doc ID = Auth uid).
- `application/`: session exposes the role and active state. New user maintenance service and port.
- `data/`: user repository and mapper. A secondary Firebase app instance for creating Auth accounts without replacing the admin's session.
- `ui/`: role-aware guard and navigation (report and user list only for admins). New user list page and dialog.
- Tests: rules tests for each role, integration tests for the user repository, e2e seeds with a station user and an admin user.
- Operations: a one-time manual migration in the Firebase console before deploying the new rules. The shared account needs a real mailbox for password resets.
- Out of scope: Cloud Functions, server-side protection of the report, admins setting another user's password directly.
