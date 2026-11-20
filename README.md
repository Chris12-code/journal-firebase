# RK Strobl Journalblatt

Digitales Journalblatt der Rotkreuz-Dienststelle Strobl: Dienstmannschaft (Touren), Fahrten und Jahresbericht
(Stunden und Fahrten pro Person).

## Entwicklung

```bash
npm install
npm start                 # Dev-Server auf http://localhost:4200 (verbindet zum echten Firebase-Projekt!)
```

Zum Entwickeln ohne echte Daten die Emulatoren verwenden:

```bash
firebase emulators:start --only auth,firestore     # Terminal 1 (Emulator-UI: http://localhost:4000)
npx ng serve --configuration=e2e                   # Terminal 2: App gegen die Emulatoren
```

Testbenutzer und Testdaten legt `npm run e2e` automatisch an (siehe `e2e/helpers/emulator.ts`).

## Tests

| Befehl | Was | Voraussetzung |
|---|---|---|
| `npm run test:ci` | Unit-Tests (Domain, Mapper, Services, Helfer) | Chrome |
| `npm run test:integration` | Firestore-Repositories gegen die Emulatoren | Java, Chrome |
| `npm run test:rules` | Firestore-Sicherheitsregeln | Java |
| `npm run e2e` | Playwright-Tests im Browser gegen die Emulatoren | Java |
| `npm run check:layers` | Prüft die Schichtenregeln (Firebase nur in `data/`) | – |

`test:integration`, `test:rules` und `e2e` starten die Emulatoren selbst.

## Deployment

```bash
npm run build
firebase deploy --only firestore   # Regeln und Indizes
firebase deploy --only hosting     # App
```

Bei Problemen: `firebase logout` und `firebase login`.

## Stammdaten pflegen (Firebase-Konsole)

Personen und Fahrzeuge werden in der Firebase-Konsole gepflegt; die App liest sie nur
(Firestore → Daten: https://console.firebase.google.com/project/rk-strobl-journalblatt/firestore).

**Personen** – Sammlung `persons`, **Dokument-ID = Dienstnummer** (z. B. `07414`):

| Feld | Typ | Pflicht | Beispiel |
|---|---|---|---|
| `name` | string | ja | `Nachname Vorname` |
| `phone` | string | nein | `0043 660 …` |
| `email` | string | nein | `name@example.at` |
| `active` | boolean | ja | `true` |

**Fahrzeuge** – Sammlung `vehicles`, **Dokument-ID = Fahrzeugnummer** (z. B. `44.201`):

| Feld | Typ | Pflicht | Beispiel |
|---|---|---|---|
| `type` | string | ja | `RTW`, `KTW` oder `BTW` |
| `active` | boolean | ja | `true` |

Regeln:

- **Nie löschen, sondern `active` auf `false` setzen.** Ausgeschiedene Personen und alte Fahrzeuge müssen in
  bestehenden Touren, Fahrten und Jahresberichten weiter auflösbar sein. Inaktive Einträge werden nur nicht mehr
  zur Auswahl angeboten.
- Die Dokument-ID nicht ändern – Touren und Fahrten verweisen darauf.
- Ein Dokument ohne `active`-Feld gilt als aktiv.

## Benutzer

Jede Person meldet sich mit einem persönlichen Konto an (E-Mail/Passwort). Konten werden hier verwaltet:
https://console.firebase.google.com/project/rk-strobl-journalblatt/authentication/users

## Nutzung und Kosten

https://console.firebase.google.com/project/rk-strobl-journalblatt/usage
