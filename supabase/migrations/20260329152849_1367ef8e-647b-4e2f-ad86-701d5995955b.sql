
CREATE TABLE public.historico_propostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id uuid NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
  acao text NOT NULL,
  usuario_id uuid,
  detalhes jsonb DEFAULT '{}'::jsonb,
  criado_em timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.historico_propostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Histórico visível para autenticados" ON public.historico_propostas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Histórico visível para anon" ON public.historico_propostas
  FOR SELECT TO anon USING (true);

CREATE POLICY "Autenticados inserem histórico" ON public.historico_propostas
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Anon insere histórico" ON public.historico_propostas
  FOR INSERT TO anon WITH CHECK (true);

CREATE INDEX idx_historico_proposta_id ON public.historico_propostas(proposta_id);
