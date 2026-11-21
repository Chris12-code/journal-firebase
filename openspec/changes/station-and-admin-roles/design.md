# Design

## Context

- Today `firestore.rules` grants everything on `signedIn()`. Any Firebase Auth account has full access, and email/password sign-up is open to any client that has the public web config.
- `SessionService` (application) exposes only `{uid, email}` from `AuthGateway`. `authGuard` checks just that a user exists. Routes: `fahrten`, `touren`, `bericht`.
- There are no Cloud Functions and no Admin SDK. The project should stay on client SDK + rules (see proposal, out of scope).
- Audit stamps are written in `data/firestore-util.ts` from the current uid and checked by rules. They are not displayed anywhere.
- Requirements: `specs/journal-access/spec.md` in this change.

## Goals / Non-Goals

**Goals:**
- The backend decides access based on one Firestore document per account.
- A deactivation or removal takes effect immediately on the backend and quickly in open sessions.
- User maintenance works entirely in the browser.

**Non-Goals:**
- Custom claims, Cloud Functions, deleting Auth accounts from the app.
- Protecting the report data from `STATION` accounts (UI-only hiding, see spec).
- Changing how tours and rides are stamped or stored.

## Decisions

### D1: Roles live in Firestore `users/{uid}`, not in custom claims

Document shape (only `data/mappers.ts` knows it):

```
users/{uid}   (doc ID = Firebase Auth uid)
  email   string   copied at creation, not changeable in the app
  name    string
  role    'STATION' | 'ADMIN'
  active  boolean
```

Rules read it with `get()`. Alternative: custom claims set by a callable Cloud Function. That gives cheaper rule checks and a true delete of Auth accounts, but needs the Blaze plan, a `functions/` project and a deploy pipeline, which is too much for a single shared role switch. The cost of A is one extra document read per rule evaluation (`get()` results are cached within one request), which is negligible at this volume.

### D2: Rules shape

```
function userDoc()  { return get(/databases/$(database)/documents/users/$(request.auth.uid)); }
function member()   { return request.auth != null
                        && exists(/databases/$(database)/documents/users/$(request.auth.uid))
                        && userDoc().data.active == true; }
function admin()    { return member() && userDoc().data.role == 'ADMIN'; }
```

- `persons`, `vehicles`: read `member()`, write false (unchanged otherwise).
- `tours`, `rides`: `signedIn()` replaced by `member()`; `validCreate`/`validUpdate` unchanged.
- Legacy `car-tour`, `rescue-operation`: `member()` as well, so the old app version cannot bypass the gate.
- `users/{uid}`:
  - read: `admin() || request.auth.uid == uid` (an account without a doc gets "not found", which the app reads as "no access").
  - create: `admin()`, keys exactly `email, name, role, active`, role in the two values, `active` boolean.
  - update: `admin()`, same key/value checks, `email` unchanged; if `uid == request.auth.uid` then `role` and `active` unchanged (self-lockout guard).
  - delete: `admin() && uid != request.auth.uid`.

The self-lockout guard is enforced in rules, not only hidden in the UI. Two admins can still demote each other. That's accepted: it needs deliberate action, and the console remains the fallback.

### D3: Domain and application

- `domain/user.ts`: `UserRole` (named apart from the crew `Role` in `model.ts`), `UserEntry {uid, email, name, role, active}`, `Access = 'NONE' | UserRole`, `accessOf(entry)`, and a pure `selfEditRestrictions(actorUid, entry)` (which fields are locked, can remove) used by the dialog. Has unit tests.
- `application/ports.ts`:
  - `AuthGateway` gains `access$(uid): Observable<UserEntry | null>`, a live listener on the account's own user doc (keeps the "own doc" read in one place), and `sendPasswordReset(email)`.
  - New `UserRepository` port: `list$()`, `create({email, password, name, role})`, `update(uid, {name, role, active})`, `remove(uid)`.
- `SessionService` combines `user$` and `access$` into one state:

```
  undefined ---> loggedOut
      |
      +--------> loggedIn --+--> NONE      (no doc, inactive, or permission error)
                            +--> STATION
                            +--> ADMIN
```

  It exposes `access` (signal) and `isAdmin` (computed). Because `access$` is a snapshot listener, deactivating or demoting a user updates an open session without reload. Journal listeners (`JournalService`, `MasterDataService`) start only when access is not `NONE`, so a no-access account does not cause a burst of permission errors.
