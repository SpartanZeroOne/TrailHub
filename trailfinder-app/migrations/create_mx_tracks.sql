CREATE TABLE IF NOT EXISTS public.mx_tracks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  location text NOT NULL,
  coordinates jsonb NOT NULL DEFAULT '{}',
  organizer_id text,
  status text NOT NULL DEFAULT 'active',
  season_start text,
  season_end text,
  open_days jsonb DEFAULT '[]',
  opening_hours jsonb DEFAULT '{}',
  difficulty integer CHECK (difficulty BETWEEN 1 AND 3),
  beginner_friendly boolean DEFAULT false,
  price_info text,
  price_value numeric,
  image text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.mx_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on mx_tracks" ON public.mx_tracks FOR SELECT USING (true);
