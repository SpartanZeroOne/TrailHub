-- Migration 23: MX-Track admin support
-- Adds event_id link to mx_tracks, admin write policies, and ensures status column exists.

-- Link mx_tracks back to the events stub record
ALTER TABLE public.mx_tracks
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_mx_tracks_event_id ON public.mx_tracks(event_id);

-- Allow authenticated users (admin) to insert/update/delete mx_tracks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'mx_tracks' AND policyname = 'Admin full access on mx_tracks'
  ) THEN
    CREATE POLICY "Admin full access on mx_tracks"
      ON public.mx_tracks FOR ALL
      TO authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Ensure mx_type column exists on events (it may already be there from earlier migrations)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS mx_type text;
