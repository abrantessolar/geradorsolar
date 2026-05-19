
CREATE TABLE public.historico_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_inversor text NOT NULL CHECK (tipo_inversor IN ('string','micro')),
  marca_inversor text NOT NULL DEFAULT '',
  modelo_inversor text NOT NULL DEFAULT '',
  potencia_inversor_kw numeric NOT NULL DEFAULT 0,
  quantidade_inversores integer NOT NULL DEFAULT 1,
  marca_placa text NOT NULL DEFAULT '',
  modelo_placa text NOT NULL DEFAULT '',
  potencia_placa_wp numeric NOT NULL DEFAULT 0,
  quantidade_placas integer NOT NULL DEFAULT 0,
  custo_kit numeric NOT NULL DEFAULT 0,
  usado_em timestamptz NOT NULL DEFAULT now(),
  vezes_usado integer NOT NULL DEFAULT 1,
  criador_user_id uuid
);

CREATE UNIQUE INDEX historico_kits_combo_idx ON public.historico_kits (
  tipo_inversor, marca_inversor, modelo_inversor, potencia_inversor_kw,
  quantidade_inversores, marca_placa, modelo_placa, potencia_placa_wp,
  quantidade_placas, custo_kit
);

CREATE INDEX historico_kits_recentes_idx ON public.historico_kits (vezes_usado DESC, usado_em DESC);

ALTER TABLE public.historico_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestor vê historico_kits"
ON public.historico_kits FOR SELECT TO authenticated
USING (
  is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid() AND acesso_painel_gestor = true
  )
);

CREATE POLICY "Gestor insere historico_kits"
ON public.historico_kits FOR INSERT TO authenticated
WITH CHECK (
  is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid() AND acesso_painel_gestor = true
  )
);

CREATE POLICY "Gestor atualiza historico_kits"
ON public.historico_kits FOR UPDATE TO authenticated
USING (
  is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid() AND acesso_painel_gestor = true
  )
);

CREATE POLICY "Admin deleta historico_kits"
ON public.historico_kits FOR DELETE TO authenticated
USING (is_admin(auth.uid()));
