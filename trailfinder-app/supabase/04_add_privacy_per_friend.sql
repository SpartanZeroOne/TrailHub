-- ============================================================
-- Migration 04: Per-friend event-registration privacy
-- Run in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================
--
-- What this adds
-- --------------
-- friends.hide_my_events (boolean, default false)
--
--   Semantics: when the row (user_id = A, friend_id = B) has
--   hide_my_events = TRUE it means:
--     "A is hiding A's own event registrations from B."
--
--   So when B views A's friend-profile the app fetches
--   row (user_id=A, friend_id=B) and checks hide_my_events.
--   If true → show no events to B.
--
-- Why this beats localStorage
-- ----------------------------
-- The old implementation stored the toggle in the VIEWER'S
-- localStorage.  That only affected that one browser on that
-- one device; it was never sent to the database and was
-- therefore invisible to the other user's client.
-- Storing the flag in the DB (on the owner's friendship row)
-- makes the setting authoritative and cross-device.
--
-- RLS notes
-- ---------
-- The existing SELECT policy already allows both sides to read
-- a friendship row:
--   auth.uid() = user_id  OR  auth.uid() = friend_id
-- So B can already read A's row and see hide_my_events = true.
-- We only need to add an UPDATE policy so each user can toggle
-- their own hide_my_events flag.
-- ============================================================

-- 1. Add the column (idempotent)
ALTER TABLE public.friends
    ADD COLUMN IF NOT EXISTS hide_my_events boolean NOT NULL DEFAULT false;

-- 2. Allow users to update their OWN friendship rows
--    (needed to flip hide_my_events via the toggle button)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'friends'
          AND policyname = 'friends_update_own'
    ) THEN
        CREATE POLICY "friends_update_own"
            ON public.friends FOR UPDATE
            TO authenticated
            USING     (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END
$$;

-- 3. Backfill: nothing needed — default false = events visible (safe).

-- Verify
SELECT column_name, data_type, column_default
FROM   information_schema.columns
WHERE  table_schema = 'public'
  AND  table_name   = 'friends'
  AND  column_name  = 'hide_my_events';
