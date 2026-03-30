
ALTER TABLE public.equipamentos_calculadora ADD COLUMN IF NOT EXISTS fator_servico numeric NOT NULL DEFAULT 0.80;
