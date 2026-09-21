CREATE TABLE IF NOT EXISTS public.propostas_hibridas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_proposta TEXT,
  codigo_acesso TEXT UNIQUE DEFAULT substr(md5(random()::text), 1, 10),
  cliente_nome TEXT NOT NULL,
  cliente_cidade TEXT,
  cliente_telefone TEXT,
  responsavel_nome TEXT,
  responsavel_telefone TEXT,
  responsavel_email TEXT,
  placa_id TEXT,
  placa_marca TEXT,
  placa_modelo TEXT,
  placa_potencia_wp NUMERIC,
  qtd_placas INTEGER,
  potencia_kwp NUMERIC,
  inversor_hibrido_id TEXT,
  inversor_hibrido_marca TEXT,
  inversor_hibrido_modelo TEXT,
  inversor_hibrido_imagem TEXT,
  inversor_hibrido_garantia_anos INTEGER,
  bateria_id TEXT,
  bateria_marca TEXT,
  bateria_modelo TEXT,
  bateria_capacidade_kwh NUMERIC,
  bateria_qtd INTEGER DEFAULT 1,
  bateria_imagem TEXT,
  bateria_garantia_anos INTEGER,
  consumo_diario_kwh NUMERIC,
  geracao_nublado_kwh_dia NUMERIC,
  geracao_tipico_kwh_dia NUMERIC,
  geracao_limpo_kwh_dia NUMERIC,
  autonomia_horas NUMERIC,
  preco_total NUMERIC,
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'enviada',
  visualizado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.propostas_hibridas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.propostas_hibridas TO authenticated;
GRANT ALL ON public.propostas_hibridas TO service_role;

ALTER TABLE public.propostas_hibridas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leitura publica propostas_hibridas"
  ON public.propostas_hibridas FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "escrita autenticada propostas_hibridas"
  ON public.propostas_hibridas FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE TRIGGER update_propostas_hibridas_updated_at
  BEFORE UPDATE ON public.propostas_hibridas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();