
-- Add acesso_painel_gestor to user_profiles
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS acesso_painel_gestor boolean NOT NULL DEFAULT false;

-- Equipamentos Placas
CREATE TABLE public.equipamentos_placas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marca text NOT NULL,
  modelo text NOT NULL,
  potencia_wp numeric NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.equipamentos_placas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Placas visíveis para autenticados" ON public.equipamentos_placas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins inserem placas" ON public.equipamentos_placas FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins atualizam placas" ON public.equipamentos_placas FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins deletam placas" ON public.equipamentos_placas FOR DELETE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Gestor insere placas" ON public.equipamentos_placas FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND acesso_painel_gestor = true)
);
CREATE POLICY "Gestor atualiza placas" ON public.equipamentos_placas FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND acesso_painel_gestor = true)
);

-- Equipamentos Inversores
CREATE TABLE public.equipamentos_inversores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marca text NOT NULL,
  modelo text NOT NULL,
  potencia_kw numeric NOT NULL,
  tipo text NOT NULL DEFAULT 'String',
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.equipamentos_inversores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inversores visíveis para autenticados" ON public.equipamentos_inversores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins inserem inversores" ON public.equipamentos_inversores FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins atualizam inversores" ON public.equipamentos_inversores FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins deletam inversores" ON public.equipamentos_inversores FOR DELETE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Gestor insere inversores" ON public.equipamentos_inversores FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND acesso_painel_gestor = true)
);
CREATE POLICY "Gestor atualiza inversores" ON public.equipamentos_inversores FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND acesso_painel_gestor = true)
);

-- Projetos
CREATE TABLE public.projetos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  usuario_id uuid NOT NULL,
  tipo_pessoa text NOT NULL DEFAULT 'PF',
  nome_completo text,
  cpf text,
  data_nascimento date,
  razao_social text,
  cnpj text,
  nome_representante text,
  cpf_representante text,
  endereco_completo text,
  cep text,
  bairro text,
  cidade text,
  estado text,
  concessionaria text NOT NULL DEFAULT 'Elektro',
  placa_id uuid REFERENCES public.equipamentos_placas(id),
  qtd_placas integer,
  inversor_id uuid REFERENCES public.equipamentos_inversores(id),
  qtd_inversores integer,
  geracao_estimada_kwh numeric,
  preco_venda numeric,
  forma_pagamento text,
  unidade_geradora_cep text,
  unidade_geradora_endereco text,
  unidade_geradora_codigo_uc text,
  unidade_geradora_padrao text,
  unidade_beneficiaria1_cep text,
  unidade_beneficiaria1_endereco text,
  unidade_beneficiaria1_codigo_uc text,
  unidade_beneficiaria1_percentual numeric,
  unidade_beneficiaria2_cep text,
  unidade_beneficiaria2_endereco text,
  unidade_beneficiaria2_codigo_uc text,
  unidade_beneficiaria2_percentual numeric,
  data_fechamento date,
  data_instalacao date,
  local_entrega text DEFAULT 'Casa do Cliente',
  objecoes text,
  status text NOT NULL DEFAULT 'Vendido',
  sheets_synced_at timestamptz
);

ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestor vê projetos" ON public.projetos FOR SELECT TO authenticated USING (
  is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND acesso_painel_gestor = true)
);
CREATE POLICY "Gestor insere projetos" ON public.projetos FOR INSERT TO authenticated WITH CHECK (
  is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND acesso_painel_gestor = true)
);
CREATE POLICY "Gestor atualiza projetos" ON public.projetos FOR UPDATE TO authenticated USING (
  is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND acesso_painel_gestor = true)
);
CREATE POLICY "Admins deletam projetos" ON public.projetos FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- Modelos de documentos
CREATE TABLE public.modelos_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL UNIQUE,
  conteudo_html text NOT NULL DEFAULT '',
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.modelos_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Modelos visíveis para autenticados" ON public.modelos_documentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gerenciam modelos" ON public.modelos_documentos FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Gestor gerencia modelos" ON public.modelos_documentos FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND acesso_painel_gestor = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND acesso_painel_gestor = true)
);

-- Trigger for updated_at on projetos
CREATE TRIGGER update_projetos_updated_at BEFORE UPDATE ON public.projetos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default document models
INSERT INTO public.modelos_documentos (tipo, conteudo_html) VALUES
  ('contrato', '<h1>Contrato de Instalação de Sistema Fotovoltaico</h1><p>Contratante: {{nome_completo}}, CPF: {{cpf}}, residente em {{endereco}}...</p>'),
  ('procuracao_elektro_pf', '<h1>Procuração - Elektro (Pessoa Física)</h1><p>Outorgante: {{nome_completo}}, CPF: {{cpf}}...</p>'),
  ('procuracao_elektro_pj', '<h1>Procuração - Elektro (Pessoa Jurídica)</h1><p>Outorgante: {{razao_social}}, CNPJ: {{cnpj}}...</p>'),
  ('procuracao_energisa', '<h1>Procuração - Energisa</h1><p>Outorgante: {{nome_completo}}, CPF: {{cpf}}...</p>'),
  ('procuracao_copel', '<h1>Procuração - COPEL</h1><p>Outorgante: {{nome_completo}}, CPF: {{cpf}}...</p>')
ON CONFLICT (tipo) DO NOTHING;
