-- Migration 24: Add admin roles to users table
-- Allows multi-tenant organizer admin panel

ALTER TABLE users ADD COLUMN IF NOT EXISTS organizer_id text REFERENCES organizers(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_role text DEFAULT 'user';

-- Index for fast role lookups
CREATE INDEX IF NOT EXISTS users_admin_role_idx ON users(admin_role);
CREATE INDEX IF NOT EXISTS users_organizer_id_idx ON users(organizer_id);

-- RLS: Organizers can only manage their own events
-- (super_admin bypass handled in application layer)
