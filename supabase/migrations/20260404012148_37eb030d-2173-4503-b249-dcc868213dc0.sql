
CREATE TABLE public.custos_obra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  custo_kit numeric DEFAULT 0,
  custo_instalacao numeric DEFAULT 0,
  custo_trt numeric DEFAULT 69,
  custo_materiais numeric DEFAULT 0,
  custo_frete numeric,
  custo_homologacao numeric,
  custo_comissao numeric,
  custo_outros numeric,
  descricao_outros text,
  preco_venda numeric DEFAULT 0,
  observacoes text,
  UNIQUE(projeto_id)
);

ALTER TABLE public.custos_obra ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestor vê custos_obra" ON public.custos_obra
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gestor insere custos_obra" ON public.custos_obra
  FOR INSERT TO authenticated
  WITH CHECK (
    is_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND acesso_painel_gestor = true
    )
  );

CREATE POLICY "Gestor atualiza custos_obra" ON public.custos_obra
  FOR UPDATE TO authenticated
  USING (
    is_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND acesso_painel_gestor = true
    )
  );

CREATE POLICY "Gestor deleta custos_obra" ON public.custos_obra
  FOR DELETE TO authenticated
  USING (
    is_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND acesso_painel_gestor = true
    )
  );

CREATE TRIGGER update_custos_obra_updated_at
  BEFORE UPDATE ON public.custos_obra
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
