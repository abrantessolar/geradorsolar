-- Proposta de Placa Avulsa — tabela totalmente separada de "propostas"
-- (ongrid) e de "propostas_hibridas". Nenhum código do fluxo ongrid lê
-- ou escreve aqui, e vice-versa. Isolamento de propósito.
--
-- Segurança desde o início: leitura pública só via função com código de
-- acesso, nunca SELECT direto na tabela.

CREATE TABLE IF NOT EXISTS public.propostas_placa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_proposta TEXT,
  codigo_acesso TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),

  cliente_nome TEXT NOT NULL,
  cliente_cidade TEXT,
  cliente_uf TEXT,
  cliente_telefone TEXT,

  responsavel_nome TEXT,
  responsavel_telefone TEXT,

  placa_id TEXT,
  placa_marca TEXT,
  placa_modelo TEXT,
  placa_potencia_wp NUMERIC,
  placa_imagem TEXT,
  qtd_placas INTEGER NOT NULL,
  potencia_kwp NUMERIC,

  geracao_mensal_kwh JSONB,
  geracao_media_kwh NUMERIC,

  preco_avista NUMERIC NOT NULL,
  cartao_parcelas JSONB,

  observacoes TEXT,

  status TEXT NOT NULL DEFAULT 'enviada',
  visualizado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.propostas_placa TO authenticated;
GRANT ALL ON public.propostas_placa TO service_role;

ALTER TABLE public.propostas_placa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipe gerencia propostas_placa"
  ON public.propostas_placa FOR ALL TO authenticated
  USING (public.has_panel_access(auth.uid()))
  WITH CHECK (public.has_panel_access(auth.uid()));

CREATE OR REPLACE FUNCTION public.get_proposta_placa_public(_codigo text)
RETURNS SETOF public.propostas_placa
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.*
  FROM public.propostas_placa p
  WHERE p.codigo_acesso = _codigo
    AND length(_codigo) >= 10
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_proposta_placa_public(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_proposta_placa_public(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.marcar_proposta_placa_visualizada(_codigo text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _codigo IS NULL OR length(_codigo) < 10 THEN
    RAISE EXCEPTION 'Código inválido';
  END IF;
  UPDATE public.propostas_placa
     SET visualizado_em = COALESCE(visualizado_em, now()),
         status = CASE WHEN status = 'enviada' THEN 'visualizada' ELSE status END
   WHERE codigo_acesso = _codigo;
END;
$$;
REVOKE ALL ON FUNCTION public.marcar_proposta_placa_visualizada(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.marcar_proposta_placa_visualizada(text) TO anon, authenticated;