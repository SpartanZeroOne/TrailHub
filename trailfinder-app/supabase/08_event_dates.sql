-- ============================================================
-- Migration 08: Multi-Date Support for Skills-Camps
-- Run in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================
--
-- Adds a nullable JSONB column `event_dates` to the events table.
-- Used for Skills-Camps that occur multiple times per year (e.g. 6-7x).
--
-- Format (array of date objects):
-- [
--   {"start_date": "2026-06-14", "end_date": "2026-06-15", "status": "available"},
--   {"start_date": "2026-07-12", "end_date": "2026-07-13", "status": "few_left"},
--   {"start_date": "2026-08-09", "end_date": "2026-08-10", "status": "sold_out"},
--   {"start_date": "2026-09-06", "end_date": "2026-09-07"},
--   {"start_date": "2026-10-04", "end_date": "2026-10-05"},
--   {"start_date": "2026-11-08", "end_date": "2026-11-09"}
-- ]
--
-- status field is optional: "available" | "few_left" | "sold_out"
-- If status is omitted/null the frontend hides the status badge.
--
-- Existing start_date / end_date columns remain unchanged for all
-- other event categories (Trail, Rallyes, Festivals, etc.).
--
-- This migration is idempotent: safe to run multiple times.
-- ============================================================

ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS event_dates jsonb DEFAULT NULL;

COMMENT ON COLUMN public.events.event_dates IS
  'Array of {start_date, end_date, status?} objects for multi-date events (e.g. Skills-Camps). '
  'status: "available" | "few_left" | "sold_out". Null = single-date event (use start_date/end_date).';

-- ─── Verify ───────────────────────────────────────────────────────────────────
SELECT '=== events.event_dates column ===' AS info;
SELECT column_name, data_type, column_default, is_nullable
FROM   information_schema.columns
WHERE  table_schema = 'public'
  AND  table_name   = 'events'
  AND  column_name  = 'event_dates';