-- Migration 22: Denormalized confirmed dates on users table for friend visibility
-- Mirrors the event_date_selections pattern so friends can read confirmed dates
-- without needing access to the flex_confirmed_dates table (RLS would block them).
-- Structure: { "event_id_string": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" } }

ALTER TABLE users ADD COLUMN IF NOT EXISTS flex_confirmed_dates jsonb DEFAULT '{}';
