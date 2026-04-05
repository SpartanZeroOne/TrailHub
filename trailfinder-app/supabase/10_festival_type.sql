-- Migration 10: Festival Type field for Offroad-Festivals
--
-- Adds festival_type text column to events table.
-- Only relevant for events with category = 'offroad-festivals'.
-- NULL = kein spezifischer Typ gesetzt (entspricht Filter "Alle").
--
-- Valid values (matching festivalTypeOptions in OffroadEventsApp.jsx):
--   Community-Treffen
--   Hersteller-Event
--   Demo-/Test-Event
--   Rennen integriert
--   Messe/Expo
--   Adventure-Festival
--   Hard-Enduro-Festival

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS festival_type text DEFAULT NULL;

-- Drop old constraint if it exists (e.g. from a prior run with short-key values)
ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_festival_type_valid;

-- Add constraint with exact German display-label values
ALTER TABLE public.events
  ADD CONSTRAINT events_festival_type_valid
  CHECK (festival_type IS NULL OR festival_type IN (
    'Community-Treffen',
    'Hersteller-Event',
    'Demo-/Test-Event',
    'Rennen integriert',
    'Messe/Expo',
    'Adventure-Festival',
    'Hard-Enduro-Festival'
  ));
