-- Migration 11: Preferred language per user
--
-- Stores the user's last chosen UI language so it is restored on login
-- and synced across devices.
--
-- Valid values match the language codes used in OffroadEventsApp.jsx:
--   en, de, fr, nl
-- Default is 'en' (English) to match the new app default.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en';

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_preferred_language_valid;

ALTER TABLE public.users
  ADD CONSTRAINT users_preferred_language_valid
  CHECK (preferred_language IS NULL OR preferred_language IN ('en', 'de', 'fr', 'nl'));
