-- Central de Monitoramento TLS — mediana de kWh/kWp GLOBAL (toda a
-- frota, nas duas marcas juntas), substituindo a mediana POR CIDADE.
--
-- Por que mudar: a mediana por cidade (como mon-backfill-diario
-- calculava até agora, só pra FoxESS) depende de várias usinas da MESMA
-- cidade terem kwp/cidade bem preenchidos no mesmo dia — na prática isso
-- quase nunca forma um grupo grande o suficiente pra significar algo (a
-- Solis nem calculava isso). Decisão do usuário (2026-10-17): comparar
-- cada usina com a mediana de TODAS as usinas da frota (sem agrupar por
-- cidade) — pool muito maior (FoxESS + Solis juntas), então estatisticamente
-- mais sólido, e não depende mais de nenhuma usina vizinha específica.
--
-- Mantém os nomes de coluna existentes (`mediana_cidade`, `desvio_pct`,
-- `estado`) pra não precisar de uma migration maior tocando os dois
-- backfills e o front — só o SIGNIFICADO de `mediana_cidade` muda (era
-- por cidade, passa a ser da frota inteira). O comentário da coluna é
-- atualizado para refletir isso.
COMMENT ON COLUMN public.mon_diario.mediana_cidade IS
  'Mediana de kWh/kWp da FROTA INTEIRA (todas as marcas, não agrupado por cidade) naquele dia — ver recalcular_desvio_global(). Nome da coluna é histórico, mantido pra não exigir migration maior.';

-- Função que recalcula mediana_cidade/desvio_pct/estado pra TODO o
-- mon_diario de uma vez, usando PERCENTILE_CONT (mediana de verdade, não
-- média) sobre kwh_por_kwp agrupado só por `data` (sem cidade). Statement
-- único, set-based — rápido mesmo com muitos meses de histórico (sem
-- loop em JS, sem chamada de API nenhuma, só leitura/escrita no próprio
-- banco). Chamada pela edge function `mon-recalcular-desvio` depois de
-- cada backfill/coleta diária.
--
-- `estado` só é tocado quando ele hoje é 'normal' ou 'baixo_desempenho'
-- — nunca sobrescreve 'offline'/'sem_geracao' (que vêm de outra lógica,
-- em mon-coleta, e têm prioridade: não faz sentido dizer "baixo
-- desempenho" de uma usina que não gerou nada ou está offline).
CREATE OR REPLACE FUNCTION public.recalcular_desvio_global()
RETURNS void
LANGUAGE sql
AS $$
  WITH medianas AS (
    SELECT data, percentile_cont(0.5) WITHIN GROUP (ORDER BY kwh_por_kwp) AS mediana
    FROM public.mon_diario
    WHERE kwh_por_kwp IS NOT NULL
    GROUP BY data
  )
  UPDATE public.mon_diario d
  SET
    mediana_cidade = m.mediana,
    desvio_pct = CASE WHEN m.mediana > 0 THEN ((d.kwh_por_kwp - m.mediana) / m.mediana) * 100 ELSE NULL END,
    estado = CASE
      WHEN d.estado IN ('offline', 'sem_geracao') THEN d.estado
      WHEN m.mediana > 0 AND ((d.kwh_por_kwp - m.mediana) / m.mediana) * 100 < -30 THEN 'baixo_desempenho'
      ELSE 'normal'
    END
  FROM medianas m
  WHERE d.data = m.data AND d.kwh_por_kwp IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.recalcular_desvio_global() TO service_role;
