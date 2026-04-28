-- Migration 25: Event Registrations Table
-- Proper relational registration tracking (backfills from registered_friends array)

CREATE TABLE IF NOT EXISTS event_registrations (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  event_id       uuid        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  registered_at  timestamptz NOT NULL DEFAULT now(),
  status         text        NOT NULL DEFAULT 'registered',
  UNIQUE(user_id, event_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS er_event_id_idx       ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS er_user_id_idx        ON event_registrations(user_id);
CREATE INDEX IF NOT EXISTS er_registered_at_idx  ON event_registrations(registered_at DESC);
CREATE INDEX IF NOT EXISTS er_status_idx         ON event_registrations(status);

-- Backfill from registered_friends[] on events table
-- Only inserts rows where the friend UUID actually exists in users
INSERT INTO event_registrations (user_id, event_id, registered_at)
SELECT
  friend_id::uuid,
  e.id,
  COALESCE(e.updated_at, now())
FROM events e,
     LATERAL unnest(e.registered_friends) AS friend_id
WHERE e.registered_friends IS NOT NULL
  AND cardinality(e.registered_friends) > 0
  AND friend_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (SELECT 1 FROM users WHERE id = friend_id::uuid)
ON CONFLICT (user_id, event_id) DO NOTHING;

-- RLS
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- Users: full access to own registrations
CREATE POLICY "er_user_own" ON event_registrations
  FOR ALL
  USING    (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Organizers: read registrations for their events (aggregate data only, no PII via this policy)
CREATE POLICY "er_organizer_read" ON event_registrations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM events e
      JOIN users  u ON u.organizer_id = e.organizer_id
      WHERE e.id  = event_registrations.event_id
        AND u.id  = auth.uid()
        AND u.admin_role = 'organizer'
    )
  );

-- Super-admins: read all
CREATE POLICY "er_super_admin_read" ON event_registrations
  FOR SELECT
  USING (
    (SELECT admin_role FROM users WHERE id = auth.uid()) = 'super_admin'
  );

-- Super-admin: update user roles (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'users' AND policyname = 'super_admin_update_roles'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "super_admin_update_roles" ON users
      FOR UPDATE TO authenticated
      USING    ((SELECT admin_role FROM users WHERE id = auth.uid()) = 'super_admin')
      WITH CHECK ((SELECT admin_role FROM users WHERE id = auth.uid()) = 'super_admin')
    $p$;
  END IF;
END $$;
