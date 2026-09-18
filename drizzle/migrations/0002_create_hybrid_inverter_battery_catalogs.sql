CREATE TABLE public.equipamentos_inversor_hibrido (
  id TEXT PRIMARY KEY,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  miniatura_url TEXT,
  potencia_nominal_kw NUMERIC NOT NULL,
  potencia_pico_kw NUMERIC,
  potencia_fv_max_kwp NUMERIC,
  tipo_tensao_bateria TEXT NOT NULL CHECK (tipo_tensao_bateria IN ('low_voltage', 'high_voltage')),
  tensao_bateria_v NUMERIC,
  tensao_saida TEXT NOT NULL CHECK (tensao_saida IN ('127', '220', 'bivolt')),
  num_mppt INTEGER,
  mppt_tensao_min_v NUMERIC,
  mppt_tensao_max_v NUMERIC,
  corrente_max_carga_bateria_a NUMERIC,
  protocolo_comunicacao TEXT,
  baterias_compativeis TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  garantia_anos INTEGER
);

GRANT SELECT ON public.equipamentos_inversor_hibrido TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipamentos_inversor_hibrido TO authenticated;
GRANT ALL ON public.equipamentos_inversor_hibrido TO service_role;

ALTER TABLE public.equipamentos_inversor_hibrido ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leitura publica equipamentos_inversor_hibrido"
  ON public.equipamentos_inversor_hibrido
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "painel gerencia equipamentos_inversor_hibrido"
  ON public.equipamentos_inversor_hibrido
  FOR ALL
  TO authenticated
  USING (public.has_panel_access(auth.uid()))
  WITH CHECK (public.has_panel_access(auth.uid()));

CREATE TRIGGER update_equipamentos_inversor_hibrido_updated_at
  BEFORE UPDATE ON public.equipamentos_inversor_hibrido
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.equipamentos_bateria_hibrida (
  id TEXT PRIMARY KEY,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  miniatura_url TEXT,
  capacidade_kwh NUMERIC NOT NULL,
  tipo_tensao TEXT NOT NULL CHECK (tipo_tensao IN ('low_voltage', 'high_voltage')),
  tensao_nominal_v NUMERIC,
  corrente_max_descarga_continua_a NUMERIC,
  corrente_max_descarga_pico_a NUMERIC,
  dod_pct NUMERIC NOT NULL DEFAULT 90,
  quimica TEXT,
  ciclos_vida INTEGER,
  empilhavel BOOLEAN NOT NULL DEFAULT false,
  max_unidades_paralelo INTEGER,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  garantia_anos INTEGER
);

GRANT SELECT ON public.equipamentos_bateria_hibrida TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipamentos_bateria_hibrida TO authenticated;
GRANT ALL ON public.equipamentos_bateria_hibrida TO service_role;

ALTER TABLE public.equipamentos_bateria_hibrida ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leitura publica equipamentos_bateria_hibrida"
  ON public.equipamentos_bateria_hibrida
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "painel gerencia equipamentos_bateria_hibrida"
  ON public.equipamentos_bateria_hibrida
  FOR ALL
  TO authenticated
  USING (public.has_panel_access(auth.uid()))
  WITH CHECK (public.has_panel_access(auth.uid()));

CREATE TRIGGER update_equipamentos_bateria_hibrida_updated_at
  BEFORE UPDATE ON public.equipamentos_bateria_hibrida
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();