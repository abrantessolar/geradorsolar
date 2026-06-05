-- 1. usuario_id em rastreamento_obras
ALTER TABLE public.rastreamento_obras ADD COLUMN IF NOT EXISTS usuario_id uuid;

-- 2. Tabela de histórico
CREATE TABLE public.rastreamento_historico (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id uuid NOT NULL,
  fluxo integer NOT NULL,
  etapa integer NOT NULL,
  acao text NOT NULL,
  usuario_id uuid,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rastreamento_hist_projeto ON public.rastreamento_historico (projeto_id);

GRANT SELECT, INSERT ON public.rastreamento_historico TO authenticated;
GRANT ALL ON public.rastreamento_historico TO service_role;

ALTER TABLE public.rastreamento_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipe gerencia historico rastreamento"
  ON public.rastreamento_historico FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

-- 3. Seed automático das etapas ao criar projeto
CREATE OR REPLACE FUNCTION public.seed_rastreamento_obras()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.rastreamento_obras (projeto_id, fluxo, etapa, concluido, visivel_cliente)
  VALUES
    (NEW.id,1,1,false,true),(NEW.id,1,2,false,true),(NEW.id,1,3,false,true),
    (NEW.id,2,1,false,true),(NEW.id,2,2,false,true),(NEW.id,2,3,false,true),(NEW.id,2,4,false,true),
    (NEW.id,3,1,false,true),(NEW.id,3,2,false,true),(NEW.id,3,3,false,true),(NEW.id,3,4,false,true)
  ON CONFLICT (projeto_id, fluxo, etapa) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_rastreamento ON public.projetos;
CREATE TRIGGER trg_seed_rastreamento
  AFTER INSERT ON public.projetos
  FOR EACH ROW EXECUTE FUNCTION public.seed_rastreamento_obras();