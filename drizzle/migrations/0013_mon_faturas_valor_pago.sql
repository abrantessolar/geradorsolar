-- Central de Monitoramento TLS — Fase 4.2: valor pago digitado manualmente,
-- em vez de calculado (documento do usuário "Regras do motor — Raio-X da
-- energia", 2026-10-17).
--
-- Até aqui "quanto pagou" era SEMPRE calculado em código (consumo da
-- concessionária × tarifa_kwh). A regra nova diz que o valor pago na
-- fatura não deve ser substituído por um cálculo automático — ele vem
-- direto da fatura física do cliente, assim como os outros campos
-- digitados (consumo_concessionaria_kwh, energia_injetada_kwh, etc).
--
-- "quanto pagaria sem solar" continua sendo só SIMULAÇÃO (consumo real
-- × tarifa_kwh estimada) — tarifa_kwh (migração 0012) não muda de papel.
-- economia_estimada = sem_solar − valor_pago_reais, sempre derivada em
-- código (ArteFatura.tsx), nunca persistida (mesmo padrão de
-- consumo_simultaneidade_kwh/consumo_real_casa_kwh).
--
-- Campo opcional (nullable) — contas já lançadas não têm valor pago, e
-- o relatório simplesmente mostra "—" nessa caixa (e na de economia)
-- quando ausente.
ALTER TABLE public.mon_faturas
  ADD COLUMN valor_pago_reais numeric;

COMMENT ON COLUMN public.mon_faturas.valor_pago_reais IS
  'Valor real pago na fatura (R$), digitado manualmente — NÃO calculado a partir de consumo × tarifa. Null = caixa "quanto pagou"/economia omitida no relatório.';
