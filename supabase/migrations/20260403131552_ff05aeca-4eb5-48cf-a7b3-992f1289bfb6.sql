
-- Fornecedores de materiais
CREATE TABLE public.fornecedores_materiais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  contato TEXT,
  telefone TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fornecedores_materiais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestor vê fornecedores_materiais" ON public.fornecedores_materiais
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestor insere fornecedores_materiais" ON public.fornecedores_materiais
  FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND acesso_painel_gestor = true));
CREATE POLICY "Gestor atualiza fornecedores_materiais" ON public.fornecedores_materiais
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND acesso_painel_gestor = true));
CREATE POLICY "Gestor deleta fornecedores_materiais" ON public.fornecedores_materiais
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- Materiais
CREATE TABLE public.materiais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Outros',
  imagem_url TEXT,
  preco_unitario NUMERIC,
  fornecedor_id UUID REFERENCES public.fornecedores_materiais(id) ON DELETE SET NULL,
  unidade TEXT NOT NULL DEFAULT 'unidade',
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.materiais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestor vê materiais" ON public.materiais
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestor insere materiais" ON public.materiais
  FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND acesso_painel_gestor = true));
CREATE POLICY "Gestor atualiza materiais" ON public.materiais
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND acesso_painel_gestor = true));
CREATE POLICY "Gestor deleta materiais" ON public.materiais
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- Quantidades padrão por potência
CREATE TABLE public.materiais_quantidades_padrao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID NOT NULL REFERENCES public.materiais(id) ON DELETE CASCADE,
  potencia TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.materiais_quantidades_padrao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestor vê qtd padrao" ON public.materiais_quantidades_padrao
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestor insere qtd padrao" ON public.materiais_quantidades_padrao
  FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND acesso_painel_gestor = true));
CREATE POLICY "Gestor atualiza qtd padrao" ON public.materiais_quantidades_padrao
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND acesso_painel_gestor = true));
CREATE POLICY "Gestor deleta qtd padrao" ON public.materiais_quantidades_padrao
  FOR DELETE TO authenticated USING (is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND acesso_painel_gestor = true));

-- Cabos padrão
CREATE TABLE public.cabos_padrao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  potencia TEXT NOT NULL,
  tipo_cabo TEXT NOT NULL,
  observacao TEXT
);

ALTER TABLE public.cabos_padrao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestor vê cabos_padrao" ON public.cabos_padrao
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestor insere cabos_padrao" ON public.cabos_padrao
  FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND acesso_painel_gestor = true));
CREATE POLICY "Gestor atualiza cabos_padrao" ON public.cabos_padrao
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND acesso_painel_gestor = true));
CREATE POLICY "Gestor deleta cabos_padrao" ON public.cabos_padrao
  FOR DELETE TO authenticated USING (is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND acesso_painel_gestor = true));

-- Estoque
CREATE TABLE public.estoque (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID NOT NULL REFERENCES public.materiais(id) ON DELETE CASCADE,
  quantidade_atual INTEGER NOT NULL DEFAULT 0,
  quantidade_minima INTEGER,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.estoque ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestor vê estoque" ON public.estoque
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestor insere estoque" ON public.estoque
  FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND acesso_painel_gestor = true));
CREATE POLICY "Gestor atualiza estoque" ON public.estoque
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND acesso_painel_gestor = true));

-- Movimentações de estoque
CREATE TABLE public.movimentacoes_estoque (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID NOT NULL REFERENCES public.materiais(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida', 'retorno')),
  quantidade INTEGER NOT NULL,
  obra_id UUID REFERENCES public.projetos(id) ON DELETE SET NULL,
  observacao TEXT,
  usuario_id UUID NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestor vê movimentacoes" ON public.movimentacoes_estoque
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestor insere movimentacoes" ON public.movimentacoes_estoque
  FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND acesso_painel_gestor = true));

-- Lista de materiais por obra
CREATE TABLE public.lista_materiais_obra (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id UUID NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.materiais(id) ON DELETE CASCADE,
  quantidade_necessaria INTEGER NOT NULL DEFAULT 0,
  quantidade_separada INTEGER NOT NULL DEFAULT 0,
  separado BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.lista_materiais_obra ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestor vê lista_materiais_obra" ON public.lista_materiais_obra
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestor insere lista_materiais_obra" ON public.lista_materiais_obra
  FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND acesso_painel_gestor = true));
CREATE POLICY "Gestor atualiza lista_materiais_obra" ON public.lista_materiais_obra
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND acesso_painel_gestor = true));
CREATE POLICY "Gestor deleta lista_materiais_obra" ON public.lista_materiais_obra
  FOR DELETE TO authenticated USING (is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND acesso_painel_gestor = true));

-- Cabos por obra
CREATE TABLE public.cabos_obra (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id UUID NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  tipo_cabo TEXT NOT NULL,
  quantidade_metros NUMERIC NOT NULL DEFAULT 0,
  observacao TEXT
);

ALTER TABLE public.cabos_obra ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestor vê cabos_obra" ON public.cabos_obra
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestor insere cabos_obra" ON public.cabos_obra
  FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND acesso_painel_gestor = true));
CREATE POLICY "Gestor atualiza cabos_obra" ON public.cabos_obra
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND acesso_painel_gestor = true));
CREATE POLICY "Gestor deleta cabos_obra" ON public.cabos_obra
  FOR DELETE TO authenticated USING (is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND acesso_painel_gestor = true));

-- Adicionar campos na tabela projetos
ALTER TABLE public.projetos 
  ADD COLUMN IF NOT EXISTS wifi_nome TEXT,
  ADD COLUMN IF NOT EXISTS wifi_senha TEXT,
  ADD COLUMN IF NOT EXISTS nome_planta TEXT,
  ADD COLUMN IF NOT EXISTS cabo_usado TEXT;
