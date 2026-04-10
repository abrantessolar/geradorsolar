
CREATE TABLE public.unidades_consumidoras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id UUID NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'geradora',
  codigo_uc TEXT,
  cep TEXT,
  endereco TEXT,
  padrao_entrada TEXT,
  concessionaria TEXT,
  nome_titular TEXT,
  relacao_titular TEXT,
  modo_distribuicao TEXT NOT NULL DEFAULT 'percentual',
  percentual NUMERIC,
  prioridade INTEGER,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.unidades_consumidoras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestor vê unidades_consumidoras"
ON public.unidades_consumidoras
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Gestor insere unidades_consumidoras"
ON public.unidades_consumidoras
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid() AND user_profiles.acesso_painel_gestor = true
  )
);

CREATE POLICY "Gestor atualiza unidades_consumidoras"
ON public.unidades_consumidoras
FOR UPDATE
TO authenticated
USING (
  is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid() AND user_profiles.acesso_painel_gestor = true
  )
);

CREATE POLICY "Gestor deleta unidades_consumidoras"
ON public.unidades_consumidoras
FOR DELETE
TO authenticated
USING (
  is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid() AND user_profiles.acesso_painel_gestor = true
  )
);

CREATE INDEX idx_unidades_consumidoras_projeto ON public.unidades_consumidoras(projeto_id);
