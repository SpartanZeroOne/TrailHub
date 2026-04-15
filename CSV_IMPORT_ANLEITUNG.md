# TrailHub – CSV-Import Anleitung für die `events`-Tabelle

---

## 1. SPALTEN-STRUKTUR

### Reihenfolge & Pflichtfelder

| # | Spaltenname | Typ | Pflicht | Standard |
|---|---|---|---|---|
| 1 | `name` | text | **JA** | — |
| 2 | `category` | text | **JA** | — |
| 3 | `start_date` | date | **JA** | — |
| 4 | `end_date` | date | nein | NULL |
| 5 | `location` | text | **JA** | — |
| 6 | `coordinates` | jsonb | nein | NULL |
| 7 | `price` | text | nein | NULL |
| 8 | `price_value` | numeric | nein | NULL |
| 9 | `image` | text | nein | NULL |
| 10 | `status` | text | nein | `upcoming` |
| 11 | `subcategory` | text | nein | NULL |
| 12 | `mx_type` | text | nein | NULL |
| 13 | `difficulty` | integer | nein | NULL |
| 14 | `beginner_friendly` | boolean | nein | `false` |
| 15 | `organizer_id` | text | nein | NULL |
| 16 | `rallye_region` | text | nein | NULL |
| 17 | `trip_type` | text | nein | NULL |
| 18 | `skill_level` | text | nein | NULL |
| 19 | `bike_type` | text | nein | NULL |
| 20 | `group_size` | integer | nein | NULL |
| 21 | `level` | text | nein | NULL |
| 22 | `is_new` | boolean | nein | `false` |
| 23 | `has_changes` | boolean | nein | `false` |
| 24 | `change_details` | jsonb | nein | NULL |
| 25 | `registered_friends` | jsonb | nein | `[]` |
| 26 | `event_url` | text | nein | NULL |
| 27 | `registration_url` | text | nein | NULL |
| 28 | `organizer_description` | text | nein | NULL |
| 29 | `event_dates` | jsonb | nein | NULL |

> **Nicht in die CSV aufnehmen:** `id` (auto-increment), `created_at`, `updated_at`, `ai_summary`, `ai_summary_updated_at` — diese werden von der DB automatisch gesetzt.

---

## 2. DATENFORMATE PRO FELD

### Datum-Felder
```
start_date  →  2026-07-15        (YYYY-MM-DD, ISO 8601)
end_date    →  2026-07-17        (YYYY-MM-DD oder leer lassen)
```
❌ FALSCH: `15.07.2026`, `15/07/2026`, `07-15-2026`
✅ RICHTIG: `2026-07-15`

### Mehrere Termine – `event_dates` (für Skills-Camps)
Für Events die mehrfach im Jahr stattfinden (z.B. Skills-Camps 6-7x/Jahr).
`start_date` / `end_date` bleibt der erste oder Haupt-Termin.
`event_dates` enthält ALLE Termine als JSON-Array:

```
event_dates  →  [{"start_date":"2026-06-14","end_date":"2026-06-15","status":"available"},{"start_date":"2026-07-12","end_date":"2026-07-13","status":"few_left"},{"start_date":"2026-08-09","end_date":"2026-08-10","status":"sold_out"},{"start_date":"2026-09-06","end_date":"2026-09-07"},{"start_date":"2026-10-04","end_date":"2026-10-05"},{"start_date":"2026-11-08","end_date":"2026-11-09"}]
```

**Status-Werte (optional):**
| Wert | Anzeige | Farbe |
|---|---|---|
| `"available"` | Verfügbar | Grün |
| `"few_left"` | Wenige frei | Amber |
| `"sold_out"` | Ausgebucht | Rot |
| *(weggelassen)* | kein Badge | — |

**Hinweis:** Felder `start_date` und `end_date` entweder als `start_date`/`end_date` **oder** als `start`/`end` im JSON-Objekt — beide Formate werden unterstützt.

### Boolean-Felder
```
beginner_friendly  →  true  oder  false  (Kleinbuchstaben!)
is_new             →  true  oder  false
has_changes        →  true  oder  false
```
❌ FALSCH: `TRUE`, `FALSE`, `1`, `0`, `Ja`, `Nein`
✅ RICHTIG: `true`, `false`

### Numerische Felder
```
price_value  →  150        (Ganzzahl oder Dezimal mit Punkt: 49.90)
difficulty   →  1          (nur 1, 2 oder 3)
group_size   →  12         (nur Ganzzahl)
```
❌ FALSCH: `150€`, `"150"`, `49,90` (Komma als Dezimaltrenner!)
✅ RICHTIG: `150`, `49.90`

