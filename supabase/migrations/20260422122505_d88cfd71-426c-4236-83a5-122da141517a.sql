ALTER TABLE public.custos_obra
  ADD COLUMN IF NOT EXISTS custo_material_ca numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custo_cabo_tronco numeric DEFAULT 0;