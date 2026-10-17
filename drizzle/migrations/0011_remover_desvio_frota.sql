-- Central de Monitoramento TLS — remove a comparação de desvio vs
-- mediana (por cidade, depois tentada como mediana da frota inteira via
-- recalcular_desvio_global/mon-recalcular-desvio). Decisão do usuário
-- (2026-10-17): "pode tirar o desvio de frota. nao achei confiavel.
-- mantenha só o kwh/kwp." — kWh/kWp continua sendo gravado normalmente
-- (é o indicador bruto, sem comparação), só a parte de comparação sai.
--
-- 1. Remove a função criada pela migração 0010 (chamada só pela edge
--    function mon-recalcular-desvio, que também foi removida do repo).
DROP FUNCTION IF EXISTS public.recalcular_desvio_global();

-- 2. Limpa os valores de comparação já gravados em mon_diario (ficariam
--    stale/confusos sem nada que os recalcule) e devolve pra 'normal'
--    qualquer dia que tinha sido marcado 'baixo_desempenho' só por causa
--    do desvio (nunca foi um sinal independente do kWh/kWp).
UPDATE public.mon_diario
SET mediana_cidade = NULL,
    desvio_pct = NULL,
    estado = CASE WHEN estado = 'baixo_desempenho' THEN 'normal' ELSE estado END;

COMMENT ON COLUMN public.mon_diario.mediana_cidade IS
  'Não usado mais (comparação de desvio removida em 2026-10-17 — não foi considerada confiável). Coluna mantida só por compatibilidade com o schema existente.';
COMMENT ON COLUMN public.mon_diario.desvio_pct IS
  'Não usado mais (ver mediana_cidade). kwh_por_kwp continua sendo o indicador de desempenho, sem comparação.';