### JSON-Feld: coordinates
```json
{"lat":50.6337,"lng":5.5675}
```
In der CSV-Zelle (mit äußeren Anführungszeichen wegen Komma im Inhalt):
```
"{""lat"":50.6337,""lng"":5.5675}"
```
> **Regel:** Anführungszeichen innerhalb von JSON müssen in CSV **verdoppelt** werden (`""`)

### JSON-Feld: registered_friends
Leer lassen oder:
```
"[]"
```
Mit Einträgen (sehr selten beim Import):
```
"[{""id"":""uuid-hier"",""name"":""Max"",""avatar"":null}]"
```
> **Empfehlung:** Beim Import immer `[]` eintragen. Freunde-Verknüpfungen entstehen automatisch über die `users`-Tabelle.

### JSON-Feld: change_details
```
"{""field"":""start_date"",""old"":""2026-06-01"",""new"":""2026-07-15"",""note"":""Termin verschoben""}"
```

### Text-Felder
- Kurze Texte ohne Komma: kein Qualifier nötig → `Köln, Deutschland`
  ❌ Enthält Komma → in Anführungszeichen: `"Köln, Deutschland"`
- Texte mit Anführungszeichen im Inhalt → innerhalb verdoppeln:
  `"Der ""Klassiker"" der Szene"`

---

## 3. CSV-FORMATIERUNG

| Einstellung | Wert |
|---|---|
| **Trennzeichen** | Komma `,` |
| **Text-Qualifier** | Doppelte Anführungszeichen `"` |
| **Encoding** | **UTF-8 with BOM** (für Excel-Kompatibilität) |
| **Zeilenende** | CRLF (Windows) oder LF (Mac/Linux) — beides OK |
| **Dezimaltrenner** | Punkt `.` (nicht Komma!) |

### Sonderzeichen-Regeln
| Problem | Lösung |
|---|---|
| Komma im Text | Ganze Zelle in `"..."` einschließen |
| Anführungszeichen im Text | Verdoppeln: `""` |
| Umlaut (ä, ö, ü) | UTF-8 encoding → kein Problem |
| Zeilenumbruch im Text | In `"..."` einschließen, `\n` bleibt drin |
| JSON in der Zelle | In `"..."` und alle inneren `"` verdoppeln |

---

## 4. BEISPIEL-CSV

Speichere das folgende als `events_import.csv` (UTF-8):

```csv
name,category,start_date,end_date,location,coordinates,price,price_value,image,status,subcategory,mx_type,difficulty,beginner_friendly,organizer_id,rallye_region,trip_type,skill_level,bike_type,group_size,level,is_new,has_changes,change_details,registered_friends,event_url,registration_url,organizer_description
"Black Forest Enduro 2026",trail-adventures,2026-08-14,2026-08-16,"Freudenstadt, Deutschland","{""lat"":48.4634,""lng"":8.4105}",€185,185,https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop,upcoming,enduro,,2,false,enduro-events,,,intermediate,,8,,true,false,,[],,https://enduro-events.eu/black-forest,"Europas führender Enduro-Veranstalter"
"Rallye des Ardennes 2026",rallyes,2026-09-05,2026-09-07,"Spa, Belgien","{""lat"":50.4960,""lng"":5.9096}",€220,220,https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&h=600&fit=crop,upcoming,,,,false,rally-masters,benelux,,,,,,false,true,"{""field"":""start_date"",""old"":""2026-08-29"",""new"":""2026-09-05"",""note"":""Termin verschoben""}",[],,https://rally-masters.de/ardennes,
"Vosges Trail Adventure",trail-adventures,2026-07-20,2026-07-22,"Gérardmer, Frankreich","{""lat"":48.0735,""lng"":6.8778}",€95,95,https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop,upcoming,trail,,1,true,adventure-tours,,,,,,,,false,false,,[],,https://adventure-tours.com/vosges,
"MX-Park Eifel",trail-adventures,2099-01-01,,"Daun, Deutschland","{""lat"":50.1926,""lng"":6.8278}",€45,45,https://images.unsplash.com/photo-1614027164847-1b28cfe1df60?w=800&h=600&fit=crop,permanent,mx,mx-track,2,false,offroad-community,,,,,,,false,false,,[],,https://mx-eifel.de,
```

> **Hinweis Zeile 4 (MX-Park):** `start_date = 2099-01-01` ist der Platzhalter für permanente Anlagen (kein fixes Datum). Der DB-Trigger setzt `status` automatisch auf `permanent` wenn es manuell so gesetzt wird.

---

## 5. EXCEL-SPEZIFISCH

