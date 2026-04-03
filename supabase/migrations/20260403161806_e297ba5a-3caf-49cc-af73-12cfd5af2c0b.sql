
ALTER TABLE public.clientes_base
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS data_nascimento date,
  ADD COLUMN IF NOT EXISTS logradouro text,
  ADD COLUMN IF NOT EXISTS numero text,
  ADD COLUMN IF NOT EXISTS complemento text,
  ADD COLUMN IF NOT EXISTS bairro text,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS estado text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS wifi_nome text,
  ADD COLUMN IF NOT EXISTS wifi_senha text,
  ADD COLUMN IF NOT EXISTS cabo_usado text,
  ADD COLUMN IF NOT EXISTS modelo_inversor text,
  ADD COLUMN IF NOT EXISTS modelo_placa text;
