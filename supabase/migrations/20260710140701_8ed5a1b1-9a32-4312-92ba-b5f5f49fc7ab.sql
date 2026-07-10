ALTER TABLE public.movimentacoes_estoque
  DROP CONSTRAINT IF EXISTS movimentacoes_estoque_tipo_check;

ALTER TABLE public.movimentacoes_estoque
  ADD CONSTRAINT movimentacoes_estoque_tipo_check
  CHECK (tipo = ANY (ARRAY['entrada'::text, 'saida'::text, 'retorno'::text, 'saida_manual'::text]));

ALTER TABLE public.movimentacoes_estoque
  ADD COLUMN IF NOT EXISTS tipo_saida text;

ALTER TABLE public.movimentacoes_estoque
  DROP CONSTRAINT IF EXISTS movimentacoes_estoque_tipo_saida_check;

ALTER TABLE public.movimentacoes_estoque
  ADD CONSTRAINT movimentacoes_estoque_tipo_saida_check
  CHECK (tipo_saida IS NULL OR tipo_saida = ANY (ARRAY['uso_interno'::text, 'obra_nao_identificada'::text, 'ajuste_estoque'::text]));