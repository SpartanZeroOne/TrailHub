# TrailFinder – Supabase Setup Guide

Schritt-für-Schritt Anleitung zur vollständigen Einrichtung.

---

## Schritt 1: Supabase API-Key prüfen

Der Supabase Anon-Key muss ein JWT-Token sein (beginnt mit `eyJ...`).

1. Öffne [app.supabase.com](https://app.supabase.com)
2. Wähle Projekt `hmdkiteqapiahwvdbdyh`
3. Gehe zu **Settings > API**
4. Kopiere den **anon / public** Key
5. Trage ihn in `.env.local` ein:

```env
VITE_SUPABASE_URL=https://hmdkiteqapiahwvdbdyh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...  ← hier den echten Key eintragen
```

---

## Schritt 2: Datenbank einrichten

Im Supabase Dashboard:

1. **SQL Editor** öffnen (linke Sidebar)
2. Inhalt von `trailfinder-app/supabase/01_schema.sql` einfügen und ausführen
3. Inhalt von `trailfinder-app/supabase/02_seed.sql` einfügen und ausführen

Tabellen die erstellt werden:
- `events` – alle Offroad-Events
- `users` – Benutzerprofile (erweitert auth.users)
- `friends` – Freundschaftsbeziehungen
- `organizers` – Event-Veranstalter

---

## Schritt 3: Authentication einrichten

1. Supabase Dashboard > **Authentication > Providers**
2. **Email** aktivieren (ist standardmäßig aktiv)
3. Optional: Google, GitHub OAuth aktivieren
4. **Authentication > URL Configuration:**
   - Site URL: `https://deine-domain.de`
   - Redirect URLs: `https://deine-domain.de/**`

---

## Schritt 4: Storage Bucket erstellen

1. Dashboard > **Storage**
2. **New bucket** → Name: `trailfinder-hosting` → Public: ✅
3. Alternativ wird der Bucket automatisch durch `01_schema.sql` erstellt

---

## Schritt 5: App bauen und hochladen

```bash
cd trailfinder-app

# .env.local prüfen (Supabase Keys müssen gesetzt sein)
cat .env.local

# Produktions-Build erstellen
npm run build

# Supabase CLI installieren (einmalig)
npm install -g supabase

# Anmelden
supabase login

# Build-Dateien hochladen
supabase storage cp ./dist/ ss://trailfinder-hosting/ \
  --project-ref hmdkiteqapiahwvdbdyh \
  --recursive
```

**App-URL nach Upload:**
```
https://hmdkiteqapiahwvdbdyh.supabase.co/storage/v1/object/public/trailfinder-hosting/index.html
```

> **Hinweis:** Supabase Storage unterstützt kein natives SPA-Routing.
> Für Client-Side-Routing (React Router) empfehlen wir **Netlify** oder **Vercel**.

---

## Schritt 6: Netlify Hosting (Empfohlen)

Da der `netlify/`-Ordner bereits im Projekt vorhanden ist:

1. [app.netlify.com](https://app.netlify.com) öffnen
2. **Add new site > Import an existing project**
3. GitHub-Repository verbinden
4. Build-Einstellungen:
   - Base directory: `trailfinder-app`
   - Build command: `npm run build`
   - Publish directory: `trailfinder-app/dist`
5. **Environment Variables** setzen:
   ```
   VITE_SUPABASE_URL=https://hmdkiteqapiahwvdbdyh.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   VITE_MAPBOX_TOKEN=pk.eyJ...
   ```
6. **Deploy**

---

## Schritt 7: Eigene Domain verbinden

### Option A: Netlify (empfohlen)
1. Netlify > Site Settings > **Domain management**
2. **Add custom domain** → `trailfinder.deine-domain.de`
3. DNS beim Provider setzen:
   ```
   CNAME   trailfinder   [deine-netlify-site].netlify.app
   ```
4. Netlify aktiviert HTTPS automatisch (Let's Encrypt)

### Option B: Supabase Storage direkt
Supabase Storage unterstützt keine eigenen Domains für Storage-Objekte.
Nutze einen CDN (Cloudflare) davor:

```
DNS: CNAME   app   hmdkiteqapiahwvdbdyh.supabase.co
```

---

## Schritt 8: GitHub Actions CI/CD

In den GitHub Repository **Settings > Secrets > Actions** folgende Secrets anlegen:

| Secret | Wert |
|--------|------|
| `VITE_SUPABASE_URL` | `https://hmdkiteqapiahwvdbdyh.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` (echter Key) |
| `VITE_MAPBOX_TOKEN` | Mapbox Token |
| `SUPABASE_ACCESS_TOKEN` | [app.supabase.com/account/tokens](https://app.supabase.com/account/tokens) |

Der Workflow `.github/workflows/deploy.yml` wird automatisch bei jedem Push auf `main` ausgelöst.

---

## Sicherheitshinweise

- **API-Keys nie im Code committen** – nur in `.env.local` (in `.gitignore` eingetragen)
- **GitHub-Token** sofort rotieren nach Verwendung – niemals in Code committen
- **Supabase Service-Role-Key** niemals im Frontend verwenden – nur der `anon` Key
- RLS-Policies prüfen: Events sind öffentlich lesbar, Schreiben nur für authenticated Users

---

## App-Funktionen & Supabase-Mapping

| Feature | Supabase-Tabelle | Hook |
|---------|-----------------|------|
| Event-Liste, Filter | `events` | `useEvents()` |
| Event-Detailseite | `events` + `organizers` | `useEvent(id)` |
| Anmeldung / Login | Supabase Auth | `useAuth()` |
| Favoriten | `users.favorite_event_ids` | `useAuth().toggleFavorite()` |
| Registrierung | `users.registered_event_ids` | `useAuth().toggleRegistration()` |
| Freunde | `friends` | `fetchFriends()` |
| Organizer-Profil | `organizers` | `fetchOrganizerById()` |