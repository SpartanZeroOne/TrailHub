-- ============================================================
-- Migration 06: Regression Fix – Restore friend list & add-friend
-- Run in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================
--
-- Root cause
-- ----------
-- The privacy update (migrations 04+05) added friends.hide_my_events
-- and changed users RLS. If migration 04 was not applied before
-- the frontend was deployed, fetchFriendsWithStatus() would fail
-- because it selected `hide_my_events` which didn't exist yet.
-- loadFriends() caught the error silently → friends = [].
--
-- Additionally, is_accepted_friend() references friends.status.
-- If that column didn't exist in the DB (not in original schema),
-- the users_select_friends RLS policy would error on every user
-- query — blocking all embedded joins from the friends table.
--
-- This migration is fully idempotent: safe to run even if
-- migrations 04 and 05 were already applied correctly.
-- ============================================================


-- ─── 1. friends.status ──────────────────────────────────────────────────────
-- The original 01_schema.sql omitted this column.
-- sendFriendRequest() inserts status='pending'; acceptFriendRequest()
-- updates to 'accepted'. Add the column and backfill existing rows.

ALTER TABLE public.friends
    ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'accepted';

-- Backfill: rows inserted before this column existed already defaulted
-- to 'accepted' (they were all accepted bilateral friendships).
-- This UPDATE is a no-op if status is already set.
UPDATE public.friends
SET    status = 'accepted'
WHERE  status IS NULL OR status NOT IN ('pending', 'accepted');


-- ─── 2. friends.hide_my_events ───────────────────────────────────────────────
-- Privacy toggle from migration 04. Idempotent: ADD COLUMN IF NOT EXISTS.

ALTER TABLE public.friends
    ADD COLUMN IF NOT EXISTS hide_my_events boolean NOT NULL DEFAULT false;


-- ─── 3. friends RLS – full clean reset ──────────────────────────────────────
-- Drop all existing friends policies and recreate them cleanly.
-- This ensures no stale or conflicting policies remain.

DROP POLICY IF EXISTS "friends_select_own"   ON public.friends;
DROP POLICY IF EXISTS "friends_insert_own"   ON public.friends;
DROP POLICY IF EXISTS "friends_update_own"   ON public.friends;
DROP POLICY IF EXISTS "friends_delete_own"   ON public.friends;

-- SELECT: either party of a friendship can read their shared rows.
CREATE POLICY "friends_select_own"
    ON public.friends FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- INSERT: only the initiating user (user_id) can create a row.
CREATE POLICY "friends_insert_own"
    ON public.friends FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- UPDATE: only the row owner (user_id) can update their own flags
--         (e.g. hide_my_events toggle).
CREATE POLICY "friends_update_own"
    ON public.friends FOR UPDATE
    TO authenticated
    USING     (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- DELETE: either party can delete — needed for bidirectional removal.
--         The remove_friendship() RPC does a broader delete but this
--         policy covers direct client deletes.
CREATE POLICY "friends_delete_own"
    ON public.friends FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id OR auth.uid() = friend_id);


-- ─── 4. users RLS – clean reset ─────────────────────────────────────────────
-- The users table must be readable by all authenticated users so that:
--   a) The friends list join (users!friends_friend_id_fkey) returns data.
--   b) User search (searchUsers) works.
--   c) Profile pages load for both own and friend profiles.
--
-- Privacy is enforced in application logic (registered_event_ids is
-- filtered by hide_my_events + privacy_registration_visibility in JS).
-- Relying solely on RLS for event-registration privacy would require
-- column-level security which PostgREST doesn't support cleanly.

DROP POLICY IF EXISTS "users_select_own"                    ON public.users;
DROP POLICY IF EXISTS "users_select_friends"                 ON public.users;
DROP POLICY IF EXISTS "users_select_own_or_friends"          ON public.users;
DROP POLICY IF EXISTS "users_select_basic_for_search"        ON public.users;
DROP POLICY IF EXISTS "users_select_basic_for_authenticated" ON public.users;
DROP POLICY IF EXISTS "users_select_authenticated"           ON public.users;

-- Policy A: own profile — unconditional (needed for auth flows)
CREATE POLICY "users_select_own"
    ON public.users FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Policy B: all other authenticated users — needed for friend list joins
--           and user search. Privacy for registered_event_ids is handled
--           in the JS layer, not at the DB layer.
CREATE POLICY "users_select_authenticated"
    ON public.users FOR SELECT
    TO authenticated
    USING (true);

-- Keep existing INSERT / UPDATE policies intact (from 01_schema.sql).
-- If they were somehow dropped, recreate them:
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own"
    ON public.users FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own"
    ON public.users FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);


-- ─── 5. is_accepted_friend() helper ─────────────────────────────────────────
-- Recreate idempotently. Used in advanced RLS scenarios. Now that
-- friends.status is guaranteed to exist this function is safe to call.

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

REVOKE ALL   ON FUNCTION public.is_accepted_friend(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_accepted_friend(uuid) TO authenticated;


-- ─── 6. remove_friendship() RPC ─────────────────────────────────────────────
-- Recreate idempotently to ensure it's consistent with the status column.

CREATE OR REPLACE FUNCTION public.remove_friendship(
    p_user_id   uuid,
    p_friend_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() != p_user_id AND auth.uid() != p_friend_id THEN
        RAISE EXCEPTION 'Not authorized to remove this friendship'
            USING errcode = 'insufficient_privilege';
    END IF;

    DELETE FROM public.friends
    WHERE (user_id = p_user_id  AND friend_id = p_friend_id)
       OR (user_id = p_friend_id AND friend_id = p_user_id);
END;
$$;

REVOKE ALL   ON FUNCTION public.remove_friendship(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.remove_friendship(uuid, uuid) TO authenticated;


-- ─── 7. Verify ───────────────────────────────────────────────────────────────
SELECT '=== friends columns ===' AS info;
SELECT column_name, data_type, column_default, is_nullable
FROM   information_schema.columns
WHERE  table_schema = 'public' AND table_name = 'friends'
ORDER  BY ordinal_position;

SELECT '=== friends RLS policies ===' AS info;
SELECT policyname, cmd, roles, qual, with_check
FROM   pg_policies
WHERE  schemaname = 'public' AND tablename = 'friends'
ORDER  BY policyname;

SELECT '=== users RLS policies ===' AS info;
SELECT policyname, cmd, roles, qual
FROM   pg_policies
WHERE  schemaname = 'public' AND tablename = 'users'
ORDER  BY policyname;

SELECT '=== Row counts ===' AS info;
SELECT 'friends' AS tbl, count(*) AS rows FROM public.friends
UNION ALL
SELECT 'users',          count(*)         FROM public.users;