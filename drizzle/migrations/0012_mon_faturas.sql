-- Central de Monitoramento TLS — Fase 4: relatório de conta de luz
-- ("Quanto sua casa consumiu?"). Ferramenta de pós-venda: a geração solar
-- do período de faturamento vem de `mon_diario` (já temos isso pronto,
-- ver HistoricoUsina.tsx modo "Período personalizado"); o resto dos
-- números (consumo da concessionária, energia injetada, saldo do mês,
-- saldo acumulado) é digitado manualmente a partir da fatura física —
-- pedido do usuário (2026-10-17): "A GERACAO DE ENERGIA VEM DO PERIODO
-- DE FATURAMENTO. O RESTANTE DOS DADOS DEVEM SER IMPUTADOS."
--
-- Guarda uma linha por conta lançada (1ª, 2ª, 3ª...), pra ter histórico
-- por cliente/usina e poder reabrir/reimprimir qualquer uma depois —
-- decisão do usuário. `numero_conta` é só uma etiqueta amigável (não
-- precisa ser sequencial sem furos); o app calcula o próximo sozinho mas
-- deixa editar, pra cobrir o caso de lançar fora de ordem.
--
-- consumo_simultaneidade e consumo_real_casa são DERIVADOS (geração -
-- energia injetada; e simultaneidade + consumo da concessionária) —
-- gravados aqui mesmo assim (não só calculados no front) pra manter o
-- relatório reproduzível mesmo que a lógica de cálculo mude depois.
CREATE TABLE public.mon_faturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usina_id uuid NOT NULL REFERENCES public.mon_usinas(id) ON DELETE CASCADE,
  cliente_base_id uuid REFERENCES public.clientes_base(id) ON DELETE SET NULL,
  numero_conta integer NOT NULL,
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,

  -- vem de mon_diario (somatório do período), congelado no momento do
  -- lançamento — não recalcula sozinho depois, pra não mudar um
  -- relatório já gerado se o histórico for reprocessado.
  geracao_kwh numeric NOT NULL,

  -- digitados a partir da fatura física
  consumo_concessionaria_kwh numeric NOT NULL,
  energia_injetada_kwh numeric NOT NULL,
  saldo_mes_kwh numeric NOT NULL,
  saldo_acumulado_kwh numeric NOT NULL,

  -- derivados (gravados, ver nota acima)
  consumo_simultaneidade_kwh numeric NOT NULL,
  consumo_real_casa_kwh numeric NOT NULL,

  criado_em timestamptz NOT NULL DEFAULT now(),
  criado_por uuid, -- id do usuário staff que lançou — sem FK pra auth.users, mesmo padrão de tarefas_posvenda.usuario_id

  UNIQUE (usina_id, numero_conta)
);

CREATE INDEX mon_faturas_usina_idx ON public.mon_faturas (usina_id, numero_conta DESC);

ALTER TABLE public.mon_faturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipe gerencia mon_faturas" ON public.mon_faturas
  FOR ALL TO authenticated
  USING (public.has_panel_access(auth.uid()))
  WITH CHECK (public.has_panel_access(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mon_faturas TO authenticated;
GRANT ALL ON public.mon_faturas TO service_role;
