CREATE TABLE IF NOT EXISTS public.equipamentos_simulador_hibrido (
  id TEXT PRIMARY KEY,
  categoria TEXT NOT NULL,
  nome TEXT NOT NULL,
  potencia_kw NUMERIC NOT NULL,
  janela JSONB NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('fixo', 'tempo_ajustavel')),
  fator_servico NUMERIC,
  horas_dia NUMERIC,
  unidade_tempo TEXT CHECK (unidade_tempo IN ('h', 'min')),
  tempo_padrao NUMERIC,
  km_dia NUMERIC,
  selecionado_padrao BOOLEAN NOT NULL DEFAULT false,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.equipamentos_simulador_hibrido TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipamentos_simulador_hibrido TO authenticated;
GRANT ALL ON public.equipamentos_simulador_hibrido TO service_role;

ALTER TABLE public.equipamentos_simulador_hibrido ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leitura publica equipamentos_simulador_hibrido"
  ON public.equipamentos_simulador_hibrido
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "gestao painel equipamentos_simulador_hibrido"
  ON public.equipamentos_simulador_hibrido
  FOR ALL
  TO authenticated
  USING (public.has_panel_access(auth.uid()))
  WITH CHECK (public.has_panel_access(auth.uid()));