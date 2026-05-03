ALTER TABLE public.energia_indicadores 
ADD COLUMN IF NOT EXISTS pontos_historicos INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS pontos_disponiveis INTEGER NOT NULL DEFAULT 0;

UPDATE public.energia_indicadores 
SET pontos_historicos = COALESCE(pontos_acumulados, 0),
    pontos_disponiveis = COALESCE(pontos_acumulados, 0)
WHERE pontos_historicos = 0 AND pontos_disponiveis = 0;