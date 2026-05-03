
-- 1. ETAPAS
DELETE FROM public.energia_etapas;
INSERT INTO public.energia_etapas (ordem, nome, pontos_minimos) VALUES
  (1, 'Indicador Faísca', 0),
  (2, 'Indicador Volt', 10),
  (3, 'Indicador Ampere', 30),
  (4, 'Indicador Megawatt', 70),
  (5, 'Indicador Gigawatt', 130),
  (6, 'Indicador Master', 220),
  (7, 'Indicador Supernova', 400);

-- 2. PRÊMIOS
DELETE FROM public.energia_premios;
INSERT INTO public.energia_premios (ordem, nome, pontos_necessarios, ativo) VALUES
  (1, 'Echo Dot (Alexa)', 10, true),
  (2, 'Limpeza das Placas', 12, true),
  (3, 'Air Fryer', 25, true),
  (4, 'Smartwatch', 40, true),
  (5, 'Ar-condicionado 12.000 BTUs', 70, true),
  (6, 'Ar-condicionado 18.000 BTUs', 90, true),
  (7, 'TV 55"', 130, true),
  (8, 'iPhone / Samsung top', 220, true),
  (9, 'Relíquia Suprema', 400, true);

-- 3. CONFIGURAÇÕES
INSERT INTO public.energia_config (chave, valor) VALUES
  ('modo_pontuacao', '"placas"'::jsonb),
  ('pontos_por_placa', '1'::jsonb),
  ('bonus_placas_minimo', '0'::jsonb),
  ('bonus_placas_pontos', '0'::jsonb),
  ('mensagem_whatsapp_indicado', '"Oi {indicado}! Aqui é o {indicador}. Estou usando energia solar da Três Lagoas Solar e tem sido ótimo — minha conta de luz caiu muito. Pensei em te indicar! Eles fazem uma simulação gratuita, sem compromisso. Posso te passar o contato?"'::jsonb),
  ('mensagem_resgate', '"Sua solicitação foi enviada! Em breve nossa equipe entrará em contato para combinar a retirada presencial na empresa. Endereço: Rua Luiz Corrêa da Silveira, 934 — Três Lagoas/MS"'::jsonb),
  ('texto_link_indicacao', '"Olá! Estou usando energia solar da Três Lagoas Solar e quero te indicar. Acesse pelo meu link:"'::jsonb),
  ('nome_plataforma', '"Energia que Volta"'::jsonb),
  ('ranking_publico', 'true'::jsonb)
ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor;

-- 4. ASSOCIAR PRÊMIOS ÀS ETAPAS
UPDATE public.energia_etapas e SET premio_id = p.id
FROM public.energia_premios p
WHERE (e.nome, p.nome) IN (
  ('Indicador Volt', 'Echo Dot (Alexa)'),
  ('Indicador Ampere', 'Air Fryer'),
  ('Indicador Megawatt', 'Ar-condicionado 12.000 BTUs'),
  ('Indicador Gigawatt', 'TV 55"'),
  ('Indicador Master', 'iPhone / Samsung top'),
  ('Indicador Supernova', 'Relíquia Suprema')
);