### Datei als CSV speichern
1. **Datei → Speichern unter**
2. Dateityp: **CSV UTF-8 (durch Trennzeichen getrennt) (*.csv)**
   - ⚠️ NICHT "CSV (MS-DOS)" oder "CSV (Macintosh)" wählen!
   - ⚠️ NICHT "Semikolon-getrennt" wählen!
3. Bei der Warnung "Dieses Format unterstützt keine Arbeitsmappen..." → **Ja / Beibehalten**

### JSON-Felder in Excel eingeben
Excel versucht JSON-Felder zu interpretieren und kaputt zu machen. So vermeidest du das:

**Methode A — Als Text formatieren (empfohlen):**
1. Spalte markieren → Rechtsklick → Zellen formatieren → **Text**
2. DANN den JSON-Wert eingeben: `{"lat":50.63,"lng":5.57}`
3. Beim CSV-Export übernimmt Excel die Anführungszeichen automatisch

**Methode B — Direkt als CSV editieren:**
Öffne die Datei in einem Texteditor (VS Code, Notepad++) und trage die JSON-Werte direkt ein — das ist die sicherste Methode.

**Methode C — Hilfsspalte:**
Trage die Werte ohne geschweifte Klammern ein und baue sie per Formel zusammen:
```excel
= "{""lat"":" & B2 & ",""lng"":" & C2 & "}"
```

### Google Sheets (empfohlene Alternative)
Google Sheets ist für JSON-Felder einfacher:
1. Neue Tabelle erstellen
2. Erste Zeile: alle Spaltennamen (wie oben)
3. JSON direkt in die Zelle tippen (kein Escaping nötig in Sheets)
4. **Datei → Herunterladen → CSV (.csv)**
5. Die heruntergeladene Datei funktioniert direkt mit Supabase

---

## 6. HÄUFIGE FEHLER

| Fehler | Ursache | Lösung |
|---|---|---|
| `invalid input syntax for type date` | Datumsformat falsch (z.B. `15.07.2026`) | Format auf `YYYY-MM-DD` ändern |
| `invalid input syntax for type json` | JSON nicht korrekt escaped | Anführungszeichen verdoppeln `""` |
| `value too long for type text` | Sehr langer Text | Kürzen oder prüfen ob richtige Spalte |
| `invalid input syntax for type boolean` | `TRUE/FALSE` statt `true/false` | Kleinbuchstaben verwenden |
| `invalid input syntax for type integer` | `"2"` mit Anführungszeichen | Zahl ohne Anführungszeichen |
| `null value in column "name"` | Pflichtfeld leer | Pflichtfelder ausfüllen |
| `null value in column "start_date"` | Datumsfeld leer | Datum eintragen |
| `insert or update on table violates foreign key` | `organizer_id` existiert nicht | Erst Organizer anlegen oder leer lassen |
| Umlaute werden `Ã¤` angezeigt | Falsches Encoding | UTF-8 (nicht UTF-16, nicht ANSI) |
| Spalten verschoben | Semikolon statt Komma | In Supabase Trennzeichen prüfen |
| Zu viele Spalten erkannt | Komma im Text ohne `"..."` | Text mit Komma in Anführungszeichen |

---

## 7. VALIDIERUNG VOR DEM IMPORT

### Schritt 1: CSV in Texteditor prüfen
Öffne die .csv in VS Code oder Notepad++ und prüfe:
- Erste Zeile = Spaltennamen (keine leere erste Zeile)
- Anzahl Kommas pro Zeile = immer gleich (= Anzahl Spalten - 1)
- Keine Zeile mit `,,,,` (viele leere Spalten) außer wenn gewollt
- JSON-Felder: geschweifte Klammern korrekt, innere `""` vorhanden

### Schritt 2: Online-Validator
- **CSV Lint:** https://csvlint.io
- **JSON in CSV prüfen:** Einen JSON-Wert aus der Zelle extrahieren und auf https://jsonlint.com testen

### Schritt 3: Kleinen Test zuerst
Importiere immer zuerst **1-2 Zeilen** als Test. Wenn das klappt, dann die vollständige Datei.

### Schnell-Check-Formel (Excel)
Um fehlende Pflichtfelder zu finden:
```excel
=WENN(ODER(A2="",B2="",C2="",E2=""),"❌ FEHLT","✅ OK")
```
(Spalten A=name, B=category, C=start_date, E=location)

---

## 8. WORKFLOW — SCHRITT FÜR SCHRITT

