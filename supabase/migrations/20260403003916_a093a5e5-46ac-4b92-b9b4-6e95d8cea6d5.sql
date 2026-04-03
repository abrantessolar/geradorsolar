
DROP POLICY IF EXISTS "Anon update propostas viewed" ON public.propostas;
CREATE POLICY "Anon update propostas viewed" ON public.propostas
  FOR UPDATE TO anon
  USING (id IS NOT NULL)
  WITH CHECK (
    cliente = (SELECT p.cliente FROM public.propostas p WHERE p.id = propostas.id)
    AND status = (SELECT p.status FROM public.propostas p WHERE p.id = propostas.id)
    AND valor_total IS NOT DISTINCT FROM (SELECT p.valor_total FROM public.propostas p WHERE p.id = propostas.id)
  );
