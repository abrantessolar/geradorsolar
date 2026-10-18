-- Central de Monitoramento TLS — Fase 4.1: tarifa opcional na conta de luz,
-- pra estimar "quanto pagou" / "sem energia solar" / "economia estimada".
--
-- Pedido do usuário (2026-10-17, via referência visual própria feita no
-- Canva): adicionar uma seção financeira no relatório, com a fórmula que
-- ele mesmo definiu na nota de rodapé do mockup: "Estimativa = consumo
-- real × tarifa informada; valores reais variam conforme tributos,
-- tarifas e regras de compensação."
--
-- Campo opcional (nullable) — contas já lançadas não têm tarifa, e o
-- relatório simplesmente omite a seção financeira quando ausente (ver
-- ArteFatura.tsx). "Quanto pagou"/"sem energia solar"/"economia" NÃO são
-- persistidos: são sempre derivados em código a partir de
-- `tarifa_kwh` + os kWh já salvos, igual já fazíamos com simultaneidade/
-- consumo_real_casa.
ALTER TABLE public.mon_faturas
  ADD COLUMN tarifa_kwh numeric;

COMMENT ON COLUMN public.mon_faturas.tarifa_kwh IS
  'R$/kWh informado da fatura, opcional — usado só pra estimar quanto o cliente pagou/pagaria sem solar no relatório. Null = seção financeira omitida no relatório.';
