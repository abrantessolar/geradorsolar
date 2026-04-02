
-- Re-add public SELECT for configuracoes since the public simulator needs it
CREATE POLICY "Configurações visíveis para anon" ON public.configuracoes
  FOR SELECT TO anon
  USING (true);
