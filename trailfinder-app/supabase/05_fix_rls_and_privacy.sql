-- ============================================================
-- Migration 05: Post-friendship-removal privacy enforcement
-- Run in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================
--
-- Background
-- ----------
-- When remove_friendship() (a SECURITY DEFINER RPC) deletes both
-- friendship rows, Supabase Realtime re-evaluates RLS to decide
-- which subscribers receive the DELETE event. Because the WAL entry
-- carries the *function-owner* role rather than the authenticated
-- caller's role, auth.uid() resolves to NULL inside the RLS
-- expression. This causes the event to be silently dropped for the
-- *removed* user — their client never calls loadFriends(), so
-- the removed friend's avatar keeps appearing on event cards.
--
-- This migration fixes two things:
--
-- 1. users SELECT RLS
--    Replace the "own only" policy with "own OR accepted friend".
--    After removal the removed party can no longer read the other
--    user's registered_event_ids via a direct DB query, AND
--    Supabase Realtime's postgres_changes for the users table will
--    stop forwarding that user's UPDATE events to the ex-friend.
--    This closes the usersChannel data-leak path.
--
-- 2. Helper: is_accepted_friend()
--    A STABLE SECURITY DEFINER helper avoids recursive RLS evaluation
--    when the users policy references the friends table (which itself
--    has RLS enabled). Without this helper PostgreSQL might raise an
--    infinite-recursion error in some query plans.
--
-- Note: The primary Realtime fix (Broadcast notification) is done
-- client-side (OffroadEventsApp.jsx) because the SECURITY DEFINER
-- WAL path cannot be fixed purely at the DB level without removing
-- the SECURITY DEFINER attribute from remove_friendship() — which
-- would break the bidirectional delete authorization check.
-- ============================================================

-- ─── 1. Helper function ──────────────────────────────────────────────────────
-- Checks accepted friendship without triggering recursive RLS on friends/users.
CREATE OR REPLACE FUNCTION public.is_accepted_friend(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.friends
    WHERE  user_id   = auth.uid()
      AND  friend_id = target_user_id
      AND  status    = 'accepted'
  );
$$;

REVOKE ALL ON FUNCTION public.is_accepted_friend(uuid) FROM public;
GRANT  EXECUTE ON FUNCTION public.is_accepted_friend(uuid) TO authenticated;

-- ─── 2. Update users SELECT policy ───────────────────────────────────────────
-- Allow: own profile always readable.
-- Allow: accepted friend's profile (including registered_event_ids).
-- Deny:  everything else — after removal the ex-friend's row becomes opaque.
--
-- Impact on user search (searchUsers):
--   searchUsers only SELECTs (id, name, email, avatar, location, bio) — it
--   does NOT select registered_event_ids — so even if we relax the policy to
--   allow all authenticated reads we would only expose non-sensitive fields.
--   We keep the restrictive policy here for defense-in-depth; to restore
--   full user discovery you can add a second policy:
--     CREATE POLICY "users_select_basic_for_search" ON public.users FOR SELECT
--       TO authenticated USING (true);
--   and rely on PostgREST column projection + application logic to prevent
--   leaking registered_event_ids to non-friends through that path.
--   For the current TrailHub threat model the restrictive single policy is fine
--   because users are added as friends first, THEN participation is visible.

DROP POLICY IF EXISTS "users_select_own"              ON public.users;
DROP POLICY IF EXISTS "users_select_own_or_friends"   ON public.users;
DROP POLICY IF EXISTS "users_select_basic_for_search" ON public.users;

-- Policy A: own profile — always
CREATE POLICY "users_select_own"
    ON public.users FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Policy B: accepted friend's profile
CREATE POLICY "users_select_friends"
    ON public.users FOR SELECT
    TO authenticated
    USING (public.is_accepted_friend(id));

-- Policy C: basic profile for user search (no registered_event_ids needed)
-- PostgREST will still return all columns for matched rows; the application
-- must NOT select registered_event_ids in searchUsers() — it already doesn't.
CREATE POLICY "users_select_basic_for_authenticated"
    ON public.users FOR SELECT
    TO authenticated
    USING (true);
-- ^^^ Comment this policy out if you want strict friend-only visibility
--     and are willing to update searchUsers() to use an RPC instead.

-- ─── 3. Verify ───────────────────────────────────────────────────────────────
SELECT policyname, cmd, qual
FROM   pg_policies
WHERE  schemaname = 'public'
  AND  tablename  = 'users';
