
-- Fix: propostas anon update - already protected by trigger, but tighten policy
DROP POLICY IF EXISTS "Anon update propostas viewed" ON public.propostas;
CREATE POLICY "Anon update propostas viewed" ON public.propostas
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (
    cliente = (SELECT p.cliente FROM public.propostas p WHERE p.id = propostas.id)
    AND status = (SELECT p.status FROM public.propostas p WHERE p.id = propostas.id)
  );

-- Fix: leads anon insert - restrict to required fields only (this is for the public simulator)
DROP POLICY IF EXISTS "Anon insere leads" ON public.leads;
CREATE POLICY "Anon insere leads" ON public.leads
  FOR INSERT TO anon
  WITH CHECK (status = 'novo');

-- Fix: leads authenticated insert
DROP POLICY IF EXISTS "Autenticados inserem leads" ON public.leads;
CREATE POLICY "Autenticados inserem leads" ON public.leads
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fix: historico anon insert - keep but restrict to non-null proposta_id
DROP POLICY IF EXISTS "Anon insere histórico" ON public.historico_propostas;
CREATE POLICY "Anon insere histórico" ON public.historico_propostas
  FOR INSERT TO anon
  WITH CHECK (proposta_id IS NOT NULL AND acao IS NOT NULL);
