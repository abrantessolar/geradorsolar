-- 1. Campo dia_leitura em projetos
ALTER TABLE public.projetos ADD COLUMN IF NOT EXISTS dia_leitura integer;

-- 2. Tabela tarefas_posvenda
CREATE TABLE IF NOT EXISTS public.tarefas_posvenda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  fase integer NOT NULL,
  tipo text NOT NULL,
  template_key text,
  descricao text NOT NULL,
  data_programada date NOT NULL,
  visivel_cliente boolean NOT NULL DEFAULT false,
  concluido boolean NOT NULL DEFAULT false,
  data_conclusao timestamptz,
  usuario_id uuid,
  observacao text,
  adiamentos integer NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tarefas_posvenda TO authenticated;
GRANT ALL ON public.tarefas_posvenda TO service_role;

ALTER TABLE public.tarefas_posvenda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated manage tarefas_posvenda"
  ON public.tarefas_posvenda FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_tarefas_posvenda_projeto ON public.tarefas_posvenda(projeto_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_posvenda_data ON public.tarefas_posvenda(data_programada);

-- 3. Tabela whatsapp_templates
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL UNIQUE,
  titulo text,
  texto text NOT NULL,
  editavel boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_templates TO authenticated;
GRANT SELECT ON public.whatsapp_templates TO anon;
GRANT ALL ON public.whatsapp_templates TO service_role;

ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read whatsapp_templates"
  ON public.whatsapp_templates FOR SELECT USING (true);
CREATE POLICY "Authenticated manage whatsapp_templates"
  ON public.whatsapp_templates FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 4. Seed dos templates de WhatsApp
INSERT INTO public.whatsapp_templates (tipo, titulo, texto) VALUES
('geracao_2dias','Verificar geração (+2 dias)','Olá [nome]! 🌞 Passando para verificar se o sistema está funcionando bem. Consegue ver a geração no app?'),
('geracao_7dias','Verificar geração (+7 dias)','Olá [nome]! 😊 Já faz uma semana desde a instalação. O sistema está gerando energia normalmente? Alguma dúvida sobre o monitoramento?'),
('conta_1','Solicitar 1ª conta de luz','Olá [nome]! Sua 1ª conta de luz após a instalação já deve ter chegado. Pode nos enviar para acompanharmos juntos? 📄☀️'),
('geracao_1mes','Verificar geração 1 mês','Olá [nome]! 🌞 Seu sistema completou 1 mês em operação! Está gostando? 😁'),
('conta_2','Solicitar 2ª conta de luz','Olá [nome]! A 2ª conta já chegou? Manda pra gente ver como ficou a compensação! 📄'),
('geracao_2meses','Verificar geração 2 meses','Olá [nome]! Dois meses de energia solar! O sistema segue gerando bem. Alguma dúvida ou observação? ☀️'),
('conta_3','Solicitar 3ª conta de luz','Olá [nome]! A 3ª conta chegou? Com ela já conseguimos ver o sistema estabilizado. Manda pra gente! 📄😊'),
('geracao_3meses_google','Verificar geração 3 meses + Avaliação Google','Olá [nome]! 3 meses de energia solar e tudo funcionando! 🌞 Que tal compartilhar sua experiência no Google? Ajuda muita gente a conhecer a energia solar! [link avaliação]'),
('geracao_6meses','Verificar geração 6 meses','Olá [nome]! Meio ano de energia solar! 🎉 Está tudo bem por aí? Alguma dúvida? ☀️'),
('aniversario_1ano','Verificar geração 1 ano + Indicação','Olá [nome]! Seu sistema solar completa 1 ano hoje! 🎂☀️ Foi incrível acompanhar sua economia. Lembre que temos amigos e familiares que também podem se beneficiar — conheça nosso programa de indicação!'),
('geracao_15meses','Verificar geração 15 meses','Olá [nome]! 🌞 Passando para checar seu sistema solar. Está tudo gerando bem por aí?'),
('geracao_18meses','Verificar geração 18 meses','Olá [nome]! 🌞 Passando para checar seu sistema solar. Está tudo gerando bem por aí?'),
('geracao_21meses','Verificar geração 21 meses','Olá [nome]! 🌞 Passando para checar seu sistema solar. Está tudo gerando bem por aí?'),
('geracao_24meses','Verificar geração 24 meses (2 anos)','Olá [nome]! 2 anos de energia solar! 🎉 Seu sistema segue firme gerando economia. Qualquer dúvida estamos aqui! ☀️'),
('geracao_27meses','Verificar geração 27 meses','Olá [nome]! 🌞 Passando para checar seu sistema solar. Está tudo gerando bem por aí?'),
('geracao_30meses','Verificar geração 30 meses','Olá [nome]! 🌞 Passando para checar seu sistema solar. Está tudo gerando bem por aí?'),
('geracao_33meses','Verificar geração 33 meses','Olá [nome]! 🌞 Passando para checar seu sistema solar. Está tudo gerando bem por aí?'),
('geracao_36meses','Verificar geração 36 meses (encerramento)','Olá [nome]! 3 anos de energia solar! 🌞 Foi uma honra acompanhar sua jornada. Seu sistema segue funcionando e gerando economia. Qualquer novidade, estamos aqui! 💚')
ON CONFLICT (tipo) DO NOTHING;

-- 5. Atualiza trigger de seed do rastreamento (fluxo 3 agora com 8 etapas)
CREATE OR REPLACE FUNCTION public.seed_rastreamento_obras()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.rastreamento_obras (projeto_id, fluxo, etapa, concluido, visivel_cliente)
  VALUES
    (NEW.id,1,1,false,true),(NEW.id,1,2,false,true),(NEW.id,1,3,false,true),
    (NEW.id,2,1,false,true),(NEW.id,2,2,false,true),(NEW.id,2,3,false,true),(NEW.id,2,4,false,true),
    (NEW.id,3,1,false,true),(NEW.id,3,2,false,true),(NEW.id,3,3,false,true),(NEW.id,3,4,false,true),
    (NEW.id,3,5,false,true),(NEW.id,3,6,false,true),(NEW.id,3,7,false,true),(NEW.id,3,8,false,true)
  ON CONFLICT (projeto_id, fluxo, etapa) DO NOTHING;
  RETURN NEW;
END;
$function$;