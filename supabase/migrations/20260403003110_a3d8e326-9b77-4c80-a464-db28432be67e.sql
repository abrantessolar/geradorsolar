
ALTER TABLE public.clientes_base ADD COLUMN IF NOT EXISTS telefone_2 text;
ALTER TABLE public.clientes_base ADD COLUMN IF NOT EXISTS telefone_3 text;
ALTER TABLE public.clientes_base ADD COLUMN IF NOT EXISTS observacoes text;
ALTER TABLE public.clientes_base ADD COLUMN IF NOT EXISTS kwp numeric;
