-- Migration 26: Super-Admin read access for users table + trigger fix
-- Without this policy, super admins can only see their own row and accepted friends
-- (due to migration 12 removing the USING(true) policy).

-- ─── 1. Super-Admin SELECT policy ────────────────────────────────────────────
DROP POLICY IF EXISTS "super_admin_select_all" ON public.users;
CREATE POLICY "super_admin_select_all"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    (SELECT admin_role FROM public.users WHERE id = auth.uid()) = 'super_admin'
  );

-- ─── 2. Recreate handle_new_user trigger ─────────────────────────────────────
-- Ensures every new auth.users row gets a corresponding public.users profile.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
