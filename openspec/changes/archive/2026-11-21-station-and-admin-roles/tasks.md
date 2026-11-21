# Tasks

## 1. Domain

- [x] 1.1 Add `domain/user.ts` with `Role` (`STATION` | `ADMIN`), `UserEntry {uid, email, name, role, active}`, `Access` (`NONE` | Role) and a pure `selfEditRestrictions(actorUid, entry)` that locks role and active and forbids removal on the actor's own entry (design D3). Verify with `domain/user.spec.ts` (own entry vs. other entry, both roles) via `npm run test:ci`, and confirm `npm run check:layers` passes.

## 2. Firestore rules

- [x] 2.1 Add `member()`/`admin()` helpers to `firestore.rules` and replace `signedIn()` with `member()` for `persons`, `vehicles`, `tours`, `rides`, `car-tour` and `rescue-operation`. Update the header comment (design D2). Verify with rules tests in `tests/rules/firestore.rules.test.mts`: no auth, auth without user doc, inactive user, STATION and ADMIN each against reads and writes of these collections (`npm run test:rules`).
- [x] 2.2 Add the `users/{uid}` rules: read for admin or own doc; create/update for admins with the key whitelist, role values, boolean `active` and unchanged `email`; self role/active change rejected; delete for admins except their own doc. Verify with rules tests for: STATION reads own doc, STATION writes own doc (rejected), admin creates/edits another user, admin self-demote/self-deactivate/self-delete (rejected), extra keys and invalid role (rejected), email change (rejected), all via `npm run test:rules`.
- [x] 2.3 Update `CLAUDE.md` (Firestore collections: `users`; tech stack: STATION/ADMIN roles instead of personal logins only) and verify the described rules match `firestore.rules`.

## 3. Data layer

- [x] 3.1 Add `docToUserEntry` / `userEntryToDoc` to `data/mappers.ts` (shape from design D1). Verify with cases in `data/mappers.spec.ts` (`npm run test:ci`).
- [x] 3.2 Extend the `AuthGateway` port with `access$(uid)` (live listener on the own user doc, emits `null` when missing or on permission error) and `sendPasswordReset(email)`. Add a `UserRepository` port (`list$`, `create`, `update`, `remove`) to `application/ports.ts` and matching fakes in `application/testing/fakes.ts`. Verify it compiles (`npm run build`) and `npm run check:layers` passes.
- [x] 3.3 Implement `access$` and `sendPasswordReset` in `FirebaseAuthGateway` (primary Auth, design D5). Verify with integration tests: `access$` emits the entry, then `null` after the doc is deleted, and emits `null` for an account without a doc (`npm run test:integration`).
- [x] 3.4 Implement `FirestoreUserRepository`, with `create` going through a lazily created secondary app `user-admin` (in-memory persistence, emulator connection when `useEmulators`, sign-out afterwards; design D4). Bind it in `provide-data-layer.ts`. Verify with integration tests: after `create` the primary Auth user is still the admin, the user doc exists, the new account can sign in; `email-already-in-use` creates no doc; `update` and `remove` change and delete the doc (`npm run test:integration`).

## 4. Application

- [x] 4.1 Extend `SessionService` with `access$`/`access` (`undefined` while unknown, `NONE`, `STATION`, `ADMIN`) combined from `user$` and `AuthGateway.access$`, plus `isAdmin` (design D3). Verify with `session.service.spec.ts` cases: logged out, no doc, inactive, STATION, ADMIN, demotion in an open session (`npm run test:ci`).
- [x] 4.2 Make `JournalService` and `MasterDataService` start their listeners only when access is `STATION` or `ADMIN`, instead of on any logged-in user. Verify with their specs: no repository calls for `NONE`, listeners started for STATION (`npm run test:ci`).
- [x] 4.3 Add `UserAdminService` (list, add, change, remove, password reset) with German messages for `email-already-in-use`, `weak-password` and `invalid-email`. It refuses self-restricted changes using `selfEditRestrictions`. Verify with `user-admin.service.spec.ts` against the fakes (`npm run test:ci`).

## 5. UI

- [x] 5.1 Make `authGuard` wait for a known access state and route `NONE` to a new `/kein-zugang` page (message "Kein Zugang" + logout). Add `adminGuard` on `bericht`, redirecting STATION users to `fahrten`. Verify with guard unit tests for each access state (`npm run test:ci`).
- [x] 5.2 Show the "Jahresbericht" and new "Benutzer" navigation entries in `app.component.ts` only when `isAdmin`. Verify with a component test for STATION vs. ADMIN (`npm run test:ci`).
- [x] 5.3 Add the `benutzer` route (admin only) with a user list page (name, email, role, active) and a user dialog for add (email, initial password, name, role) and edit (name, role, active; email read-only), using the shared dialog layout. Add actions for password reset (with confirmation message) and remove (via `confirm-dialog`), plus "Gespeichert" feedback. On the own row, role and active are disabled and remove is hidden. Verify with component tests for the dialog (add vs. edit, own entry locked) (`npm run test:ci`).

## 6. End-to-end

- [x] 6.1 Change `e2e/global-setup.ts` to create a fictional STATION account and a fictional ADMIN account plus their `users` docs, and make `loginAs` default to the station account. Switch `report.spec.ts` to the admin account. Verify the existing e2e suite passes (`npm run e2e`).
- [x] 6.2 Add `e2e/tests/users.spec.ts`: the station login sees no report or user navigation, and `/bericht` redirects; an admin adds a user who can then log in; an admin deactivates that user, who then sees "Kein Zugang"; an admin removes a user; the admin's own row is locked. Also cover an account without a users doc landing on "Kein Zugang". Verify with `npm run e2e`.

## 7. Integration check

- [x] 7.1 Run `npm run check:layers`, `npm run build`, `npm run test:ci`, `npm run test:integration`, `npm run test:rules` and `npm run e2e`, and verify all pass.

## Workflow follow-up

- Production migration in the Firebase console, in this order (design: Migration Plan): create the station account with a real mailbox; create `users/{uid}` docs for at least one ADMIN and the STATION account; deploy hosting; then `firebase deploy --only firestore`; optionally delete unused personal Auth accounts.
- Archive the change after review, then update the Purpose of `openspec/specs/journal-access/spec.md` by hand (it still says "based on personal logins").
