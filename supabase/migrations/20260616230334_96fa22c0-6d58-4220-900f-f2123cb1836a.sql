-- Helper: management/panel access (admins, gestores, orcamentistas, or users with panel flag)
CREATE OR REPLACE FUNCTION public.has_panel_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = _user_id
      AND (acesso_painel_gestor = true OR role IN ('admin','gestor','orcamentista'))
  ) OR public.is_admin(_user_id)
$$;

-- ── vendedores: remove public SELECT, restrict to authenticated ──
DROP POLICY IF EXISTS "Vendedores visíveis para todos" ON public.vendedores;
CREATE POLICY "Vendedores visíveis para autenticados" ON public.vendedores
  FOR SELECT TO authenticated USING (true);

-- ── historico_propostas: remove anon SELECT (anon INSERT for view tracking stays) ──
DROP POLICY IF EXISTS "Histórico visível para anon" ON public.historico_propostas;

-- ── whatsapp_templates: remove public read, restrict writes to panel staff ──
DROP POLICY IF EXISTS "Anyone can read whatsapp_templates" ON public.whatsapp_templates;
DROP POLICY IF EXISTS "Authenticated manage whatsapp_templates" ON public.whatsapp_templates;
CREATE POLICY "Staff read whatsapp_templates" ON public.whatsapp_templates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage whatsapp_templates" ON public.whatsapp_templates
  FOR ALL TO authenticated
  USING (public.has_panel_access(auth.uid()))
  WITH CHECK (public.has_panel_access(auth.uid()));

-- ── rastreamento_obras: restrict to panel staff ──
DROP POLICY IF EXISTS "Equipe gerencia rastreamento" ON public.rastreamento_obras;
CREATE POLICY "Staff gerencia rastreamento" ON public.rastreamento_obras
  FOR ALL TO authenticated
  USING (public.has_panel_access(auth.uid()))
  WITH CHECK (public.has_panel_access(auth.uid()));

-- ── rastreamento_historico: restrict to panel staff ──
DROP POLICY IF EXISTS "Equipe gerencia historico rastreamento" ON public.rastreamento_historico;
CREATE POLICY "Staff gerencia historico rastreamento" ON public.rastreamento_historico
  FOR ALL TO authenticated
  USING (public.has_panel_access(auth.uid()))
  WITH CHECK (public.has_panel_access(auth.uid()));

-- ── tarefas_posvenda: restrict to panel staff ──
DROP POLICY IF EXISTS "Authenticated manage tarefas_posvenda" ON public.tarefas_posvenda;
CREATE POLICY "Staff manage tarefas_posvenda" ON public.tarefas_posvenda
  FOR ALL TO authenticated
  USING (public.has_panel_access(auth.uid()))
  WITH CHECK (public.has_panel_access(auth.uid()));

-- ── leads: restrict SELECT to panel staff (was readable by every authenticated user) ──
DROP POLICY IF EXISTS "Autenticados leem leads" ON public.leads;
CREATE POLICY "Staff leem leads" ON public.leads
  FOR SELECT TO authenticated
  USING (public.has_panel_access(auth.uid()));
