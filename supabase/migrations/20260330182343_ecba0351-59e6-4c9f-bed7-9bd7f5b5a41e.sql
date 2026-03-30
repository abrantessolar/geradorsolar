
-- Create helper function to check orcamentista role
CREATE OR REPLACE FUNCTION public.is_orcamentista(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = _user_id AND role = 'orcamentista'
  );
$$;

-- Drop old SELECT policy
DROP POLICY IF EXISTS "Users read own profile" ON public.user_profiles;

-- Create new SELECT policy that includes orcamentistas
CREATE POLICY "Users read own profile or admin/orcamentista read all"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR is_admin(auth.uid())
  OR is_orcamentista(auth.uid())
);
