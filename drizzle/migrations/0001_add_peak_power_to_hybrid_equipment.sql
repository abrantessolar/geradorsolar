ALTER TABLE public.equipamentos_simulador_hibrido
  ADD COLUMN IF NOT EXISTS potencia_pico_kw NUMERIC;

COMMENT ON COLUMN public.equipamentos_simulador_hibrido.potencia_pico_kw IS
  'Potência de pico/partida (kW), quando aplicável (motores, compressores). Em branco = sem surto conhecido, usa a potência nominal.';