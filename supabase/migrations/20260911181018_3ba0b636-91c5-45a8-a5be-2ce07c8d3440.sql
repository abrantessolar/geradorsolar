ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS dados_simulacao JSONB;

COMMENT ON COLUMN public.leads.dados_simulacao IS
  'Histórico completo dos dados usados na simulação pública: modo de consumo (média ou mês a mês), valores informados, equipamentos adicionais, ajuste manual de placas, cidade e resultado mostrado.';