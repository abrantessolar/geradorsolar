ALTER TABLE public.projetos
  ADD COLUMN IF NOT EXISTS numero_fila integer,
  ADD COLUMN IF NOT EXISTS data_agendamento date;

-- Backfill: Nº da fila (fluxo 3, etapa 1)
UPDATE public.projetos p
SET numero_fila = (r.campo_extra->>'numero_fila')::int
FROM public.rastreamento_obras r
WHERE r.projeto_id = p.id AND r.fluxo = 3 AND r.etapa = 1
  AND r.campo_extra ? 'numero_fila'
  AND NULLIF(r.campo_extra->>'numero_fila','') IS NOT NULL
  AND p.numero_fila IS NULL;

-- Backfill: Data de agendamento (fluxo 3, etapa 2)
UPDATE public.projetos p
SET data_agendamento = (r.campo_extra->>'data_agendamento')::date
FROM public.rastreamento_obras r
WHERE r.projeto_id = p.id AND r.fluxo = 3 AND r.etapa = 2
  AND r.campo_extra ? 'data_agendamento'
  AND NULLIF(r.campo_extra->>'data_agendamento','') IS NOT NULL
  AND p.data_agendamento IS NULL;

-- Backfill: Local de entrega (fluxo 2, etapa 4)
UPDATE public.projetos p
SET local_entrega = r.campo_extra->>'local_entrega'
FROM public.rastreamento_obras r
WHERE r.projeto_id = p.id AND r.fluxo = 2 AND r.etapa = 4
  AND r.campo_extra ? 'local_entrega'
  AND NULLIF(r.campo_extra->>'local_entrega','') IS NOT NULL
  AND NULLIF(p.local_entrega,'') IS NULL;

-- Backfill: Fornecedor/Distribuidor (fluxo 2, etapa 1)
UPDATE public.projetos p
SET distribuidor = r.campo_extra->>'fornecedor'
FROM public.rastreamento_obras r
WHERE r.projeto_id = p.id AND r.fluxo = 2 AND r.etapa = 1
  AND r.campo_extra ? 'fornecedor'
  AND NULLIF(r.campo_extra->>'fornecedor','') IS NOT NULL
  AND NULLIF(p.distribuidor,'') IS NULL;

-- Backfill: Projeto enviado em (fluxo 1, etapa 2 concluída)
UPDATE public.projetos p
SET projeto_enviado_em = (r.data_conclusao AT TIME ZONE 'America/Sao_Paulo')::date
FROM public.rastreamento_obras r
WHERE r.projeto_id = p.id AND r.fluxo = 1 AND r.etapa = 2
  AND r.concluido = true AND r.data_conclusao IS NOT NULL
  AND p.projeto_enviado_em IS NULL;

-- Backfill: Projeto aprovado em (fluxo 1, etapa 3 concluída)
UPDATE public.projetos p
SET projeto_aprovado = (r.data_conclusao AT TIME ZONE 'America/Sao_Paulo')::date
FROM public.rastreamento_obras r
WHERE r.projeto_id = p.id AND r.fluxo = 1 AND r.etapa = 3
  AND r.concluido = true AND r.data_conclusao IS NOT NULL
  AND p.projeto_aprovado IS NULL;