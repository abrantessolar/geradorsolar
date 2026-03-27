
-- Create timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 1. VENDEDORES
CREATE TABLE public.vendedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vendedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendedores visíveis para todos" ON public.vendedores
  FOR SELECT USING (true);
CREATE POLICY "Apenas admins inserem vendedores" ON public.vendedores
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Apenas admins atualizam vendedores" ON public.vendedores
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Apenas admins deletam vendedores" ON public.vendedores
  FOR DELETE TO authenticated USING (true);

-- 2. PROPOSTAS
CREATE TABLE public.propostas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente TEXT NOT NULL,
  vendedor_id UUID REFERENCES public.vendedores(id),
  cidade TEXT,
  uf TEXT,
  consumo_mensal NUMERIC,
  linha TEXT,
  num_placas INTEGER,
  potencia_kwp NUMERIC,
  valor_total NUMERIC,
  cet NUMERIC,
  status TEXT NOT NULL DEFAULT 'enviada',
  dados_completos JSONB,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Propostas visíveis para autenticados" ON public.propostas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Propostas visíveis por link público" ON public.propostas
  FOR SELECT TO anon USING (true);
CREATE POLICY "Admins inserem propostas" ON public.propostas
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins atualizam propostas" ON public.propostas
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins deletam propostas" ON public.propostas
  FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_propostas_updated_at
  BEFORE UPDATE ON public.propostas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. EQUIPAMENTOS_KITS
CREATE TABLE public.equipamentos_kits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  linha TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'inversor',
  marca TEXT,
  modelo TEXT,
  potencia NUMERIC,
  garantia INTEGER,
  preco_custo NUMERIC,
  potencia_min NUMERIC,
  potencia_max NUMERIC,
  ativo BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE public.equipamentos_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kits visíveis para todos" ON public.equipamentos_kits
  FOR SELECT USING (true);
CREATE POLICY "Admins inserem kits" ON public.equipamentos_kits
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins atualizam kits" ON public.equipamentos_kits
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins deletam kits" ON public.equipamentos_kits
  FOR DELETE TO authenticated USING (true);

-- 4. CONFIGURACOES
CREATE TABLE public.configuracoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chave TEXT NOT NULL UNIQUE,
  valor JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Configurações visíveis para todos" ON public.configuracoes
  FOR SELECT USING (true);
CREATE POLICY "Admins inserem configurações" ON public.configuracoes
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins atualizam configurações" ON public.configuracoes
  FOR UPDATE TO authenticated USING (true);

-- 5. CIDADES_IRRADIANCIA
CREATE TABLE public.cidades_irradiancia (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cidade TEXT NOT NULL,
  uf TEXT NOT NULL,
  jan NUMERIC, fev NUMERIC, mar NUMERIC,
  abr NUMERIC, mai NUMERIC, jun NUMERIC,
  jul NUMERIC, ago NUMERIC, set_ NUMERIC,
  out_ NUMERIC, nov NUMERIC, dez NUMERIC
);

ALTER TABLE public.cidades_irradiancia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Irradiância visível para todos" ON public.cidades_irradiancia
  FOR SELECT USING (true);
CREATE POLICY "Admins inserem irradiância" ON public.cidades_irradiancia
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins atualizam irradiância" ON public.cidades_irradiancia
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins deletam irradiância" ON public.cidades_irradiancia
  FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_cidades_irradiancia_cidade_uf ON public.cidades_irradiancia(cidade, uf);

-- 6. DISTRIBUIDORAS
CREATE TABLE public.distribuidoras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  valor_kwh NUMERIC NOT NULL DEFAULT 0.85,
  padrao BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.distribuidoras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Distribuidoras visíveis para todos" ON public.distribuidoras
  FOR SELECT USING (true);
CREATE POLICY "Admins inserem distribuidoras" ON public.distribuidoras
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins atualizam distribuidoras" ON public.distribuidoras
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins deletam distribuidoras" ON public.distribuidoras
  FOR DELETE TO authenticated USING (true);
