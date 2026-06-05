-- Coluna de código de rastreamento nos projetos
ALTER TABLE public.projetos ADD COLUMN IF NOT EXISTS codigo_rastreamento text UNIQUE;

-- Tabela de etapas de rastreamento
CREATE TABLE public.rastreamento_obras (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id uuid NOT NULL,
  fluxo integer NOT NULL,
  etapa integer NOT NULL,
  concluido boolean NOT NULL DEFAULT false,
  data_conclusao timestamptz,
  visivel_cliente boolean NOT NULL DEFAULT true,
  observacao_interna text,
  campo_extra jsonb,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (projeto_id, fluxo, etapa)
);

CREATE INDEX idx_rastreamento_projeto ON public.rastreamento_obras (projeto_id);
CREATE INDEX idx_rastreamento_fluxo_etapa ON public.rastreamento_obras (fluxo, etapa);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rastreamento_obras TO authenticated;
GRANT ALL ON public.rastreamento_obras TO service_role;

ALTER TABLE public.rastreamento_obras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipe gerencia rastreamento"
  ON public.rastreamento_obras FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_rastreamento_obras_updated_at
  BEFORE UPDATE ON public.rastreamento_obras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de avaliações de clientes
CREATE TABLE public.avaliacoes_clientes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id uuid NOT NULL,
  nota integer NOT NULL,
  comentario text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_avaliacoes_projeto ON public.avaliacoes_clientes (projeto_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.avaliacoes_clientes TO authenticated;
GRANT ALL ON public.avaliacoes_clientes TO service_role;

ALTER TABLE public.avaliacoes_clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipe ve avaliacoes"
  ON public.avaliacoes_clientes FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER update_avaliacoes_clientes_updated_at
  BEFORE UPDATE ON public.avaliacoes_clientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();