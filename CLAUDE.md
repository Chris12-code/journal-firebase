# RK Strobl Journalblatt

Digital journal sheet for **Red Cross Strobl** (Rotes Kreuz Strobl) to track vehicle tours, crew assignments, and rescue operations during shifts.

## Tech Stack

- **Angular 21** with Angular Material 21, TypeScript 5.9
- **Firebase**: Firestore (database), Authentication (email/password), Hosting
- **@angular/fire 20** — Firebase providers are in `providers` array (not `imports`), and Firestore/Auth instances use native Firebase SDK (`getFirestore(getApp())`, `getAuth(getApp())`) instead of `@angular/fire` DI injection
- **RxJS 7.8** for reactive state (BehaviorSubjects, no NgRx)
- Firebase project ID: `rk-strobl-journalblatt`

## Project Structure

```
src/app/
  app.module.ts                    # Root NgModule (not standalone)
  app.component.ts                 # Root component, manages car tours via Firestore
  auth/
    login-modal.component.ts       # Login dialog (standalone component)
  lib/
    auth.service.ts                # Firebase auth service (BehaviorSubject<User>)
    person-utils.service.ts        # Loads static personnel data from persons.json
  model/
    car-tour.ts                    # CarTour class
    rescue-operation.ts            # RescueOperation class
    person.ts                      # Person class
  tour-modal/
    tour-modal.component.ts        # Tour tables container, filters by shift/type
    car-tour/
      car-tour.component.ts        # Single vehicle tour table
      add-car-tour-modal/
        add-car-tour-modal.component.ts  # Create/edit tour dialog
  rescue-operation-modal/
    rescue-operation-modal.component.ts      # Rescue operations table + Firestore CRUD
    rescue-operation-dialog/
      rescue-operation-dialog.component.ts   # Create/edit rescue operation dialog
src/data/
  persons.json                     # Static personnel records (~11 members)
src/environments/
  environment.ts                   # Dev Firebase config
  environment.prod.ts              # Prod Firebase config
```

## Key Domain Concepts

- **Car Tours**: Vehicle assignments with crew for a shift. Each has a type (RTW/KTW/BTW), shift (DAY/NIGHT), vehicle number (e.g. 44.201), and crew (driver, tpf, third)
- **Rescue Operations**: Emergency responses linked to a car tour. Categorized by type (NA/RD/KT), category (CPR/VU/Kinder), and patient type
- **Person**: Crew member with employee number, name, phone, email

## Firestore Collections

- `car-tour` — filtered client-side to last 30 hours
- `rescue-operation` — queried with `where('timeStamp', '>=', hoursAgo)`

## Navigation

No Angular Router — `AppComponent` toggles between two views with `@if`:
- **Operations view** (default): rescue operations table
- **Team view**: car tour tables organized by vehicle/shift/type

## Commands

- `npm start` / `ng serve` — dev server on localhost:4200
- `npm run build` / `ng build` — production build to dist/journal-firebase
- `firebase deploy` — deploy to Firebase Hosting

## Known TODOs

- `add-car-tour-modal.component.html`: Needs proper date-time picker for tour start/end times
