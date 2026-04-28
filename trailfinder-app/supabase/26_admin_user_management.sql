-- Migration 26: Admin user management
-- Adds is_blocked, admin_note columns + RLS policies for super_admin

-- ── Columns ──────────────────────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked   boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_note   text    DEFAULT '';

CREATE INDEX IF NOT EXISTS users_is_blocked_idx ON users(is_blocked) WHERE is_blocked = true;

-- ── RLS: super_admin can UPDATE any user row ──────────────────────────────────
-- Drop first so re-running the migration is safe
DROP POLICY IF EXISTS "super_admin_update_any_user" ON users;
CREATE POLICY "super_admin_update_any_user"
  ON users FOR UPDATE
  TO authenticated
  USING (
    (SELECT admin_role FROM users WHERE id = auth.uid() LIMIT 1) = 'super_admin'
  )
  WITH CHECK (
    (SELECT admin_role FROM users WHERE id = auth.uid() LIMIT 1) = 'super_admin'
  );

-- ── RLS: super_admin can DELETE any user row ─────────────────────────────────
DROP POLICY IF EXISTS "super_admin_delete_any_user" ON users;
CREATE POLICY "super_admin_delete_any_user"
  ON users FOR DELETE
  TO authenticated
  USING (
    (SELECT admin_role FROM users WHERE id = auth.uid() LIMIT 1) = 'super_admin'
  );

-- ── RLS: super_admin can SELECT any user row ─────────────────────────────────
DROP POLICY IF EXISTS "super_admin_select_any_user" ON users;
CREATE POLICY "super_admin_select_any_user"
  ON users FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR (SELECT admin_role FROM users WHERE id = auth.uid() LIMIT 1) = 'super_admin'
  );