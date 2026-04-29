-- ─── Migration 29: Push Notification Infrastructure ──────────────────────────
-- push_subscriptions table, PostGIS RPC, pg_net DB triggers, pg_cron daily job

-- ─── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ─── Table: push_subscriptions ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint    text        NOT NULL,         -- Web Push endpoint URL (browser-specific)
  p256dh      text,                         -- Subscriber's EC public key (base64url)
  auth_key    text,                         -- Subscriber's auth secret (base64url)
  platform    text        NOT NULL DEFAULT 'web',  -- 'web' | 'android' | 'ios'
  device_token text,                        -- FCM/APNs token for native (future use)
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS ps_user_id_idx ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users manage their own subscriptions
CREATE POLICY "ps_user_own" ON push_subscriptions
  FOR ALL
  USING    (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── PostGIS helper: users within radius of an event ─────────────────────────
-- Returns user IDs who: (a) enabled new_events_region, (b) have stored GPS coords
CREATE OR REPLACE FUNCTION users_near_event(
  event_lat double precision,
  event_lng double precision,
  radius_meters double precision DEFAULT 200000
)
RETURNS TABLE(user_id uuid)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT u.id
  FROM   public.users u
  WHERE
    -- preference is enabled (null defaults to true)
    coalesce((u.notification_preferences->>'new_events_region')::boolean, true)
    AND (u.notification_preferences->>'user_lat') IS NOT NULL
    AND (u.notification_preferences->>'user_lng') IS NOT NULL
    AND ST_DWithin(
      ST_MakePoint(
        (u.notification_preferences->>'user_lng')::float8,
        (u.notification_preferences->>'user_lat')::float8
      )::geography,
      ST_MakePoint(event_lng, event_lat)::geography,
      radius_meters
    );
$$;

-- ─── Trigger: new event created → notify nearby users ────────────────────────
CREATE OR REPLACE FUNCTION trigger_notify_new_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only notify for upcoming events with coordinates
  IF NEW.status IS DISTINCT FROM 'upcoming' THEN RETURN NEW; END IF;
  IF NEW.coordinates IS NULL OR NEW.coordinates = 'null'::jsonb THEN RETURN NEW; END IF;

  PERFORM net.http_post(
    url     := 'https://hmdkiteqapiahwvdbdyh.supabase.co/functions/v1/notify-new-event',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer sb_publishable_AtNTl52QtqAFJHeWan5bHw_THkJC_yY'
    ),
    body    := jsonb_build_object(
      'event_id',       NEW.id,
      'event_name',     NEW.name,
      'event_location', NEW.location,
      'coordinates',    NEW.coordinates
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_event_insert_notify ON events;
CREATE TRIGGER on_event_insert_notify
  AFTER INSERT ON events
  FOR EACH ROW EXECUTE FUNCTION trigger_notify_new_event();

-- ─── Trigger: new registration → notify friends ───────────────────────────────
CREATE OR REPLACE FUNCTION trigger_notify_new_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM 'registered' THEN RETURN NEW; END IF;

  PERFORM net.http_post(
    url     := 'https://hmdkiteqapiahwvdbdyh.supabase.co/functions/v1/notify-friend-activity',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer sb_publishable_AtNTl52QtqAFJHeWan5bHw_THkJC_yY'
    ),
    body    := jsonb_build_object(
      'registrant_id', NEW.user_id::text,
      'event_id',      NEW.event_id::text
    )
  );
  RETURN NEW;
END;
$$;

-- Attach to event_registrations only if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'event_registrations'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS on_registration_insert_notify ON event_registrations';
    EXECUTE '
      CREATE TRIGGER on_registration_insert_notify
        AFTER INSERT ON event_registrations
        FOR EACH ROW EXECUTE FUNCTION trigger_notify_new_registration()
    ';
  END IF;
END $$;

-- ─── pg_cron: daily event reminders at 09:00 UTC ─────────────────────────────
DO $$
BEGIN
  -- Silently unschedule if exists, ignore if not
  BEGIN
    PERFORM cron.unschedule('trailhub-notify-reminders');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  PERFORM cron.schedule(
    'trailhub-notify-reminders',
    '0 9 * * *',
    $job$
      SELECT net.http_post(
        url     := 'https://hmdkiteqapiahwvdbdyh.supabase.co/functions/v1/notify-reminders',
        headers := '{"Content-Type":"application/json","Authorization":"Bearer sb_publishable_AtNTl52QtqAFJHeWan5bHw_THkJC_yY"}'::jsonb,
        body    := '{}'::jsonb
      );
    $job$
  );
EXCEPTION WHEN UNDEFINED_FUNCTION THEN
  RAISE NOTICE 'pg_cron not available — run manually: SELECT cron.schedule(...) after enabling pg_cron in Supabase Dashboard.';
END $$;
