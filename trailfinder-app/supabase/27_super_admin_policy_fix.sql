-- Migration 27: Fix super_admin_select_all RLS policy recursion
-- Problem: the USING clause queried public.users from within a public.users policy,
-- causing infinite recursion. Postgres silently reverted to other policies only
-- (own row + accepted friends), so non-friend users like Jeff were invisible.
-- Fix: SECURITY DEFINER function owned by postgres (has BYPASSRLS) avoids the loop.

-- ─── 1. Helper function ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND admin_role = 'super_admin'
  )
$$;

-- ─── 2. Replace the recursive policy ─────────────────────────────────────────
DROP POLICY IF EXISTS "super_admin_select_all" ON public.users;
CREATE POLICY "super_admin_select_all"
  ON public.users FOR SELECT
  TO authenticated
  USING (public.is_super_admin());
