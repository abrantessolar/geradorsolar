
ALTER TABLE public.energia_indicacoes
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS observacao_indicador text,
  ADD COLUMN IF NOT EXISTS num_placas integer;

ALTER TABLE public.energia_indicadores
  ADD COLUMN IF NOT EXISTS cidade text;

INSERT INTO public.energia_config (chave, valor) VALUES
  ('modo_pontuacao', '"placas"'::jsonb),
  ('pontos_por_placa', '1'::jsonb),
  ('mensagem_whatsapp_indicado', '"Oi! Aqui é da Três Lagoas Solar 🌞 Você foi indicado(a) por {indicador} para conhecer a economia da energia solar. Posso te enviar uma simulação rápida e sem compromisso?"'::jsonb)
ON CONFLICT (chave) DO NOTHING;
