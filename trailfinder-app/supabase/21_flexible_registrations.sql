-- Migration 21: Flexible event confirmed-date registrations
-- Stores user-confirmed start/end dates for flexible (on-demand) event registrations.
-- event_id is integer (matches events.id), no FK to allow soft-delete resilience.

CREATE TABLE IF NOT EXISTS flexible_registrations (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_id         integer NOT NULL,
  confirmed_start  date,
  confirmed_end    date,
  created_at       timestamptz DEFAULT now(),
  UNIQUE (user_id, event_id)
);

ALTER TABLE flexible_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own flexible registrations"
  ON flexible_registrations FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
