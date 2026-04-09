
-- Add new fields to projetos table
ALTER TABLE public.projetos
ADD COLUMN IF NOT EXISTS outros_nomes jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS proposta_id uuid REFERENCES public.propostas(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS satisfacao integer,
ADD COLUMN IF NOT EXISTS observacoes_historico jsonb DEFAULT '[]'::jsonb;

-- Add new fields to clientes_base table
ALTER TABLE public.clientes_base
ADD COLUMN IF NOT EXISTS outros_nomes jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS proposta_id_ref uuid REFERENCES public.propostas(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS observacoes_historico jsonb DEFAULT '[]'::jsonb;
