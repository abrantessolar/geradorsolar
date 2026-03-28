-- Allow admins to update all user profiles
CREATE POLICY "Admins update all profiles"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Allow admins to insert any profile
CREATE POLICY "Admins insert any profile"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- Allow admins to delete profiles
CREATE POLICY "Admins delete profiles"
ON public.user_profiles
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));