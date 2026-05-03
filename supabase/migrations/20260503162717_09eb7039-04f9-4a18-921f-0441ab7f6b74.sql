
-- ============ TABELAS ============

CREATE TABLE public.energia_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario text NOT NULL UNIQUE,
  senha_hash text NOT NULL,
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.energia_indicadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cpf text NOT NULL UNIQUE,
  data_nascimento date NOT NULL,
  telefone text,
  email text,
  codigo_link text NOT NULL UNIQUE DEFAULT substr(md5(random()::text || clock_timestamp()::text), 1, 10),
  pontos_acumulados integer NOT NULL DEFAULT 0,
  etapa_atual text,
  aparece_ranking boolean NOT NULL DEFAULT true,
  ultimo_acesso timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.energia_premios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  imagem_url text,
  pontos_necessarios integer NOT NULL DEFAULT 0,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.energia_etapas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  pontos_minimos integer NOT NULL DEFAULT 0,
  premio_id uuid REFERENCES public.energia_premios(id) ON DELETE SET NULL,
  icone text
);

CREATE TABLE public.energia_indicacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicador_id uuid NOT NULL REFERENCES public.energia_indicadores(id) ON DELETE CASCADE,
  nome_indicado text,
  telefone_indicado text,
  email_indicado text,
  valor_negocio numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'enviada' CHECK (status IN ('enviada','negociacao','fechada')),
  pontos_creditados integer NOT NULL DEFAULT 0,
  observacao text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  fechada_em timestamptz
);

CREATE TABLE public.energia_resgates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicador_id uuid NOT NULL REFERENCES public.energia_indicadores(id) ON DELETE CASCADE,
  premio_id uuid NOT NULL REFERENCES public.energia_premios(id) ON DELETE RESTRICT,
  pontos_utilizados integer NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','entregue','cancelado')),
  solicitado_em timestamptz NOT NULL DEFAULT now(),
  entregue_em timestamptz
);

CREATE TABLE public.energia_pontos_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicador_id uuid NOT NULL REFERENCES public.energia_indicadores(id) ON DELETE CASCADE,
  pontos integer NOT NULL,
  motivo text,
  admin_id uuid REFERENCES public.energia_admins(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.energia_campanhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  inicio date NOT NULL,
  fim date NOT NULL,
  multiplicador numeric NOT NULL DEFAULT 1,
  ativa boolean NOT NULL DEFAULT true
);

CREATE TABLE public.energia_config (
  chave text PRIMARY KEY,
  valor jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- ============ ÍNDICES ============
CREATE INDEX idx_energia_indicacoes_indicador ON public.energia_indicacoes(indicador_id);
CREATE INDEX idx_energia_indicacoes_status ON public.energia_indicacoes(status);
CREATE INDEX idx_energia_resgates_indicador ON public.energia_resgates(indicador_id);
CREATE INDEX idx_energia_resgates_status ON public.energia_resgates(status);
CREATE INDEX idx_energia_etapas_ordem ON public.energia_etapas(ordem);

-- ============ RLS (tudo bloqueado; acesso só via edge function com service role) ============
ALTER TABLE public.energia_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.energia_indicadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.energia_premios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.energia_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.energia_indicacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.energia_resgates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.energia_pontos_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.energia_campanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.energia_config ENABLE ROW LEVEL SECURITY;

-- ============ SEED ============
INSERT INTO public.energia_config (chave, valor) VALUES
  ('pontos_padrao_indicacao', '100'::jsonb),
  ('bonus_valor_minimo', '20000'::jsonb),
  ('bonus_pontos', '50'::jsonb),
  ('webhook_kommo_url', '""'::jsonb),
  ('mensagem_resgate', '"Sua solicitação foi enviada! Aguarde contato da equipe para combinar a retirada presencial na empresa."'::jsonb),
  ('texto_link_indicacao', '"Olá! Estou usando energia solar da Três Lagoas Solar e quero te indicar. Acesse pelo meu link:"'::jsonb),
  ('logo_url', '""'::jsonb),
  ('nome_plataforma', '"Energia que Volta"'::jsonb);

INSERT INTO public.energia_etapas (nome, ordem, pontos_minimos, icone) VALUES
  ('Raio', 1, 0, 'zap'),
  ('Painel', 2, 200, 'panel'),
  ('Gerador', 3, 500, 'battery'),
  ('Usina', 4, 1000, 'factory'),
  ('Central', 5, 2000, 'tower'),
  ('Sol Maior', 6, 4000, 'sun');

-- ============ STORAGE BUCKET ============
INSERT INTO storage.buckets (id, name, public) VALUES ('energia-premios', 'energia-premios', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Energia premios publico leitura" ON storage.objects FOR SELECT USING (bucket_id = 'energia-premios');
CREATE POLICY "Energia premios autenticado upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'energia-premios');
CREATE POLICY "Energia premios autenticado update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'energia-premios');
CREATE POLICY "Energia premios autenticado delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'energia-premios');
