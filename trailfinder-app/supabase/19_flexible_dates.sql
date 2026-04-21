-- Migration 19: Flexible / On-Demand booking support
-- Allows events without fixed calendar dates that require direct arrangement.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS is_flexible_date boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS booking_type     text    DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS flexible_date_info text;

-- Enforce allowed booking_type values
ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_booking_type_check;

ALTER TABLE events
  ADD CONSTRAINT events_booking_type_check
  CHECK (booking_type IN ('fixed', 'flexible', 'on_demand'));
