ALTER TABLE public.projetos 
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS sistema text,
  ADD COLUMN IF NOT EXISTS distribuidor text,
  ADD COLUMN IF NOT EXISTS instalador text,
  ADD COLUMN IF NOT EXISTS pagamento_status text DEFAULT 'Pendente',
  ADD COLUMN IF NOT EXISTS projeto_enviado_em date,
  ADD COLUMN IF NOT EXISTS projeto_aprovado date,
  ADD COLUMN IF NOT EXISTS vistoriado_em date,
  ADD COLUMN IF NOT EXISTS marca_placa text,
  ADD COLUMN IF NOT EXISTS potencia_placa text,
  ADD COLUMN IF NOT EXISTS marca_inversor text,
  ADD COLUMN IF NOT EXISTS potencia_inversor text;