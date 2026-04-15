# TrailHub – Supabase Eingabe-Referenz
**Letzte Aktualisierung:** 2026-03-30
**Projekt:** hmdkiteqapiahwvdbdyh (TrailHub / trailhub.netlify.app)

---

## INHALTSVERZEICHNIS
1. [Tabelle: organizers](#1-tabelle-organizers)
2. [Tabelle: events](#2-tabelle-events)
3. [Verknüpfungen](#3-verknüpfungen)
4. [Praxis-Beispiele](#4-praxis-beispiele)
5. [Häufige Fehler](#5-häufige-fehler)
6. [Checkliste: Neues Event anlegen](#6-checkliste)

---

## 1. TABELLE: organizers

### Feldübersicht

| Feldname | Typ | Pflicht | Standard | Beschreibung |
|---|---|---|---|---|
| `id` | text | JA | — | Einzigartiger Bezeichner (Slug) |
| `name` | text | JA | — | Vollständiger Organisationsname |
| `logo` | text | nein | NULL | URL zum Logo-Bild |
| `verified` | boolean | nein | false | Vom System verifiziert? |
| `since` | integer | nein | NULL | Gründungsjahr |
| `events_hosted` | integer | nein | 0 | Anzahl durchgeführter Events |
| `rating` | numeric | nein | 0 | Bewertung (0.0 – 5.0) |
| `specialties` | text[] | nein | {} | Spezialgebiete (Array) |
| `website` | text | nein | NULL | Webseite-URL |
| `description` | text | nein | NULL | Beschreibungstext |
| `created_at` | timestamptz | nein | now() | Automatisch gesetzt |

---

### id – Format-Regeln
```
REGEL: Nur Kleinbuchstaben, Ziffern und Bindestriche. Keine Leerzeichen. Keine Umlaute.

ERLAUBT:   rally-masters
           moto-academy
           offroad-community-ev
           adventure-tours-2026

VERBOTEN:  Rally Masters       (Leerzeichen)
           RallyMasters        (Großbuchstaben)
           rally_masters       (Unterstrich)
           rally.masters       (Punkt)
           rally masters ev    (Leerzeichen + gemischt)
```

---

### specialties – Array-Format
```sql
-- Supabase SQL (Table Editor → SQL Editor):
'{Enduro, Trail, Hard-Enduro}'

-- Wenn leer:
'{}'

-- Typische Werte (frei wählbar):
'{Enduro}'
'{Trail, Enduro}'
'{Rallye, Navigation}'
'{Fahrsicherheit, Gelände}'
'{MX, Supercross}'
'{Adventure, Reisen}'
'{Trail, Enduro, Hard-Enduro}'
```

---

### verified – Boolean-Werte
```
Im Supabase Table Editor:    Checkbox ankreuzen = true
                             Checkbox leer      = false

Im SQL:                      true   oder   false   (ohne Anführungszeichen)
```

---

### rating – Zahlenbereich
```
Bereich:         0.0 bis 5.0
Dezimalstellen:  1 Stelle empfohlen (z.B. 4.7)
Eingabe:         4.7   (kein Währungszeichen, kein Komma)

Bedeutung:
  5.0 = Herausragend
  4.5 = Sehr gut
  4.0 = Gut
  3.5 = Befriedigend
  3.0 = Ausreichend
```

---

### organizers – Vollständiges Template
```sql
INSERT INTO organizers (
  id,
  name,
  logo,
  verified,
  since,
  events_hosted,
  rating,
  specialties,
  website,
  description
) VALUES (
  'mein-veranstalter',                              -- id: slug, keine Leerzeichen
  'Mein Veranstalter GmbH',                         -- name: vollständiger Name
  'https://example.com/logo.png',                   -- logo: URL oder NULL
  false,                                            -- verified: true / false
  2015,                                             -- since: Jahr oder NULL
  0,                                                -- events_hosted: Anzahl
  4.5,                                              -- rating: 0.0-5.0
  '{Enduro, Trail}',                                -- specialties: Array
  'https://www.mein-veranstalter.de',               -- website: URL oder NULL
  'Beschreibungstext des Veranstalters.'            -- description: Text oder NULL
);
```

---

### Aktuell vorhandene Veranstalter-IDs

| id | Name | Verified | Rating |
|---|---|---|---|
| `adventure-tours` | Adventure Tours International | true | 4.9 |
| `bosnia-rally` | Bosnia Rally | true | 5.0 |
| `enduro-events` | Enduro Events Europe | true | 4.6 |
| `moto-academy` | MotoSkills Academy | true | 4.7 |
| `offroad-community` | Offroad Community e.V. | true | 4.5 |
| `rally-masters` | Rally Masters GmbH | true | 4.8 |
| `rando-tt` | Rando TT | true | 4.5 |
| `tracks-adventures` | Tracks Adventures | true | 4.0 |

> **Wichtig:** `organizer_id` im Event muss EXAKT einem dieser Werte entsprechen.
> Alle IDs sind **ausschließlich Kleinbuchstaben und Bindestriche** — niemals Großbuchstaben oder Leerzeichen.

---

---

## 2. TABELLE: events

### Feldübersicht

| Feldname | Typ | Pflicht | Standard | Beschreibung |
|---|---|---|---|---|
| `id` | integer | NEIN | auto-increment | Wird automatisch vergeben |
| `name` | text | JA | — | Event-Name |
| `category` | text | JA | — | Hauptkategorie → Werte siehe unten |
| `subcategory` | text | nein | NULL | Unterkategorie → Werte siehe unten |
| `mx_type` | text | nein | NULL | MX-Untertyp → Werte siehe unten |
| `start_date` | date | JA | — | Startdatum (YYYY-MM-DD) |
| `end_date` | date | nein | NULL | Enddatum (YYYY-MM-DD) |
| `location` | text | JA | — | Ort, Land (z.B. "Köln, Deutschland") |
| `coordinates` | jsonb | nein | NULL | GPS-Koordinaten → Format siehe unten |
| `price` | text | nein | NULL | Preis als Text (z.B. "€150") |
| `price_value` | numeric | nein | NULL | Preis als Zahl (z.B. 150) |
| `image` | text | nein | NULL | URL zum Event-Bild |
| `status` | text | nein | 'upcoming' | Status → Werte siehe unten |
| `difficulty` | integer | nein | NULL | Schwierigkeit 1–3 → Bedeutung siehe unten |
| `beginner_friendly` | boolean | nein | false | Für Anfänger geeignet? |
| `organizer_id` | text | nein | NULL | Fremdschlüssel → organizers.id |
| `registered_friends` | jsonb | nein | [] | Immer leer lassen: [] |
| `rallye_region` | text | nein | NULL | Nur für Rallyes → Werte siehe unten |
| `trip_type` | text | nein | NULL | Nur für Adventure Trips → Werte siehe unten |
| `skill_level` | text | nein | NULL | Nur für Skills Camps → Werte siehe unten |
| `bike_type` | text | nein | NULL | Fahrzeugtyp → Werte siehe unten |
| `group_size` | integer | nein | NULL | Maximale Teilnehmerzahl |
| `level` | text | nein | NULL | Nur für Rallyes → Werte siehe unten |
| `is_new` | boolean | nein | false | Als "NEU" markieren? |
| `has_changes` | boolean | nein | false | Hat Änderungen? |
| `change_details` | jsonb | nein | NULL | Änderungsdetails → Format siehe unten |
| `event_url` | text | nein | NULL | URL zur Event-Webseite |
| `registration_url` | text | nein | NULL | URL zur Anmeldung |
| `organizer_description` | text | nein | NULL | Veranstalter-Infotext für dieses Event |
| `ai_summary` | text | nein | NULL | KI-generierte Zusammenfassung |
| `ai_summary_updated_at` | timestamptz | nein | NULL | Zeitstempel der KI-Zusammenfassung |
| `created_at` | timestamptz | nein | now() | Automatisch gesetzt |
| `updated_at` | timestamptz | nein | now() | Automatisch gesetzt |

---

### category – Alle gültigen Werte

| Wert | Anzeige-Name | Wann benutzen |
|---|---|---|
| `trail-adventures` | Trail Adventures | Geführte Trails, Enduro, MX, Hard-Enduro |
| `rallyes` | Rallyes | Navigations-Rallyes, Etappenrennen |
| `adventure-trips` | Adventure Trips | Mehrtägige Motorradreisen |
| `skills-camps` | Skills Camps | Fahrkurse, Trainings, Akademien |
| `offroad-festivals` | Offroad Festivals | Community-Events, Messen, Festivals |

---

### subcategory – Alle gültigen Werte

| Wert | Für category | Beschreibung |
|---|---|---|
| `trail` | trail-adventures | Geführte Trail-Touren |
| `enduro` | trail-adventures | Enduro-Events |
| `hard-enduro` | trail-adventures | Hard-Enduro / Extreme Enduro |
| `mx` | trail-adventures | Motocross (Tracks + Rennen) |
| NULL | alle außer trail-adventures | Keine Unterkategorie |

> **Regel:** `subcategory` wird NUR bei `category = 'trail-adventures'` gesetzt.
> Bei allen anderen Kategorien: NULL lassen.

---

### mx_type – Alle gültigen Werte

| Wert | Beschreibung | Wann benutzen |
|---|---|---|
| `mx-track` | Permanenter MX-Track (kein Datum nötig) | Für Strecken die dauerhaft offen sind |
| `race` | MX-Rennen (mit Datum) | Für zeitlich begrenzte Rennen |
| NULL | Kein MX | Für alle Nicht-MX-Events |

> **Regel:** `mx_type` NUR setzen wenn `subcategory = 'mx'`. Sonst NULL.

---

### status – Alle gültigen Werte

| Wert | Bedeutung | Wann benutzen |
|---|---|---|
| `upcoming` | Zukünftiges Event | Standard für neue Events |
| `past` | Vergangenes Event | Event hat stattgefunden |
| `permanent` | Dauerhaft offen | Für MX-Tracks ohne festes Datum |

> **Automatisch gesetzt:** Ein Datenbank-Trigger berechnet `status` automatisch aus `start_date` / `end_date`:
> - `end_date < heute` → `'past'`
> - `start_date ≤ heute` und `end_date ≥ heute` → `'ongoing'`
> - sonst → `'upcoming'`
> - `'permanent'` wird vom Trigger **nicht** überschrieben — manuell setzen.
>
> **Pflicht-`start_date` bei `status = 'permanent'`:** Die DB erzwingt ein Datum. Trage `2099-01-01` als Platzhalter ein — dieser Wert signalisiert "kein konkretes Datum" und liegt weit genug in der Zukunft, um nicht als `past` gewertet zu werden.

---

### difficulty – Bedeutung

| Wert | Bezeichnung | Beschreibung |
|---|---|---|
| `1` | Leicht | Für Einsteiger geeignet |
| `2` | Mittel | Erfahrene Fahrer empfohlen |
| `3` | Schwer | Nur für fortgeschrittene / Profis |
| NULL | Keine Angabe | Bei Festivals, Rallyes ohne Schwierigkeitsgrad |

---

### rallye_region – Alle gültigen Werte

| Wert | Beschreibung |
|---|---|
| `inland` | Deutschland / Benelux / Nahes Ausland |
| `europe` | Europa (weiter entfernt, z.B. Balkan, Iberische Halbinsel) |
| `africa` | Afrika (Marokko, Sahara etc.) |
| `asia` | Asien / Naher Osten |
| NULL | Nicht für Rallyes oder nicht zutreffend |

> **Regel:** `rallye_region` NUR setzen wenn `category = 'rallyes'`. Sonst NULL.

---

### skill_level – Alle gültigen Werte

| Wert | Beschreibung |
|---|---|
| `beginner` | Einsteiger (wenig Erfahrung) |
| `hobbyist` | Hobbyfahrer (Grundkenntnisse vorhanden) |
| `intermediate` | Fortgeschrittene (regelmäßige Fahrer) |
| `pro` | Profis / Rennfahrer |
| NULL | Nicht zutreffend |

> **Regel:** `skill_level` NUR setzen wenn `category = 'skills-camps'`. Sonst NULL.

---

### level – Alle gültigen Werte (Rallye-Teilnehmer-Level)

| Wert | Beschreibung |
|---|---|
| `amateur` | Amateur-Klasse |
| `beginner` | Einsteiger-Klasse |
| `pro` | Profi-Klasse |
| `dakar` | Dakar-Niveau (Topklasse) |
| NULL | Nicht zutreffend |

> **Regel:** `level` NUR setzen wenn `category = 'rallyes'`. Sonst NULL.

---

### trip_type – Alle gültigen Werte

| Wert | Beschreibung |
|---|---|
| `onroad` | Überwiegend auf Straße |
| `offroad` | Überwiegend abseits der Straße |
| NULL | Nicht zutreffend |

> **Regel:** `trip_type` NUR setzen wenn `category = 'adventure-trips'`. Sonst NULL.

---

### bike_type – Alle gültigen Werte

| Wert | Beschreibung |
|---|---|
| `trail` | Trail-Motorrad |
| `enduro` | Enduro-Motorrad |
| `mx` | Motocross-Bike |
| `adventure` | Adventure-Tourer (z.B. BMW GS) |
| `hardenduro` | Hard-Enduro-spezifisch |
| NULL | Fahrzeugtyp egal / nicht angegeben |

---

### Datum-Format
```
Format:  YYYY-MM-DD

Korrekt:
  2026-05-10       (10. Mai 2026)
  2026-09-01       (1. September 2026)
  2026-12-31       (31. Dezember 2026)

Falsch:
  10.05.2026       (deutsches Format)
  05/10/2026       (amerikanisches Format)
  10-05-2026       (Tag-Monat-Jahr)
  2026/05/10       (Slash statt Bindestrich)
```

---

### Price-Format

```
price (text):       Mit Währungssymbol, ohne Leerzeichen
  Korrekt:   €150    €299    €75    Kostenlos
  Falsch:    150€    € 150   EUR150

price_value (numeric):   Nur die Zahl, kein Symbol
  Korrekt:   150    299    75    0
  Falsch:    €150   150,00   "150"
```

> **Wichtig:** Beide Felder immer zusammen befüllen. `price` für Anzeige, `price_value` für Filter.

---

### JSON-Felder – Exakte Formate

#### coordinates
```json
{"lat": 50.3356, "lng": 6.9475}
```
- `lat` = Breitengrad (Dezimalgrad, positiv = Nord, negativ = Süd)
- `lng` = Längengrad (Dezimalgrad, positiv = Ost, negativ = West)
- Koordinaten findet man auf: maps.google.com (Rechtsklick → "Was ist hier?")

```
Beispiele:
  Köln:        {"lat": 50.9333, "lng": 6.9500}
  Berlin:      {"lat": 52.5200, "lng": 13.4050}
  München:     {"lat": 48.1351, "lng": 11.5820}
  Brüssel:     {"lat": 50.8503, "lng": 4.3517}
  Nürburgring: {"lat": 50.3356, "lng": 6.9475}
```

#### registered_friends
```json
[]
```
**Immer ein leeres Array. Nie manuell befüllen.**
Dieses Feld wird automatisch durch die App verwaltet.

#### change_details
```json
{"field": "Startgeld", "old": "€220", "new": "€245", "date": "12.02.2025"}
```
- `field` = Was hat sich geändert (z.B. "Datum", "Startgeld", "Ort")
- `old` = Alter Wert
- `new` = Neuer Wert
- `date` = Datum der Änderung im Format DD.MM.YYYY

```json
{"field": "Datum", "old": "07-08.03", "new": "14-15.03", "date": "10.02.2026"}
{"field": "Ort", "old": "Köln", "new": "Aachen", "date": "01.03.2026"}
```
Wenn keine Änderung: `NULL` (nicht `{}`)

---

### location – Format-Empfehlung
```
Format:   Stadt, Land

Korrekt:
  Köln, Deutschland
  Spa, Belgien
  Trier, Deutschland
  Nürburgring, Deutschland
  Lyon, Frankreich
  Amsterdam, Niederlande
  Marrakesch, Marokko

Falsch:
  Köln                  (kein Land)
  Germany, Cologne      (englisch, falsche Reihenfolge)
  Köln (NRW)            (Klammern)
```

---

---

## 3. VERKNÜPFUNGEN

### Event ↔ Veranstalter

```
events.organizer_id  muss EXAKT gleich sein wie  organizers.id

Beispiel:
  organizers.id = 'rally-masters'
  events.organizer_id = 'rally-masters'    ← identisch, klein geschrieben
```

**Warnung:** Wenn `organizer_id` auf einen nicht existierenden Veranstalter zeigt,
wird der Veranstalter-Block im Event-Detail einfach leer angezeigt (kein Fehler, aber kein Inhalt).

### Reihenfolge beim Anlegen
```
1. Zuerst den Veranstalter in der organizers-Tabelle anlegen
2. Dann das Event mit der entsprechenden organizer_id erstellen
```

---

---

## 4. PRAXIS-BEISPIELE

### Beispiel 1: Einfaches Trail-Event (Wochenend-Enduro)

```sql
INSERT INTO events (
  name, category, subcategory, start_date, end_date,
  location, coordinates, price, price_value, image, status,
  difficulty, beginner_friendly, organizer_id,
  registered_friends, is_new, has_changes,
  event_url, registration_url
) VALUES (
  'Eifel Enduro Weekend 2026',
  'trail-adventures',
  'enduro',
  '2026-07-11',
  '2026-07-12',
  'Nürburgring, Deutschland',
  '{"lat": 50.3356, "lng": 6.9475}',
  '€185',
  185,
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
  'upcoming',
  2,
  false,
  'enduro-events',
  '[]',
  true,
  false,
  'https://www.eifel-enduro.de',
  'https://www.eifel-enduro.de/anmeldung'
);
```

---

### Beispiel 2: Mehrtägige Rallye

```sql
INSERT INTO events (
  name, category, start_date, end_date,
  location, coordinates, price, price_value, image, status,
  difficulty, beginner_friendly, organizer_id,
  registered_friends, rallye_region, level,
  is_new, has_changes,
  event_url, registration_url, organizer_description
) VALUES (
  'Ardennen Rallye 2026',
  'rallyes',
  '2026-08-21',
  '2026-08-25',
  'Spa, Belgien',
  '{"lat": 50.4370, "lng": 5.9714}',
  '€450',
  450,
  'https://images.unsplash.com/photo-1533577116850-9cc66cad8a9b?w=400&h=300&fit=crop',
  'upcoming',
  2,
  false,
  'rally-masters',
  '[]',
  'europe',
  'amateur',
  false,
  false,
  'https://www.ardennen-rallye.be',
  'https://www.ardennen-rallye.be/register',
  '5 Etappen durch die belgischen Ardennen. Navigation per Roadbook. Max. 80 Starter.'
);
```

---

### Beispiel 3: Skills Camp

```sql
INSERT INTO events (
  name, category, start_date, end_date,
  location, coordinates, price, price_value, image, status,
  difficulty, beginner_friendly, organizer_id,
  registered_friends, skill_level, bike_type,
  group_size, is_new, has_changes,
  event_url, registration_url, organizer_description
) VALUES (
  'Enduro Fahrtechnik Kurs – Stufe 1',
  'skills-camps',
  '2026-06-06',
  '2026-06-07',
  'Bitburg, Deutschland',
  '{"lat": 49.9667, "lng": 6.5167}',
  '€299',
  299,
  'https://images.unsplash.com/photo-1594068568127-5b7b6b0b0b6a?w=400&h=300&fit=crop',
  'upcoming',
  1,
  true,
  'moto-academy',
  '[]',
  'beginner',
  'enduro',
  12,
  false,
  false,
  'https://www.motoskills.de/kurse',
  'https://www.motoskills.de/kurse/anmelden',
  'Max. 12 Teilnehmer. Eigenes Motorrad erforderlich. Schutzausrüstung inklusive.'
);
```

---

### Beispiel 4: Permanenter MX-Track

```sql
INSERT INTO events (
  name, category, subcategory, mx_type,
  start_date,
  location, coordinates, price, price_value, image, status,
  difficulty, beginner_friendly, organizer_id,
  registered_friends, is_new, has_changes,
  event_url
) VALUES (
  'MX-Park Beispielstadt',
  'trail-adventures',
  'mx',
  'mx-track',
  '2099-01-01',  -- Platzhalter für permanent (Trigger überschreibt status nicht)
  'Beispielstadt, Deutschland',
  '{"lat": 51.0000, "lng": 7.0000}',
  '€40',
  40,
  'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=400&h=300&fit=crop',
  'permanent',
  2,
  false,
  'offroad-community',
  '[]',
  false,
  false,
  'https://www.mx-park-beispiel.de'
);
```

---

---

## 5. HÄUFIGE FEHLER

### Fehler 1: Falsches Datums-Format
```
FALSCH:  10.05.2026    05/10/2026    2026/05/10
RICHTIG: 2026-05-10
```

### Fehler 2: Falsche category-Schreibweise
```
FALSCH:  Trail Adventures    trailAdventures    trail_adventures    Rallye
RICHTIG: trail-adventures    rallyes    adventure-trips    skills-camps    offroad-festivals
```

### Fehler 3: subcategory bei falscher category gesetzt
```
FALSCH:  category='rallyes', subcategory='enduro'
RICHTIG: subcategory NUR bei category='trail-adventures' setzen, sonst NULL
```

### Fehler 4: mx_type ohne subcategory='mx'
```
FALSCH:  category='trail-adventures', subcategory='enduro', mx_type='race'
RICHTIG: mx_type NUR setzen wenn subcategory='mx'
```

### Fehler 5: coordinates als Text statt JSON
```
FALSCH:  "50.3356, 6.9475"    oder    "lat:50.3356"
RICHTIG: {"lat": 50.3356, "lng": 6.9475}
```

### Fehler 6: price_value mit Währungszeichen
```
FALSCH:  €150    "150"    150,00
RICHTIG: 150   (nur Zahl, kein Symbol, kein String)
```

### Fehler 7: organizer_id falsch geschrieben
```
FALSCH:  'Rally Masters'    'rally_masters'    'RallyMasters'
RICHTIG: 'rally-masters'    (exakt wie in organizers.id)
```

### Fehler 8: registered_friends manuell befüllt
```
FALSCH:  [{"id": 1, "name": "Max"}]
RICHTIG: []   (immer leer lassen – App verwaltet dieses Feld)
```

### Fehler 9: Boolean als Text
```
FALSCH:  'true'    'false'    'TRUE'    1    0
RICHTIG: true      false      (ohne Anführungszeichen im SQL)
```

### Fehler 10: rallye_region / skill_level bei falscher Kategorie
```
FALSCH:  category='trail-adventures', rallye_region='europe'
         category='rallyes', skill_level='beginner'
RICHTIG: rallye_region NUR bei category='rallyes'
         skill_level   NUR bei category='skills-camps'
         level         NUR bei category='rallyes'
         trip_type     NUR bei category='adventure-trips'
```

---

---

## 6. CHECKLISTE

### Neues Event anlegen

**VOR dem Anlegen:**
- [ ] Veranstalter existiert in der `organizers`-Tabelle?
- [ ] `organizer_id` notiert (exakt, klein geschrieben)?
- [ ] Datum im Format YYYY-MM-DD?
- [ ] Koordinaten (lat/lng) aus Google Maps kopiert?
- [ ] Bild-URL verfügbar?

**Pflichtfelder (MÜSSEN ausgefüllt sein):**
- [ ] `name` — Event-Name
- [ ] `category` — Exakt einer der 5 gültigen Werte
- [ ] `start_date` — Format YYYY-MM-DD

**Kategorie-spezifische Felder:**

*Wenn category = `trail-adventures`:*
- [ ] `subcategory` gesetzt? (`trail` / `enduro` / `hard-enduro` / `mx`)
- [ ] Wenn subcategory = `mx`: `mx_type` gesetzt? (`mx-track` / `race`)
- [ ] `difficulty` gesetzt? (1 / 2 / 3)

*Wenn category = `rallyes`:*
- [ ] `rallye_region` gesetzt? (`inland` / `europe` / `africa` / `asia`)
- [ ] `level` gesetzt? (`amateur` / `beginner` / `pro` / `dakar`)

*Wenn category = `skills-camps`:*
- [ ] `skill_level` gesetzt? (`beginner` / `hobbyist` / `intermediate` / `pro`)
- [ ] `bike_type` gesetzt?

*Wenn category = `adventure-trips`:*
- [ ] `trip_type` gesetzt? (`onroad` / `offroad`)

**Preis:**
- [ ] `price` als Text mit €-Zeichen (z.B. `€150`)
- [ ] `price_value` als Zahl ohne Symbol (z.B. `150`)

**Immer prüfen:**
- [ ] `registered_friends` = `[]` (niemals manuell befüllen)
- [ ] `status` = `upcoming` (für neue Events)
- [ ] `location` Format: "Stadt, Land"

**NACH dem Anlegen:**
- [ ] Event erscheint in der App unter der richtigen Kategorie?
- [ ] Marker auf der Karte sichtbar?
- [ ] Veranstalter-Info im Event-Detail angezeigt?
- [ ] Filter funktionieren korrekt (Subkategorie, Schwierigkeit)?

---

## QUICK-REFERENCE KARTE

```
KATEGORIE + PFLICHT-SUBFELDER:

trail-adventures  → subcategory (trail/enduro/hard-enduro/mx)
                    difficulty (1/2/3)
                    [wenn mx: mx_type (mx-track/race)]

rallyes           → rallye_region (inland/europe/africa/asia)
                    level (amateur/beginner/pro/dakar)

adventure-trips   → trip_type (onroad/offroad)
                    difficulty (1/2/3)

skills-camps      → skill_level (beginner/hobbyist/intermediate/pro)
                    bike_type

offroad-festivals → keine Pflicht-Subfelder


DATUM:       YYYY-MM-DD
PREIS TEXT:  €150
PREIS ZAHL:  150
COORDS:      {"lat": 50.33, "lng": 6.94}
FRIENDS:     []   ← immer leer
BOOLEAN:     true / false   ← kein Anführungszeichen
```