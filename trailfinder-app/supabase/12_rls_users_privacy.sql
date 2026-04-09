-- ============================================================
-- Migration 12: RLS users-Tabelle einschränken
-- Run in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================
--
-- Problem (Migration 06)
-- ----------------------
-- users_select_authenticated hatte USING(true) → jeder eingeloggte
-- User konnte alle anderen User-Datensätze lesen, inkl.
-- registered_event_ids und event_date_selections.
-- Die Privacy-Filterung passierte nur im JavaScript-Layer.
--
-- Fix
-- ---
-- 1. USING(true) Policy löschen.
-- 2. Neue Policy: nur eigenes Profil ODER akzeptierter Freund → voller Zugriff.
-- 3. SECURITY DEFINER Funktion search_users_safe() für User-Suche
--    (gibt nur nicht-sensitive Spalten zurück, kein registered_event_ids).
-- 4. SECURITY DEFINER Funktion get_users_basic() für:
--    - Anzeige von Freundschaftsanfragen (Name/Avatar des Anfragenden)
--    - fetchUserById für Nicht-Freunde
--    - Fallback für pending Requests in fetchFriendsWithStatus
--
-- Idempotent: sicher mehrfach ausführbar.
-- ============================================================


-- ─── 1. Overly permissive policy entfernen ───────────────────────────────────

DROP POLICY IF EXISTS "users_select_authenticated" ON public.users;


-- ─── 2. Neue Policy: accepted friend darf vollen Datensatz lesen ─────────────
-- Die bestehende "users_select_own" Policy (auth.uid() = id) bleibt unverändert.
-- Diese neue Policy erlaubt Zugriff auf fremde Profile NUR wenn eine
-- beidseitig akzeptierte Freundschaft besteht.

DROP POLICY IF EXISTS "users_select_accepted_friend" ON public.users;

CREATE POLICY "users_select_accepted_friend"
    ON public.users FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.friends f
            WHERE  f.user_id   = auth.uid()
              AND  f.friend_id = id
              AND  f.status    = 'accepted'
        )
    );


-- ─── 3. search_users_safe() — User-Suche ohne sensitive Spalten ──────────────
-- SECURITY DEFINER: umgeht die RLS-Policy auf der users-Tabelle.
-- Gibt NUR nicht-sensitive Spalten zurück (kein registered_event_ids etc.).
-- Zugriff: nur authenticated Users.
-- Verwendet von: searchUsers() im Frontend.

DROP FUNCTION IF EXISTS public.search_users_safe(text);

CREATE OR REPLACE FUNCTION public.search_users_safe(search_query text)
RETURNS TABLE (
    id       uuid,
    name     text,
    email    text,
    avatar   text,
    location text,
    bio      text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT u.id, u.name, u.email, u.avatar, u.location, u.bio
    FROM   public.users u
    WHERE  length(search_query) >= 2
      AND  (u.name  ILIKE '%' || search_query || '%'
         OR u.email ILIKE '%' || search_query || '%')
      AND  u.id != auth.uid()
    LIMIT  8;
$$;

REVOKE ALL     ON FUNCTION public.search_users_safe(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.search_users_safe(text) TO authenticated;


-- ─── 4. get_users_basic() — Basis-Profil für beliebige User-IDs ──────────────
-- SECURITY DEFINER: umgeht die RLS-Policy auf der users-Tabelle.
-- Gibt NUR nicht-sensitive Spalten zurück (kein registered_event_ids etc.).
-- Zugriff: nur authenticated Users.
-- Verwendet von:
--   a) Anzeige incoming friend requests (Name/Avatar des Anfragenden)
--   b) fetchUserById für Nicht-Freunde
--   c) Fallback für pending-outgoing Rows in fetchFriendsWithStatus

DROP FUNCTION IF EXISTS public.get_users_basic(uuid[]);

CREATE OR REPLACE FUNCTION public.get_users_basic(user_ids uuid[])
RETURNS TABLE (
    id       uuid,
    name     text,
    avatar   text,
    location text,
    bio      text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT u.id, u.name, u.avatar, u.location, u.bio
    FROM   public.users u
    WHERE  u.id = ANY(user_ids);
$$;

REVOKE ALL     ON FUNCTION public.get_users_basic(uuid[]) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_users_basic(uuid[]) TO authenticated;


-- ─── 5. Verify ───────────────────────────────────────────────────────────────

SELECT '=== users RLS policies after migration 12 ===' AS info;
SELECT policyname, cmd, roles, qual
FROM   pg_policies
WHERE  schemaname = 'public' AND tablename = 'users'
ORDER  BY policyname;

SELECT '=== SECURITY DEFINER functions ===' AS info;
SELECT routine_name, routine_type, security_type
FROM   information_schema.routines
WHERE  routine_schema = 'public'
  AND  routine_name IN ('search_users_safe', 'get_users_basic')
ORDER  BY routine_name;
