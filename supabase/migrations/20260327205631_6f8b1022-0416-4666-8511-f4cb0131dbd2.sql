
-- Create user_profiles table for role-based access
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  nome text NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'vendedor',
  senha_visivel text,
  ativo boolean NOT NULL DEFAULT true,
  ultimo_acesso timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check admin role
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = _user_id AND role = 'admin'
  );
$$;

-- RLS policies for user_profiles
CREATE POLICY "Authenticated read profiles"
  ON public.user_profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users update own profile"
  ON public.user_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own profile"
  ON public.user_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Anon can update propostas (for marking as viewed from public link)
CREATE POLICY "Anon update propostas viewed"
  ON public.propostas FOR UPDATE TO anon USING (true);

-- Add criador_user_id to track who created each proposal
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS criador_user_id uuid;
