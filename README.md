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
npx ng serve --configuration=e2e --port 4300       # Terminal 2: App gegen die Emulatoren (http://localhost:4300)
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

## Dienstplan, Zusatzfahrzeug und Ambulanz

**Geplante Dienste** (Seite *Dienstmannschaft*) ergeben sich aus dem Kalender:

| Tag | Tagdienst | Nachtdienst (ab 19:00) |
|---|---|---|
| Werktag (Mo–Fr, kein Feiertag) | RTW 44.201 07:30–19:00, KTW 44.301 06:00–17:00, BTW 20.410 06:30–18:00 | RTW 44.201 |
| Samstag, Sonntag, gesetzlicher Feiertag | RTW 44.201 07:00–19:00 | RTW 44.201 |

- Der Nachtdienst endet um 06:00, wenn der Folgetag ein Werktag ist, sonst um 07:00.
- An Werktagen deckt der KTW den RTW von 06:00 bis 07:30 ab.
- Feiertage sind die 13 bundesweiten Feiertage (keine weiteren Tage).
- **Besetzen** übernimmt Fahrzeug, Schicht und geplanten Beginn. **Tour beenden** schlägt das geplante Ende vor.
  Für die Stunden zählen immer die tatsächlich eingetragenen Zeiten.

**Zusatzfahrzeug**: Wenn der RTW unterwegs ist und weitere Personen ein freies Fahrzeug nehmen. Die Stunden zählen
vom Beginn der ersten bis zum Ende der letzten Fahrt dieses Zusatzfahrzeugs – daher bei diesen Fahrten immer die
Rückkehrzeit eintragen.

**Ambulanz** (Seite *Fahrten* → *Ambulanz erfassen*): Veranstaltung, Beginn und Ende, beliebig viele Fahrzeuge
(auch externe Nummern wie 45.201), Besatzung mit Positionen, Anzahl der Hilfeleistungen. Jede Person der Ambulanz
bekommt die Zeit von Beginn bis Ende angerechnet, die Ambulanz zählt als eine Fahrt.

**Weitere Kräfte vor Ort** (Notarzt, Notarzthubschrauber, Polizei, Feuerwehr, …) können bei jeder Fahrt und
Ambulanz eingetragen werden – Vorschläge oder freier Text.

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

**Fahrzeuge** – Sammlung `vehicles`, **Dokument-ID = Fahrzeugnummer** (z. B. `44.201`).
Die App kennt bereits ohne Einträge die Standardfahrzeuge **44.201 (RTW)**, **44.301 (KTW)** und **20.410 (BTW)**.
Einträge hier sind nur nötig für weitere Fahrzeuge oder um ein Standardfahrzeug zu überschreiben
(z. B. `active: false`). In Touren und Fahrten kann außerdem jede andere Nummer eingetippt werden
(z. B. ein Ersatzfahrzeug); sie wird dann ohne Typ gespeichert.

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