- New `UserAdminService` (application) wraps `UserRepository` and maps Firebase error codes to German messages (`email-already-in-use`, `weak-password`, `invalid-email`), like `SessionService.login` does.

### D4: Creating accounts with a secondary Firebase app

`createUserWithEmailAndPassword` on the primary `Auth` would sign the admin in as the new user. The data layer instead creates a second app instance, lazily and once:

```
initializeApp(env.firebase, 'user-admin')
  -> initializeAuth(app, {persistence: inMemoryPersistence})   // never touches the admin's stored session
  -> connectAuthEmulator(...) when useEmulators
createUserWithEmailAndPassword(secondaryAuth, email, password)  -> uid
signOut(secondaryAuth)
setDoc(users/{uid}, {...}) on the PRIMARY Firestore              // written as the admin, so rules apply
```

This lives in `data/` behind `UserRepository.create`. The `FirebaseEnvironment` already passed to `provideFirebase` holds the options for the secondary app.

Alternative: the admin creates accounts in the Firebase console and the app only writes the user doc by uid. That's simpler, but it fails the "add in the app" requirement and makes admins copy uids.

Consequence: client sign-up must stay enabled in the Firebase Auth settings. That's acceptable because an Auth account alone grants nothing (D2).

### D5: Password reset uses the primary Auth

`sendPasswordResetEmail(primaryAuth, email)` works for any email and doesn't change the admin's session. The station account must have a real mailbox an admin can read. That's an operational requirement, not code.

### D6: UI

- `authGuard` waits for a known access state: `loggedOut` goes to `/login`; `NONE` goes to a new `/kein-zugang` page (message + logout); otherwise it allows access.
- New `adminGuard` on `bericht` and the new `benutzer` route. A `STATION` user is redirected to `fahrten`.
- Navigation shows "Jahresbericht" and "Benutzer" only for admins.
- `benutzer` page: table (name, email, role, active) with add, edit, password reset and remove actions. It reuses the shared dialog layout, `confirm-dialog` for remove, and "Gespeichert" feedback from the usability change. On the admin's own row, role and active are disabled and remove is hidden (`selfEditRestrictions`).
- The `data/` layer stays the only importer of `firebase/*` (`npm run check:layers`).

### D7: Tests and seeds

- Rules tests (`tests/rules`): no auth, auth without doc, inactive, STATION, ADMIN against each collection. Admin self-demote, self-deactivate and self-delete are rejected. STATION writing its own doc is rejected. The key whitelist on users is checked.
- Integration (`*.integration.spec.ts`): `UserRepository.create` against the emulator leaves the primary session unchanged, and the user doc is written.
- e2e: the seed helper creates one STATION and one ADMIN account (fictional) with user docs. Existing tests log in as STATION, except `report.spec.ts` (ADMIN). A new spec covers user maintenance and the no-access page.

## Risks / Trade-offs

- [Shared password leaks or outlives a crew member] → admins rotate it with the password reset (D5). Deactivating the station entry is an emergency stop for all station devices.
- [Auth account created but user doc write fails, leaving an orphan account; re-adding gives `email-already-in-use`] → write the doc right after creation and show a message with the email on failure. Cleanup happens in the console. Rare, and an orphan has no access.
- [Open sign-up lets anyone create Auth accounts] → they get no data. The Auth user list could fill with junk, which is acceptable at this scale and visible in the console.
- [Two admins demote each other or the last admin is removed by another admin] → recovery through the console by editing `users/{uid}`. Documented in the migration notes.
- [Report is still computable by STATION] → accepted per spec.
- [Every rule check costs an extra read] → negligible at station volume. Revisit only if it ever moves to claims.

## Migration Plan

Order matters: the new rules lock out every account without a user doc.

1. Firebase console → Auth: create (or choose) the shared station account with a real mailbox address. Note the uids of the personal accounts that should become admins.
2. Firebase console → Firestore: create `users/{uid}` docs for at least one ADMIN and the STATION account (`email`, `name`, `role`, `active: true`).
3. Deploy hosting (the new app understands roles; with the old rules everything still works).
4. Deploy `firestore.rules`. All other accounts lose access from now on.
5. Optional: delete the unused personal Auth accounts in the console.

Rollback: redeploy the previous rules. The `users` docs are ignored by the old rules and can stay.

## Open Questions

- Which mailbox address the station account uses and what its display name is ("RK Strobl"). This doesn't affect code.
