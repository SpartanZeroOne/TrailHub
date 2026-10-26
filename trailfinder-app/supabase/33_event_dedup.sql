-- Migration 33: Duplicate-event prevention + mx_tracks.event_id fix

-- 1. Remove double-submit copies found on 2026-10-26 (oldest / organizer-linked row kept:
--    157 Tour Baie de Somme, 178 Rocco's Ranch). No registrations reference these ids.
DELETE FROM public.events WHERE id IN (158, 176, 177, 179, 180, 181, 182);

-- 2. One event per (name, start_date, organizer, category).
--    lower(btrim(name)) → case/whitespace-insensitive, matching the admin form check.
--    category is part of the key so one real event may be listed in two categories
--    (e.g. Erzbergrodeo: hard-enduro + festival).
--    NULLS NOT DISTINCT → also blocks copies of MX-tracks / flexible events (start_date NULL)
--    and events without organizer.
CREATE UNIQUE INDEX IF NOT EXISTS unique_event_idx
  ON public.events (lower(btrim(name)), start_date, organizer_id, category)
  NULLS NOT DISTINCT;

-- 3. Migration 23 never applied (it used uuid, events.id is integer). Without this column
--    every MX-track save failed after the event row was created → users retried → copies.
ALTER TABLE public.mx_tracks
  ADD COLUMN IF NOT EXISTS event_id integer REFERENCES public.events(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mx_tracks_event_id ON public.mx_tracks(event_id);
