CREATE TABLE public.faq (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setor text NOT NULL DEFAULT 'geral',
  pergunta text NOT NULL,
  resposta text NOT NULL,
  visivel_cliente boolean NOT NULL DEFAULT true,
  visivel_site boolean NOT NULL DEFAULT true,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.faq TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faq TO authenticated;
GRANT ALL ON public.faq TO service_role;

ALTER TABLE public.faq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active faq"
  ON public.faq FOR SELECT TO anon
  USING (ativo = true);

CREATE POLICY "Authenticated can view all faq"
  ON public.faq FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage faq"
  ON public.faq FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_faq_updated_at
  BEFORE UPDATE ON public.faq
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.faq (setor, pergunta, resposta, ordem) VALUES
('fila_instalacao', 'Qual é a previsão de instalação do meu sistema solar?', 'Nosso prazo para o sistema estar instalado e operando é de <strong>30 a 40 dias</strong>, dentro dessa previsão. Esse prazo já considera períodos de chuva, que interferem no trabalho em telhado. Assim que tivermos a data exata da instalação, avisamos você.', 1),

('concessionaria', 'A Elektro avisa quando vai fazer a vistoria?', 'Geralmente a Elektro <strong>não avisa</strong>. Orientamos considerar que a vistoria pode acontecer até o último dia útil do prazo informado. Se o relógio estiver voltado para a rua, a troca pode ser feita sem ninguém em casa. Se precisar entrar no imóvel, é importante ter um adulto no local ou deixar um recado no padrão com telefone para contato.', 1),
('concessionaria', 'Como pegar a conta de luz depois de instalar energia solar?', 'Após instalar o sistema solar, você pode não receber mais a fatura impressa. Acesse por um destes canais:<ul><li>App <strong>Neoenergia</strong></li><li>WhatsApp da Elektro: <strong>(19) 2122-1696</strong></li><li>Portal <a href="https://agenciavirtual.neoenergia.com" target="_blank" rel="noopener noreferrer">agenciavirtual.neoenergia.com</a></li></ul>Para dúvidas, entre em contato conosco.', 2),
('concessionaria', 'Como cadastrar unidade beneficiária na Elektro?', 'Ligue para <strong>0800 020 1200</strong>, de segunda a sexta das 7h às 19h (horário de Brasília — em MS, 1h antes). Informe a unidade geradora e as beneficiárias, e escolha a forma de compensação: por percentual ou por prioridade. Em 1 a 2 ciclos de faturamento os créditos já aparecem. <strong>Anote o protocolo</strong> enviado por SMS.', 3),
('concessionaria', 'Como parar de enviar créditos para uma beneficiária?', 'Ligue para <strong>0800 020 1200</strong> e solicite o descadastro da unidade beneficiária. Em 1 a 2 ciclos de faturamento a alteração já aparece nas compensações. Anote sempre o protocolo enviado por SMS.', 4),
('concessionaria', 'Como fazer troca de titularidade da conta de luz?', 'Ligue para <strong>0800 701 0102</strong>. Tenha em mãos:<ul><li>CPF, nome completo e data de nascimento do novo titular</li><li>Endereço e código da instalação</li><li>E-mail, telefone e leitura do medidor</li></ul>Não pode haver conta em aberto para realizar a troca.', 5),
('concessionaria', 'O que fazer em caso de falta de energia na rede da Elektro?', 'Ligue para <strong>0800 701 0102</strong>, escolha a opção de falta de energia e informe o número da instalação ou CPF/CNPJ. Anote sempre o número do protocolo.', 6),

('financiamento', 'Como pegar o boleto do financiamento pela BV Financeira?', 'Pelo WhatsApp do BV: acesse <strong>"Ver opções" → "Financiamento Solar" → "Segunda via de boleto"</strong>. Pelo app "banco BV": vá em Financiamentos → "2ª via de boleto". Ou acesse <a href="https://bv.com.br/boleto" target="_blank" rel="noopener noreferrer">bv.com.br/boleto</a>.', 1),
('financiamento', 'Como pegar o boleto do financiamento pela Solfácil?', 'O boleto chega automaticamente por e-mail. Você também pode acessar <a href="https://cliente.solfacil.com.br" target="_blank" rel="noopener noreferrer">cliente.solfacil.com.br</a> e fazer login com seu CPF e data de nascimento como senha (no primeiro acesso).', 2),
('financiamento', 'Como pegar o boleto do financiamento pelo Santander?', 'Acesse <a href="https://santanderfinanciamentos.com.br" target="_blank" rel="noopener noreferrer">santanderfinanciamentos.com.br</a>, informe o CPF, selecione <strong>"Não Correntista Santander"</strong> e faça o primeiro acesso. Os dados devem ser os mesmos da conta de energia usada na contratação. Você também pode usar o app Santander Financiamentos.', 3),
('financiamento', 'Como antecipar ou quitar parcelas do financiamento BV?', 'Pelo app "banco BV": vá em <strong>Meus Contratos → Antecipar</strong>. Para quitar: Meus Contratos → Quitar financiamento. Também pode fazer pelo WhatsApp do BV enviando "Quero antecipar parcelas".', 4),

('tecnico', 'Qual a capacidade máxima de produção diária das placas?', 'A produção varia conforme clima, época do ano e intensidade do sol. Em boas condições, cada placa pode gerar <strong>pouco mais de 3 kWh por dia</strong>. O mais correto é analisar a média mensal, não apenas um dia isolado.', 1),
('tecnico', 'Se eu aumentar meu sistema solar, perco o benefício da GD1?', 'Não totalmente. O que já está homologado permanece como <strong>GD1</strong> e somente a parte ampliada segue as regras atuais. Qualquer ampliação precisa ser solicitada e aprovada pela distribuidora antes da execução.', 2),
('tecnico', 'Quais informações precisam para analisar uma ampliação do sistema?', 'Precisamos de:<ul><li>Fotos da frente, etiqueta lateral e cabos do inversor</li><li>Quantidade e potência das placas atuais</li><li>Local da instalação (telhado ou solo)</li><li>Quantas placas deseja adicionar e fotos do local</li></ul>Se preferir, podemos agendar uma visita técnica.', 3),

('documentos', 'Como assinar digitalmente um documento?', 'Assista ao tutorial em <a href="https://youtu.be/_ErV89hf3ks" target="_blank" rel="noopener noreferrer">youtu.be/_ErV89hf3ks</a> — é bem simples e pode ser feito pelo celular ou computador. Qualquer dúvida nos chame.', 1),
('documentos', 'Como exportar a CNH digital?', 'Entre em contato conosco que enviamos o passo a passo completo.', 2),

('fiscal_nf', 'Quais dados são necessários para emissão de nota fiscal de serviço?', 'Precisamos de:<ul><li>CEP, rua, número, bairro, cidade e estado</li><li>CPF e nome completo</li><li>E-mail</li></ul>Envie essas informações pelo WhatsApp.', 1);