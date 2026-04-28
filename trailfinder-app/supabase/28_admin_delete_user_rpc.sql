-- Migration 28: Server-side user deletion via SECURITY DEFINER RPC
-- Runs as the postgres superuser (BYPASSRLS, full access to auth.users).
-- The caller only needs a valid JWT + super_admin role in public.users.
-- Deleting auth.users cascades to public.users via ON DELETE CASCADE.

CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden: super_admin only';
  END IF;

  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- Only authenticated users can call this; the body enforces super_admin check.
REVOKE ALL ON FUNCTION public.admin_delete_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