### Schritt 1: Excel vorbereiten
1. Neue Excel-Datei öffnen
2. Zeile 1: Spaltennamen aus der Tabelle oben (Abschnitt 1) einkopieren
3. Spalten die JSON enthalten (coordinates, registered_friends, change_details): **Als Text formatieren** (Spalte markieren → Strg+1 → Text)

### Schritt 2: Daten eintragen
- Pflichtfelder: `name`, `category`, `start_date`, `location`
- `status` leer lassen → DB-Trigger setzt es automatisch
- `registered_friends` immer `[]` eintragen (kein JSON-Escape nötig, da kein Komma)
- Für `coordinates`: `{"lat":48.46,"lng":8.41}` direkt tippen (bei Text-Format)

### Schritt 3: Als CSV speichern
1. Datei → Speichern unter
2. Format: **CSV UTF-8 (durch Trennzeichen getrennt)**
3. Warnung bestätigen

### Schritt 4: In Supabase importieren
1. Supabase Dashboard → **Table Editor → events**
2. Oben rechts: **Insert → Import data from CSV**
3. CSV-Datei hochladen
4. Einstellungen prüfen:
   - Trennzeichen: **Comma (,)**
   - Header row: **Yes**
   - Encoding: **UTF-8**
5. **Vorschau prüfen:** Stimmen Spaltenname und Daten überein?
6. **Import** klicken

### Schritt 5: Erfolg prüfen
```sql
-- In Supabase SQL Editor ausführen:
SELECT id, name, category, start_date, status
FROM events
ORDER BY created_at DESC
LIMIT 10;
```
Die neu importierten Events stehen oben.

---

## 9. KOPIERFERTIGE CSV-VORLAGE

Die fertige Vorlagendatei liegt unter: **`trailhub_events_vorlage.csv`** (im selben Ordner wie diese Anleitung)

Zum Selbst-Erstellen — folgenden Inhalt als `trailhub_events_vorlage.csv` speichern (UTF-8 Encoding):

```
name,category,start_date,end_date,location,coordinates,price,price_value,image,status,subcategory,mx_type,difficulty,beginner_friendly,organizer_id,rallye_region,trip_type,skill_level,bike_type,group_size,level,is_new,has_changes,change_details,registered_friends,event_url,registration_url,organizer_description
"DEIN EVENT NAME",trail-adventures,2026-09-01,2026-09-03,"STADT, LAND","{""lat"":50.00,""lng"":7.00}",€100,100,,upcoming,enduro,,2,false,enduro-events,,,intermediate,,,,false,false,,[],,https://deine-website.de,
```

### Gültige Werte als Spickzettel

**category:**
`trail-adventures` · `rallyes` · `adventure-trips` · `skills-camps` · `offroad-festivals`

**subcategory** (nur bei trail-adventures):
`trail` · `enduro` · `hard-enduro` · `mx`

**mx_type** (nur bei subcategory=mx):
`mx-track` · `race`

**status:**
`upcoming` · `past` · `permanent`

**difficulty:**
`1` (Leicht) · `2` (Mittel) · `3` (Schwer)

**rallye_region** (nur bei rallyes):
`eifel` · `mosel` · `sauerland` · `hunsrueck` · `ardennes` · `benelux` · `balkan` · `alps` · `spain` · `morocco` · `other`

**trip_type** (nur bei adventure-trips):
`onroad` · `offroad`

**skill_level** (nur bei skills-camps):
`beginner` · `hobbyist` · `intermediate` · `pro`

**bike_type** (nur bei skills-camps):
`enduro` · `trail` · `adventure` · `mx`

**organizer_id** (vorhandene IDs):
`adventure-tours` · `bosnia-rally` · `enduro-events` · `moto-academy` · `offroad-community` · `rally-masters` · `rando-tt` · `tracks-adventures`

---

## 10. TIPP: DIREKTER SQL-IMPORT (Alternative zu CSV)

Wenn JSON-Felder Probleme machen, ist SQL der sicherste Weg:

```sql
INSERT INTO events (
  name, category, subcategory, start_date, end_date,
  location, coordinates, price, price_value, status,
  difficulty, beginner_friendly, organizer_id,
  registered_friends, is_new, has_changes, event_url
) VALUES (
  'Black Forest Enduro 2026',
  'trail-adventures',
  'enduro',
  '2026-08-14',
  '2026-08-16',
  'Freudenstadt, Deutschland',
  '{"lat": 48.4634, "lng": 8.4105}',
  '€185',
  185,
  'upcoming',
  2,
  false,
  'enduro-events',
  '[]',
  true,
  false,
  'https://enduro-events.eu/black-forest'
);
```

→ Supabase Dashboard → **SQL Editor** → Einfügen → Run