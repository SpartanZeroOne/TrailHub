-- Migration 20: Make start_date nullable to support flexible/on-demand events
-- Flexible events have no fixed calendar date, so start_date and end_date must be optional.

ALTER TABLE events ALTER COLUMN start_date DROP NOT NULL;

-- Partial index: efficient lookup of flexible events for sorting/filtering
CREATE INDEX IF NOT EXISTS idx_events_flexible ON events (is_flexible_date) WHERE is_flexible_date = true;
