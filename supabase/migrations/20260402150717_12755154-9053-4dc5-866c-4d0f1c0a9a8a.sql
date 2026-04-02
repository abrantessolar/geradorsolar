
-- Trigger function to call sync-to-sheets edge function
CREATE OR REPLACE FUNCTION public.notify_sync_to_sheets()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload json;
BEGIN
  payload := json_build_object('project_id', NEW.id, 'sync_all', false);
  PERFORM net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1) || '/functions/v1/sync-to-sheets',
    headers := json_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1)
    )::jsonb,
    body := payload::jsonb
  );
  RETURN NEW;
END;
$$;

-- Create trigger on projetos table
DROP TRIGGER IF EXISTS trigger_sync_to_sheets ON public.projetos;
CREATE TRIGGER trigger_sync_to_sheets
  AFTER INSERT OR UPDATE ON public.projetos
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_sync_to_sheets();

-- SECURITY FIX 1: Restrict anon update on propostas to only visualizado_em
DROP TRIGGER IF EXISTS restrict_anon_proposal_update ON public.propostas;
CREATE TRIGGER restrict_anon_proposal_update
  BEFORE UPDATE ON public.propostas
  FOR EACH ROW
  WHEN (current_setting('request.jwt.claims', true)::json->>'role' = 'anon')
  EXECUTE FUNCTION public.restrict_anon_proposal_update();

-- SECURITY FIX 2: Prevent users from escalating their own role
DROP POLICY IF EXISTS "Users update own profile" ON public.user_profiles;
CREATE POLICY "Users update own profile" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND role = (SELECT role FROM public.user_profiles WHERE user_id = auth.uid()));

-- SECURITY FIX 3: Mark plaintext_passwords as resolved (column doesn't exist)
-- No action needed, senha_visivel column does not exist

-- SECURITY FIX 4: Restrict configuracoes SELECT to authenticated only
DROP POLICY IF EXISTS "Configurações visíveis para todos" ON public.configuracoes;
CREATE POLICY "Configurações visíveis para autenticados" ON public.configuracoes
  FOR SELECT TO authenticated
  USING (true);
