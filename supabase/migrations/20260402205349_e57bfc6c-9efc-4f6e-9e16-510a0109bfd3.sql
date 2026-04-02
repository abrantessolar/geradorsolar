
CREATE TABLE public.clientes_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  usuario_id uuid,
  nome_completo text,
  cpf text,
  endereco text,
  telefone text,
  uc text,
  concessionaria text DEFAULT 'ELEKTRO',
  sistema text,
  dados_paineis text,
  dados_inversor text,
  qtd_placas integer,
  marca_placa text,
  potencia_placa text,
  qtd_inversores integer,
  marca_inversor text,
  potencia_inversor text,
  tipo_inversor text DEFAULT 'String',
  fornecedor text,
  valor numeric,
  forma_pagamento text,
  projeto_enviado_em date,
  projeto_aprovado date,
  instalado_em date,
  vistoriado_em date,
  nome_planta text,
  satisfacao text,
  origem text NOT NULL DEFAULT 'importacao',
  projeto_id uuid
);

ALTER TABLE public.clientes_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestor vê clientes_base" ON public.clientes_base
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM user_profiles WHERE user_profiles.user_id = auth.uid() AND user_profiles.acesso_painel_gestor = true
  ));

CREATE POLICY "Gestor insere clientes_base" ON public.clientes_base
  FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM user_profiles WHERE user_profiles.user_id = auth.uid() AND user_profiles.acesso_painel_gestor = true
  ));

CREATE POLICY "Gestor atualiza clientes_base" ON public.clientes_base
  FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM user_profiles WHERE user_profiles.user_id = auth.uid() AND user_profiles.acesso_painel_gestor = true
  ));

CREATE POLICY "Gestor deleta clientes_base" ON public.clientes_base
  FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

CREATE TRIGGER update_clientes_base_updated_at
  BEFORE UPDATE ON public.clientes_base
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
