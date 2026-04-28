-- Migration 28: Allow super_admin to read all friend relationships
-- Without this the friends table's existing policy only allows users to see
-- their own rows (user_id = auth.uid() OR friend_id = auth.uid()), so the
-- admin panel cannot fetch friend counts or friend lists for other users.
-- Uses the is_super_admin() SECURITY DEFINER function from migration 27
-- to avoid the RLS recursion pattern.

DROP POLICY IF EXISTS "super_admin_select_all_friends" ON public.friends;
CREATE POLICY "super_admin_select_all_friends"
  ON public.friends FOR SELECT
  TO authenticated
  USING (public.is_super_admin());