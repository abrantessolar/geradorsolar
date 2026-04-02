-- Add freeze and layout fields to projetos
ALTER TABLE public.projetos
  ADD COLUMN IF NOT EXISTS congelado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS congelado_ate date,
  ADD COLUMN IF NOT EXISTS motivo_congelamento text,
  ADD COLUMN IF NOT EXISTS layout_url text;

-- Create instaladores table
CREATE TABLE public.instaladores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.instaladores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Instaladores visíveis para autenticados" ON public.instaladores
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gestor insere instaladores" ON public.instaladores
  FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND acesso_painel_gestor = true
  ));

CREATE POLICY "Gestor atualiza instaladores" ON public.instaladores
  FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND acesso_painel_gestor = true
  ));

-- Seed initial instaladores
INSERT INTO public.instaladores (nome) VALUES ('GUSTAVO'), ('MATHEUS'), ('LUCAS DELFI');

-- Create storage bucket for layouts
INSERT INTO storage.buckets (id, name, public) VALUES ('layouts-obras', 'layouts-obras', true);

-- Storage policies
CREATE POLICY "Layouts públicos para leitura" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'layouts-obras');

CREATE POLICY "Autenticados fazem upload de layouts" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'layouts-obras');

CREATE POLICY "Autenticados atualizam layouts" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'layouts-obras');

CREATE POLICY "Autenticados deletam layouts" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'layouts-obras');