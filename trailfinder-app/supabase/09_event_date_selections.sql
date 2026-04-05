-- Migration 09: User-specific event date selections
--
-- Adds event_date_selections jsonb column to users table.
-- Stores a map of { event_id_string → selected_date_index }
-- Example: { "42": 1, "17": 0 }
--
-- Why jsonb on users (not a separate table):
--   Consistent with how registered_event_ids / favorite_event_ids are stored.
--   No joins needed for reads; single upsert for writes.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS event_date_selections jsonb DEFAULT '{}'::jsonb;
