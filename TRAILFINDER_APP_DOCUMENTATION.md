# TrailFinder App - Vollständige Projektdokumentation

**Version:** 1.0  
**Technologie:** React.js (Single-Page Application)  
**Datei:** `offroad-events-prototype.jsx` (5.356 Zeilen)

---

## INHALTSVERZEICHNIS

1. [Übersicht und Architektur](#1-übersicht-und-architektur)
2. [Context Provider und State Management](#2-context-provider-und-state-management)
3. [Datenmodelle](#3-datenmodelle)
4. [Navigation und Routing](#4-navigation-und-routing)
5. [Internationalisierung (i18n)](#5-internationalisierung-i18n)
6. [Komponenten im Detail](#6-komponenten-im-detail)
7. [Filterlogik](#7-filterlogik)
8. [Benutzerinteraktionen und Workflows](#8-benutzerinteraktionen-und-workflows)
9. [UI-Komponenten und Styling](#9-ui-komponenten-und-styling)
10. [Bekannte Probleme und offene Punkte](#10-bekannte-probleme-und-offene-punkte)

---

## 1. ÜBERSICHT UND ARCHITEKTUR

### 1.1 App-Zweck
TrailFinder ist eine Event-Plattform für Offroad-Motorrad-Events in Deutschland, Belgien, Frankreich und Luxemburg. Benutzer können Events entdecken, filtern, sich anmelden, Favoriten speichern und mit Freunden interagieren.

### 1.2 Hauptkomponenten-Hierarchie

```
OffroadEventsApp (Root)
├── LanguageContext.Provider
│   └── UserStateContext.Provider
│       ├── Navigation
│       ├── HeroSection (Landing)
│       ├── FeaturedEvents (Landing)
│       ├── EventsOverview (Events-Ansicht)
│       │   ├── EventCardWithFriendPopup
│       │   ├── MXTrackCard
│       │   └── FriendDetailPopup
│       ├── EventDetailPage
│       ├── MapPlaceholder
│       ├── ProfileDashboard
│       │   └── EventCard
│       ├── FriendProfileView
│       ├── Footer
│       └── LoginPromptModal
```

### 1.3 Views/Seiten
| View-Name | Beschreibung |
|-----------|--------------|
| `landing` | Startseite mit Hero, Featured Events, Footer |
| `events` | Event-Übersicht mit Filtern und Kategorien |
| `event-detail` | Detailseite eines einzelnen Events |
| `map` | Kartenansicht (Platzhalter) |
| `profile` | Benutzer-Dashboard mit 4 Tabs |
| `friend-profile` | Profilansicht eines Freundes |

---

## 2. CONTEXT PROVIDER UND STATE MANAGEMENT

### 2.1 LanguageContext
```javascript
const LanguageContext = createContext({ language: 'de', t: (key) => key });
```

**Bereitgestellte Werte:**
- `language`: Aktuelle Sprache (`'de'`, `'en'`, `'fr'`, `'nl'`)
- `t(key)`: Übersetzungsfunktion

**Hook:** `useTranslation()`

### 2.2 UserStateContext
```javascript
const UserStateContext = createContext({
  registeredEventIds: [],
  favoriteEventIds: [],
  toggleRegistration: () => {},
  toggleFavorite: () => {},
  isRegistered: () => false,
  isFavorite: () => false,
});
```

**Bereitgestellte Werte:**
| Wert | Typ | Beschreibung |
|------|-----|--------------|
| `registeredEventIds` | `number[]` | IDs der Events, für die der User registriert ist |
| `favoriteEventIds` | `number[]` | IDs der favorisierten Events |
| `toggleRegistration(id)` | `function` | Registrierung an/aus toggeln |
| `toggleFavorite(id)` | `function` | Favorit an/aus toggeln |
| `isRegistered(id)` | `function` | Prüft ob registriert |
| `isFavorite(id)` | `function` | Prüft ob Favorit |

**Hook:** `useUserState()`

### 2.3 App-Level State (OffroadEventsApp)
| State | Initial | Beschreibung |
|-------|---------|--------------|
| `currentView` | `'landing'` | Aktuelle Ansicht |
| `isLoggedIn` | `false` | Login-Status |
| `selectedEvent` | `null` | Ausgewähltes Event für Detailansicht |
| `selectedFriend` | `null` | Ausgewählter Freund für Profilansicht |
| `showLoginPrompt` | `false` | Modal-Sichtbarkeit |
| `language` | `'de'` | Aktuelle Sprache |
| `selectedCategory` | `'trail-adventures'` | Ausgewählte Kategorie für Footer-Navigation |

---

## 3. DATENMODELLE

### 3.1 Event-Objekt (mockEvents)
```javascript
{
  id: number,                    // Eindeutige ID
  name: string,                  // Event-Name
  startDate: string,             // Format: "YYYY-MM-DD"
  endDate: string,               // Format: "YYYY-MM-DD"
  location: string,              // Format: "Stadt, Land"
  coordinates: { lat, lng },     // GPS-Koordinaten
  price: string,                 // Format: "€XXX"
  priceValue: number,            // Numerischer Preis
  image: string,                 // Bild-URL
  status: string,                // "upcoming" | "past" | "permanent"
  category: string,              // Hauptkategorie (siehe 3.2)
  subcategory: string | null,    // Unterkategorie (siehe 3.3)
  mxType: string | null,         // "mx-track" | "race" | null
  openingHours: string | null,   // Für permanente MX-Strecken
  difficulty: number | null,     // 1-3 (Einsteiger bis Profi)
  beginnerFriendly: boolean,
  tripType: string | null,       // Für Adventure Trips
  skillLevel: string | null,     // Für Skills-Camps
  festivalType: string | null,   // Für Festivals
  isNew: boolean,                // NEU-Badge anzeigen
  hasChanges: boolean,           // Änderungs-Badge anzeigen
  changeDetails: object | null,  // { field, old, new, date }
  organizerId: string,           // Referenz zu organizers
  registeredFriends: array       // [{ id, name, avatar }]
}
```

### 3.2 Kategorien
| ID | Label (invariant) |
|----|-------------------|
| `trail-adventures` | Trail Adventures |
| `rallyes` | Rallyes |
| `adventure-trips` | Adventure Trips |
| `skills-camps` | Skills-Camps |
| `offroad-festivals` | Offroad Festivals |

**Wichtig:** Kategorienamen werden NICHT übersetzt, sie bleiben in allen Sprachen Englisch.

### 3.3 Unterkategorien (Trail Adventures)
| ID | Label |
|----|-------|
| `all` | Alle |
| `trail` | Trail-Riding |
| `enduro` | Enduro |
| `hard-enduro` | Hard Enduro |
| `mx` | MX |

### 3.4 MX-Events (Sonderkategorie)
MX-Events sind Teil von "Trail Adventures" mit `subcategory: "mx"`.

**Zwei Typen:**
1. **MX-Track** (`mxType: "mx-track"`): Permanente Strecken mit Öffnungszeiten
2. **MX-Race** (`mxType: "race"`): Rennen mit Datum

**WICHTIG:** MX-Events (sowohl Tracks als auch Races) werden NUR in der MX-Ansicht angezeigt, NICHT in der "Alle"-Ansicht.

### 3.5 Organizer-Objekt
```javascript
{
  id: string,
  name: string,
  logo: string,           // URL
  verified: boolean,
  since: number,          // Jahr
  eventsHosted: number,
  rating: number,         // 0-5
  specialties: string[]
}
```

### 3.6 Freunde-Objekt (globalFriendsData)
```javascript
{
  id: number,
  name: string,
  fullName: string,
  avatar: string,
  location: string,
  bike: string,
  bio: string,
  stats: {
    eventsAttended: number,
    upcomingEvents: number,
    friendsCount: number
  },
  commonEvents: number,
  upcomingEventIds: number[],
  privacySettings: {
    showRegistrations: boolean
  }
}
```

---

## 4. NAVIGATION UND ROUTING

### 4.1 Navigation-Komponente
**Props:**
- `currentView`, `setCurrentView`
- `isLoggedIn`, `setIsLoggedIn`
- `language`, `setLanguage`

**UI-Elemente:**
| Element | Aktion |
|---------|--------|
| Logo "TrailFinder" | → `setCurrentView('landing')` |
| "Events" Button | → `setCurrentView('events')` |
| "Karte" Button | → `setCurrentView('map')` |
| Language Selector | → `setLanguage(lang)` |
| Login/Logout Button | → `setIsLoggedIn(!isLoggedIn)` |
| Profile Icon (eingeloggt) | → `setCurrentView('profile')` |

### 4.2 Language Selector
**Darstellung:** Dropdown mit Flaggen
| Sprache | Flagge | Code |
|---------|--------|------|
| Deutsch | 🇩🇪 | `de` |
| English | 🇬🇧 | `en` |
| Français | 🇫🇷 | `fr` |
| Nederlands | 🇳🇱 | `nl` |

**Flaggen-Styling:**
- Größe: `w-6 h-4`
- `flex-shrink-0`
- Sprachcode immer sichtbar neben Flagge

### 4.3 View-Übergänge
```
Landing → Events (via "Alle Events anzeigen" oder Footer-Kategorie)
Landing → Map (via "Kartenansicht")
Events → Event-Detail (via Klick auf Event-Karte)
Event-Detail → Events (via "Zurück")
Profile → Friend-Profile (via Klick auf Freund)
Friend-Profile → Profile (via "Zurück")
Any → Landing (via Logo oder Logout)
```

**Scroll-Verhalten:** Bei jedem View-Wechsel: `window.scrollTo(0, 0)`

---

## 5. INTERNATIONALISIERUNG (i18n)

### 5.1 Unterstützte Sprachen
- `de` (Deutsch) - Standard
- `en` (English)
- `fr` (Français)
- `nl` (Nederlands)

### 5.2 Übersetzungsstruktur
```javascript
const translations = {
  de: { /* ~240 Keys */ },
  en: { /* ~240 Keys */ },
  fr: { /* ~240 Keys */ },
  nl: { /* ~240 Keys */ }
}
```

### 5.3 Übersetzungs-Kategorien
1. **Navigation:** events, map, login, logout
2. **Hero:** heroTitle1, heroTitle2, heroSubtitle, allEventsShow, mapView
3. **Categories:** trailAdventures, rallyes, adventureTrips, skillsCamps, offroadFestivals
4. **Time filters:** filterAll, weekend, soon, months6, season
5. **Duration:** days, day, day1, days2, days1_2, days3_4, etc.
6. **Difficulty:** beginner, intermediate, advanced, allLevels
7. **Event detail:** aiSummary, friendsAtEvent, organizer, price, date, location, duration
8. **Profile:** myDashboard, myEvents, friends, favorites, settings
9. **Settings:** privacy, notifications, account
10. **Countries:** germany, france, belgium, netherlands, luxembourg, spain, italy, etc.
11. **Regions:** bavaria, nrw, lowersaxony, etc.

### 5.4 Länder-Übersetzungen
```javascript
const countryTranslations = {
  germany: { de: 'Deutschland', en: 'Germany', fr: 'Allemagne', nl: 'Duitsland' },
  france: { de: 'Frankreich', en: 'France', fr: 'France', nl: 'Frankrijk' },
  // ... 13 Länder insgesamt
}
```

### 5.5 translateLocation Funktion
```javascript
function translateLocation(location, language) {
  // Ersetzt deutschen Ländernamen durch übersetzte Version
  // Input: "München, Deutschland"
  // Output (en): "München, Germany"
}
```

---

## 6. KOMPONENTEN IM DETAIL

### 6.1 HeroSection
**Zweck:** Landing-Page Header mit Haupttitel und CTAs

**UI-Elemente:**
- Großer Titel (2 Zeilen): `heroTitle1`, `heroTitle2`
- Untertitel: `heroSubtitle`
- Button "Alle Events anzeigen" → `onExplore()`
- Button "Kartenansicht" → `onMap()`

### 6.2 FeaturedEvents (Marquee)
**Zweck:** Horizontale, automatisch scrollende Event-Galerie

**Logik:**
- Filtert `mockEvents` nach `status === 'upcoming'`
- Nimmt erste 3 Events
- Verdreifacht Array für nahtlose Animation
- CSS-Animation: `marquee 30s linear infinite`

**Event-Karte (vereinfacht):**
- Bild mit Gradient-Overlay
- NEU-Badge wenn `isNew`
- Name, Datum, Ort
- Preis, Dauer

### 6.3 EventsOverview
**Zweck:** Hauptansicht mit Kategorien, Filtern und Event-Grid

**State-Variablen:**
| State | Default | Beschreibung |
|-------|---------|--------------|
| `userLocation` | `null` | GPS-Koordinaten |
| `locationStatus` | `'idle'` | `'idle'` | `'requesting'` | `'granted'` | `'denied'` |
| `filterCategory` | `initialCategory` oder `'trail-adventures'` | Aktive Kategorie |
| `searchQuery` | `''` | Suchbegriff |
| `filterCountries` | `[]` | Ausgewählte Länder |
| `filterShowPast` | `false` | Vergangene Events anzeigen |
| `filterOnlyNew` | `false` | Nur neue Events |
| `filterFriendsOnly` | `false` | Nur mit Freunden |
| ... | ... | Kategorie-spezifische Filter |

### 6.4 EventCard
**Props:**
- `event`: Event-Objekt
- `isLoggedIn`: Boolean
- `onEventClick`: Function

**Features:**
- Aspekt-Ratio Bild (16:9)
- Badges: NEU, MX-Track, First-Timer Friendly, VERGANGEN
- Favoriten-Button (Herz-Icon) - nur wenn eingeloggt
- Änderungs-Badge ("!") mit Tooltip
- Hover-Effekt auf Bild (scale 110%)
- Blur-Overlay wenn nicht eingeloggt

### 6.5 EventCardWithFriendPopup
**Erweitert EventCard um:**
- Freunde-Avatare am unteren Rand
- Popup bei Klick auf Avatar mit Freund-Details
- 3-Punkte-Menü für Freunde-Aktionen

### 6.6 MXTrackCard
**Spezielle Karte für permanente MX-Strecken:**
- Zeigt Öffnungszeiten statt Datum
- Status "Geöffnet heute" wenn zutreffend
- Kein Dauer-Feld

### 6.7 EventDetailPage
**Zweck:** Vollständige Event-Details

**Sections:**
1. **Hero-Bild** mit Badges (MX-Track, NEU, First-Timer)
2. **KI-Zusammenfassung** - sprachspezifisch generiert
3. **Freunde dabei** - Avatar-Liste mit Popup
4. **Veranstalter-Info** - Popup bei Klick
5. **Details-Grid:** Preis, Datum, Ort, Dauer
6. **Karte** (Platzhalter)
7. **CTA-Bereich:** Anmelden-Button + Registrierungs-Toggle
8. **Ähnliche Events** (Marquee)
9. **Footer**

**Registration-Toggle:**
- Text: "Registriert" / "Nicht registriert"
- Styling: `text-xs`, neutral/amber Farben
- Icon: Checkmark/Circle
- Transition: 180-200ms

### 6.8 ProfileDashboard
**Zweck:** Benutzer-Dashboard mit 4 Tabs

**Tabs:**
1. **Meine Events:** Registrierte Events (upcoming/past)
2. **Freunde:** Freunde-Liste mit Suche, Anfragen, Nudge
3. **Favoriten:** Favorisierte Events
4. **Einstellungen:** Profil, Privatsphäre, Benachrichtigungen, Account

**Header:**
- Avatar mit "Bearbeiten"-Button
- Name, Standort, Bio
- Statistiken (Freunde, Angemeldete Events, Favoriten)
- "Profil-Link kopieren" Button
- "Abmelden" Button

### 6.9 FriendProfileView
**Zweck:** Öffentliches Profil eines Freundes

**Sections:**
- Header mit Avatar, Name, Standort
- Bike-Info
- Bio
- Statistiken (Events, geplante Events, Freunde)
- "Gemeinsame Events" Grid
- Registrierte Events (wenn nicht versteckt)

### 6.10 Footer
**Zweck:** Kategorie-Navigation und rechtliche Links

**Sections:**
1. **Kategorie-Buttons:** 5 Kategorien, clickable
2. **Legal Links:** Über uns, Impressum, Datenschutz, etc.
3. **Copyright:** "© 2025 TrailFinder"

**OFFENES PROBLEM:** Legal Links sind nicht übersetzt, müssen clickable sein mit leeren Modals, "Kontaktieren Sie uns" soll `mailto:info@trailfinder.com` öffnen.

---

## 7. FILTERLOGIK

### 7.1 Basis-Filter (alle Kategorien)
```javascript
// Kategorie-Match
if (event.category !== filterCategory) return false;

// Vergangene Events
if (!filterShowPast && event.status === 'past') return false;

// Nur neue
if (filterOnlyNew && !event.isNew) return false;

// Nur mit Freunden
if (filterFriendsOnly && event.registeredFriends.length === 0) return false;

// Suche
if (searchQuery && !event.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;

// Länder-Filter
if (filterCountries.length > 0) {
  // Matching-Logik...
}
```

### 7.2 Trail Adventures Filter
| Filter | State | Options |
|--------|-------|---------|
| Subcategory | `trailSubcategory` | all, trail, enduro, hard-enduro, mx |
| Zeit | `trailTime` | all, we (Wochenende), soon, 6m, season |
| Dauer | `trailDuration` | all, 1, 2, 3-5, 5+ |
| Schwierigkeit | `trailDifficulty` | all, 1, 2, 3 |
| Im Umkreis | `trailInArea` + `trailRadius` | Boolean + km |

**MX-Track Ausnahme:** Zeit- und Dauer-Filter werden für `mxType === 'mx-track'` übersprungen.

### 7.3 Adventure Trips Filter
| Filter | State | Options |
|--------|-------|---------|
| Reiseziel | `tripType` | all, morocco, balkan, scandinavia, alps |
| Zeit | `tripTime` | all, 3m, 6m, season, next-year |
| Dauer | `tripDuration` | all, 3-5, 6-10, 10+ |

### 7.4 Rallyes Filter
| Filter | State | Options |
|--------|-------|---------|
| Zeit | `rallyeTime` | all, 3m, 6m, season |
| Dauer | `rallyeDuration` | all, 1, 2, 3-4, 5+ |

### 7.5 Skills-Camps Filter
| Filter | State | Options |
|--------|-------|---------|
| Level | `skillLevel` | all, beginner, intermediate, advanced |
| Dauer | `skillDuration` | all, 1, 1-2, 3-5 |
| Umkreis | `skillRadius` | all, 100, 300, 500 |

### 7.6 Offroad Festivals Filter
| Filter | State | Options |
|--------|-------|---------|
| Zeit | `festivalTime` | all, 3m, 6m, season |
| Typ | `festivalType` | all, community, manufacturer, demo, etc. |
| Umkreis | `festivalRadius` | all, 200, 500, 1000, eu |

### 7.7 MX-Events Filterung
**KRITISCH:** MX-Events (subcategory === 'mx') sollen NUR in der MX-Ansicht angezeigt werden:
```javascript
// In der "Alle"-Ansicht für Trail Adventures:
if (trailSubcategory === 'all' && event.subcategory === 'mx') return false;
```

---

## 8. BENUTZERINTERAKTIONEN UND WORKFLOWS

### 8.1 Login-Flow
1. User klickt auf Event-Karte (nicht eingeloggt)
2. `LoginPromptModal` erscheint
3. Optionen: "Jetzt anmelden" oder "Später"
4. Bei Login: `setIsLoggedIn(true)`, Modal schließt

### 8.2 Event-Registration-Flow
1. User öffnet Event-Detail (eingeloggt)
2. Klickt "Jetzt anmelden" Button
3. **OFFENES PROBLEM:** Modal "Externen Link öffnen" erscheint - Texte nicht übersetzt
4. Bei Bestätigung: `window.open(url, '_blank')`
5. Registration-Toggle zeigt Status

### 8.3 Favoriten-Flow
1. User klickt Herz-Icon auf Event-Karte
2. `toggleFavorite(eventId)` wird aufgerufen
3. Icon wechselt Farbe (weiß → rot)
4. Event erscheint im Favoriten-Tab

### 8.4 Freunde-Interaktion
1. **Nudge:** Klick auf Nudge-Button → "Angestupst!" Toast
2. **Profil ansehen:** → `setCurrentView('friend-profile')`
3. **Anfragen:** Accept/Decline Buttons

### 8.5 Sprachänderung
1. User klickt auf Flagge in Navigation
2. Dropdown öffnet sich
3. User wählt Sprache
4. `setLanguage(lang)` → alle Texte aktualisieren

---

## 9. UI-KOMPONENTEN UND STYLING

### 9.1 Farbschema (Tailwind)
| Verwendung | Farbe |
|------------|-------|
| Hintergrund | `stone-950` |
| Karten | `stone-900` |
| Borders | `stone-800` |
| Text primär | `white` |
| Text sekundär | `stone-400` |
| Akzent | `amber-500` / `amber-400` |
| Erfolg/Neu | `emerald-500` |
| Info | `blue-500` |
| Warnung | `yellow-500` |
| Favorit | `red-500` |

### 9.2 Helm-Schwierigkeits-Icon (HelmetOutlineIcon)
**SVG-Komponente:**
- viewBox: `0 0 24 24`
- stroke: `currentColor`
- strokeWidth: `1.8`
- 7 Pfad-Elemente für Motocross-Helm-Silhouette
- Opacity: `100%` (aktiv) / `30%` (inaktiv)

### 9.3 Difficulty-Icon
Zeigt 1-3 Helm-Icons nebeneinander:
- Level 1: 1 aktiv, 2 inaktiv
- Level 2: 2 aktiv, 1 inaktiv
- Level 3: 3 aktiv

### 9.4 Badge-System
| Badge | Farbe | Bedingung |
|-------|-------|-----------|
| NEU | emerald-500 | `event.isNew === true` |
| MX-Track | amber-500 | `event.mxType === 'mx-track'` |
| MX-Race | emerald-500 | `event.mxType === 'race'` (nur in MX-View) |
| First-Timer | blue-500 | `event.beginnerFriendly && mxType !== 'mx-track'` |
| VERGANGEN | stone-700 | `event.status === 'past'` |
| Änderung (!) | yellow-500 | `event.hasChanges === true` |

**Badge-Konsistenz:** Badges müssen in allen Views (Alle, Trail, Enduro, Hard-Enduro, MX) identisch sein.

---

## 10. BEKANNTE PROBLEME UND OFFENE PUNKTE

### 10.1 Fehlende Übersetzungen

#### Suchfeld
**Problem:** Placeholder "Suchen..." wird nicht übersetzt
**Lösung:** Key `search` existiert, muss im Input verwendet werden

#### External Link Modal
**Problem:** Bei "Anmelden" erscheint Modal mit deutschem Text in allen Sprachen
**Lösung:** Modal-Texte müssen übersetzt werden:
- "Externen Link öffnen"
- "Möchtest du zur Veranstalter-Seite weitergeleitet werden?"
- "Abbrechen"
- "Weiter"

#### ProfileDashboard Location
**Problem:** Standort unter dem Namen wird nicht übersetzt ("Köln, Deutschland" bleibt deutsch)
**Lösung:** `translateLocation()` auf `user.location` anwenden

### 10.2 Footer-Übersetzung
**Problem:** Legal Links sind hardcoded auf Deutsch

**Betroffene Texte:**
- Über uns
- Impressum
- Datenschutz
- Cookies
- Allgemeine Geschäftsbedingungen / AGB
- Rechtliches
- Kontaktieren Sie uns

**Lösung:**
1. Übersetzungs-Keys hinzufügen
2. Links clickable machen mit leeren Modals
3. "Kontaktieren Sie uns" → `mailto:info@trailfinder.com`

### 10.3 MX-Events in "Alle"-Ansicht
**Problem:** MX-Events erscheinen sowohl in MX als auch in "Alle"
**Anforderung:** MX-Events (Tracks und Races) sollen NUR in MX-Ansicht sichtbar sein
**Begründung:** MX-Rennen erfordern Rennlizenz, sind nicht für jeden zugänglich

---

## ANHANG A: Vollständige State-Liste EventsOverview

```javascript
// Location
const [userLocation, setUserLocation] = useState(null);
const [locationStatus, setLocationStatus] = useState('idle');
const [manualLocation, setManualLocation] = useState('');
const [showLocationInput, setShowLocationInput] = useState(false);

// Global
const [filterCategory, setFilterCategory] = useState(initialCategory || 'trail-adventures');
const [showMoreFilters, setShowMoreFilters] = useState(false);
const [searchQuery, setSearchQuery] = useState('');
const [filterCountries, setFilterCountries] = useState([]);
const [filterRegions, setFilterRegions] = useState({});
const [filterShowPast, setFilterShowPast] = useState(false);
const [filterOnlyNew, setFilterOnlyNew] = useState(false);
const [filterFriendsOnly, setFilterFriendsOnly] = useState(false);

// Trail Adventures
const [trailSubcategory, setTrailSubcategory] = useState(isLoggedIn ? 'trail' : 'all');
const [trailTime, setTrailTime] = useState('all');
const [trailDuration, setTrailDuration] = useState('all');
const [trailDifficulty, setTrailDifficulty] = useState('all');
const [trailRadius, setTrailRadius] = useState(200);
const [trailInArea, setTrailInArea] = useState(false);
const [trailPrice, setTrailPrice] = useState('all');

// Adventure Trips
const [tripType, setTripType] = useState('all');
const [tripTime, setTripTime] = useState('all');
const [tripDuration, setTripDuration] = useState('all');
const [tripRadius, setTripRadius] = useState('all');
const [tripPrice, setTripPrice] = useState('all');

// Rallyes
const [rallyeRegion, setRallyeRegion] = useState('all');
const [rallyePrice, setRallyePrice] = useState('all');
const [rallyeTime, setRallyeTime] = useState('all');
const [rallyeLevel, setRallyeLevel] = useState('all');
const [rallyeDuration, setRallyeDuration] = useState('all');

// Skills-Camps
const [skillLevel, setSkillLevel] = useState('all');
const [skillTime, setSkillTime] = useState('all');
const [skillRadius, setSkillRadius] = useState('all');
const [skillPrice, setSkillPrice] = useState('all');
const [skillDuration, setSkillDuration] = useState('all');
const [skillBikeType, setSkillBikeType] = useState('all');
const [skillGroupSize, setSkillGroupSize] = useState('all');

// Offroad Festivals
const [festivalTime, setFestivalTime] = useState('all');
const [festivalRadius, setFestivalRadius] = useState('all');
const [festivalType, setFestivalType] = useState('all');

// Friend Popup
const [selectedFriend, setSelectedFriend] = useState(null);
```

---

## ANHANG B: Mock-Events Übersicht

| ID | Name | Kategorie | Subcategory | MX-Type |
|----|------|-----------|-------------|---------|
| 1 | Eifel Adventure Rally | rallyes | - | - |
| 2 | Ardennes Mud Challenge | trail-adventures | enduro | - |
| 3 | Luxembourg Trail Days | trail-adventures | trail | - |
| 4 | Black Forest Enduro | trail-adventures | enduro | - |
| 5 | Vosges Hard Enduro | trail-adventures | hard-enduro | - |
| 6 | Morocco Desert Tour | adventure-trips | - | - |
| 7 | Alps Crossing | adventure-trips | - | - |
| 8 | Sardinia Adventure Week | adventure-trips | - | - |
| 9 | Enduro Skills Camp | skills-camps | - | - |
| 10 | Rally Navigation Course | skills-camps | - | - |
| 11 | Adventure Riding Basics | skills-camps | - | - |
| 12 | Erzberg Rodeo | offroad-festivals | - | - |
| 13 | BMW GS Trophy Qualifier | offroad-festivals | - | - |
| 14 | KTM Adventure Rally | offroad-festivals | - | - |
| 15 | Balkans Explorer | adventure-trips | - | - |
| 16 | Hunsrück Enduro Classic | trail-adventures | enduro | - |
| 17 | MX Park Kleinhau | trail-adventures | mx | mx-track |
| 18 | Talkessel Teutschenthal | trail-adventures | mx | mx-track |
| 19 | MX Strecke Bielstein | trail-adventures | mx | mx-track |
| 20 | ADAC MX Masters Gaildorf | trail-adventures | mx | race |
| 21 | Deutsche MX Meisterschaft Bielstein | trail-adventures | mx | race |

---

**Dokumentation erstellt am:** [Aktuelles Datum]
**Autor:** Claude AI für TrailFinder Projekt
