DROP FUNCTION IF EXISTS public.recalcular_desvio_global();

COMMENT ON COLUMN public.mon_diario.mediana_cidade IS
  'Não usado mais (comparação de desvio removida em 2026-10-17 — não foi considerada confiável). Coluna mantida só por compatibilidade com o schema existente.';
COMMENT ON COLUMN public.mon_diario.desvio_pct IS
  'Não usado mais (ver mediana_cidade). kwh_por_kwp continua sendo o indicador de desempenho, sem comparação.';