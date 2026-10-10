// Árvore de estados da Central Inteligente — a "fonte da verdade" do funil.
// Cada tela é um StepDef neste mapa. Trocar pergunta, texto, opção ou
// destino de uma etapa é editar este arquivo; nenhum componente precisa
// mudar (seção 30/39 da spec: "não hardcodear o funil em componentes").
import { StepDef } from '../types';

export const STEPS: Record<string, StepDef> = {
  // ---------------------------------------------------------------------
  // TELA INICIAL
  // ---------------------------------------------------------------------
  home: {
    id: 'home',
    kind: 'choice',
    title: 'Como podemos te ajudar hoje?',
    options: [
      {
        id: 'home_a', label: 'Já sou cliente da Três Lagoas Solar',
        sublabel: 'Suporte, pós-venda, manutenção, monitoramento, fatura, garantia ou melhorias no sistema.',
        icon: 'UserCheck', goto: 'A',
        patch: { customerStatus: 'customer', entryPath: 'customer' },
      },
      {
        id: 'home_b', label: 'Quero um orçamento',
        sublabel: 'Descobrir qual solução faz sentido para minha casa, empresa ou propriedade.',
        icon: 'Sun', goto: 'B',
        patch: { customerStatus: 'new', intent: 'quote', entryPath: 'quote' },
      },
      {
        id: 'home_c', label: 'Meu sistema foi instalado por outra empresa e preciso de ajuda',
        sublabel: 'Manutenção, diagnóstico, monitoramento, ampliação, homologação ou recuperação do sistema.',
        icon: 'Wrench', goto: 'C',
        patch: { customerStatus: 'external_system', entryPath: 'external_system' },
      },
      {
        id: 'home_d', label: 'Quero vender para a Três Lagoas Solar / Sou fornecedor',
        sublabel: 'Apresentar produtos, serviços ou oportunidades comerciais.',
        icon: 'Handshake', goto: 'D',
        patch: { customerStatus: 'supplier', entryPath: 'supplier' },
      },
    ],
  },

  // ---------------------------------------------------------------------
  // FLUXO A — JÁ SOU CLIENTE
  // ---------------------------------------------------------------------
  A: {
    id: 'A', kind: 'choice', title: 'O que você precisa hoje?',
    options: [
      { id: 'A1', label: 'Meu sistema parece estar com problema', goto: 'A1', patch: { intent: 'service' } },
      { id: 'A2', label: 'Acho que meu sistema está gerando menos do que deveria', goto: 'A2', patch: { intent: 'service' } },
      { id: 'A3', label: 'Preciso de ajuda com o aplicativo / monitoramento', goto: 'A3', patch: { intent: 'service' } },
      { id: 'A4', label: 'Quero entender minha conta de energia', goto: 'A4', patch: { intent: 'service' } },
      { id: 'A5', label: 'Quero limpeza / manutenção preventiva', goto: 'A5', patch: { intent: 'service' } },
      { id: 'A6', label: 'Quero melhorar ou ampliar meu sistema', goto: 'A6', patch: { intent: 'upgrade' } },
      { id: 'A7', label: 'Quero falar sobre garantia ou seguro', goto: 'A7', patch: { intent: 'service' } },
      { id: 'A8', label: 'É outra coisa', goto: 'A8', patch: { intent: 'service' } },
    ],
  },

  A1: {
    id: 'A1', kind: 'choice', title: 'O que você percebeu?', answerKey: 'A1',
    options: [
      { id: 'a1_1', label: 'Inversor desligado', goto: 'A1_photo', answerKey: 'A1' },
      { id: 'a1_2', label: 'Está aparecendo um alarme/erro', goto: 'A1_photo', answerKey: 'A1' },
      { id: 'a1_3', label: 'Aplicativo mostra sistema offline', goto: 'A1_photo', answerKey: 'A1' },
      { id: 'a1_4', label: 'Algumas coisas funcionam, outras não', goto: 'A1_photo', answerKey: 'A1' },
      { id: 'a1_5', label: 'O problema começou depois de chuva/queda de energia', goto: 'A1_photo', answerKey: 'A1' },
      { id: 'a1_6', label: 'Não sei dizer, só percebi que algo está errado', goto: 'A1_photo', answerKey: 'A1' },
    ],
  },
  A1_photo: {
    id: 'A1_photo', kind: 'choice', title: 'Consegue mandar uma foto do inversor ou da mensagem de erro?',
    options: [
      { id: 'a1p_sim', label: 'Sim', goto: 'A1_upload' },
      { id: 'a1p_nao', label: 'Agora não', goto: 'result' },
    ],
  },
  A1_upload: {
    id: 'A1_upload', kind: 'fileUpload', title: 'Envie a foto',
    uploadPrompt: 'Foto do inversor ou da mensagem de erro', next: 'result',
  },

  A2: {
    id: 'A2', kind: 'choice', title: 'O que fez você desconfiar?', answerKey: 'A2',
    options: [
      { id: 'a2_1', label: 'Minha conta aumentou', goto: 'A2_consumo', answerKey: 'A2' },
      { id: 'a2_2', label: 'O aplicativo mostra pouca geração', goto: 'A2_consumo', answerKey: 'A2' },
      { id: 'a2_3', label: 'Comparei com meses anteriores', goto: 'A2_consumo', answerKey: 'A2' },
      { id: 'a2_4', label: 'Meu consumo mudou', goto: 'A2_consumo', answerKey: 'A2' },
      { id: 'a2_5', label: 'Só quero confirmar se está tudo certo', goto: 'A2_consumo', answerKey: 'A2' },
    ],
  },
  A2_consumo: {
    id: 'A2_consumo', kind: 'choice', title: 'Seu consumo aumentou recentemente?',
    subtitle: 'Ar-condicionado, piscina, freezer, veículo elétrico, ampliação da empresa etc.',
    options: [
      { id: 'a2c_sim', label: 'Sim', goto: 'A2_upload' },
      { id: 'a2c_nao', label: 'Não', goto: 'A2_upload' },
      { id: 'a2c_nsei', label: 'Não sei', goto: 'A2_upload' },
    ],
  },
  A2_upload: {
    id: 'A2_upload', kind: 'fileUpload', title: 'Envie sua fatura ou um print da geração (opcional)',
    uploadPrompt: 'Fatura ou print da geração', next: 'result',
  },

  A3: {
    id: 'A3', kind: 'choice', title: 'Qual é o problema?', answerKey: 'A3',
    options: [
      { id: 'a3_1', label: 'Não consigo entrar', goto: 'result', answerKey: 'A3' },
      { id: 'a3_2', label: 'Esqueci usuário/senha', goto: 'result', answerKey: 'A3' },
      { id: 'a3_3', label: 'Troquei o Wi-Fi', goto: 'A3_video', answerKey: 'A3' },
      { id: 'a3_4', label: 'Sistema aparece offline', goto: 'result', answerKey: 'A3' },
      { id: 'a3_5', label: 'Troquei de celular', goto: 'result', answerKey: 'A3' },
      { id: 'a3_6', label: 'Quero colocar o aplicativo em outro aparelho', goto: 'result', answerKey: 'A3' },
      { id: 'a3_7', label: 'Quero entender os dados que aparecem', goto: 'result', answerKey: 'A3' },
      { id: 'a3_8', label: 'Outro', goto: 'result', answerKey: 'A3' },
    ],
  },
  A3_video: { id: 'A3_video', kind: 'video', title: 'Um tutorial rápido antes de continuar', videoKey: 'wifiTutorial', next: 'result' },

  A4: {
    id: 'A4', kind: 'choice', title: 'O que chamou sua atenção?', answerKey: 'A4',
    options: [
      { id: 'a4_1', label: 'Minha conta veio mais alta', goto: 'A4_upload', answerKey: 'A4' },
      { id: 'a4_2', label: 'Ainda estou pagando energia mesmo com solar', goto: 'A4_upload', answerKey: 'A4' },
      { id: 'a4_3', label: 'Não entendi os créditos', goto: 'A4_upload', answerKey: 'A4' },
      { id: 'a4_4', label: 'Não entendi o fio B', goto: 'A4_upload', answerKey: 'A4' },
      { id: 'a4_5', label: 'Tenho créditos, mas não sei onde foram usados', goto: 'A4_upload', answerKey: 'A4' },
      { id: 'a4_6', label: 'Tenho mais de uma unidade consumidora', goto: 'A4_upload', answerKey: 'A4' },
      { id: 'a4_7', label: 'Quero uma análise completa', goto: 'A4_upload', answerKey: 'A4' },
    ],
  },
  A4_upload: { id: 'A4_upload', kind: 'fileUpload', title: 'Envie uma foto ou PDF da sua conta', uploadPrompt: 'Foto ou PDF da conta', next: 'result' },

  A5: {
    id: 'A5', kind: 'choice', title: 'O que você procura?', answerKey: 'A5',
    options: [
      { id: 'a5_1', label: 'Limpeza das placas', goto: 'A5_ultima', answerKey: 'A5' },
      { id: 'a5_2', label: 'Revisão preventiva', goto: 'A5_ultima', answerKey: 'A5' },
      { id: 'a5_3', label: 'Termografia', goto: 'A5_ultima', answerKey: 'A5' },
      { id: 'a5_4', label: 'Revisão elétrica', goto: 'A5_ultima', answerKey: 'A5' },
      { id: 'a5_5', label: 'Conferência de geração', goto: 'A5_ultima', answerKey: 'A5' },
      { id: 'a5_6', label: 'Pacote completo', goto: 'A5_ultima', answerKey: 'A5' },
    ],
  },
  A5_ultima: {
    id: 'A5_ultima', kind: 'choice', title: 'Quando foi a última limpeza?', answerKey: 'A5_ultima',
    options: [
      { id: 'a5u_1', label: 'Menos de 6 meses', goto: 'result', answerKey: 'A5_ultima' },
      { id: 'a5u_2', label: '6 a 12 meses', goto: 'result', answerKey: 'A5_ultima' },
      { id: 'a5u_3', label: 'Mais de 1 ano', goto: 'result', answerKey: 'A5_ultima' },
      { id: 'a5u_4', label: 'Nunca', goto: 'result', answerKey: 'A5_ultima' },
      { id: 'a5u_5', label: 'Não sei', goto: 'result', answerKey: 'A5_ultima' },
    ],
  },

  A6: {
    id: 'A6', kind: 'choice', title: 'O que você gostaria de fazer?', answerKey: 'A6',
    options: [
      { id: 'a6_1', label: 'Colocar mais placas', goto: 'result', answerKey: 'A6' },
      { id: 'a6_2', label: 'Quero usar mais ar-condicionado', goto: 'result', answerKey: 'A6' },
      { id: 'a6_3', label: 'Quero adicionar bateria', goto: 'result', answerKey: 'A6' },
      { id: 'a6_4', label: 'Quero continuar com energia quando faltar luz', goto: 'result', answerKey: 'A6' },
      { id: 'a6_5', label: 'Vou comprar carro elétrico', goto: 'result', answerKey: 'A6' },
      { id: 'a6_6', label: 'Construí/ampliei o imóvel', goto: 'result', answerKey: 'A6' },
      { id: 'a6_7', label: 'Instalei piscina', goto: 'result', answerKey: 'A6' },
      { id: 'a6_8', label: 'Minha empresa aumentou o consumo', goto: 'result', answerKey: 'A6' },
      { id: 'a6_9', label: 'Quero saber quais upgrades são possíveis', goto: 'result', answerKey: 'A6' },
    ],
  },

  A7: {
    id: 'A7', kind: 'choice', title: 'O que você precisa?', answerKey: 'A7',
    options: [
      { id: 'a7_1', label: 'Tenho dúvida sobre garantia', goto: 'result', answerKey: 'A7' },
      { id: 'a7_2', label: 'Preciso acionar garantia', goto: 'result', answerKey: 'A7' },
      { id: 'a7_3', label: 'Quero contratar seguro', goto: 'result', answerKey: 'A7' },
      { id: 'a7_4', label: 'Preciso acionar seguro', goto: 'result', answerKey: 'A7' },
      { id: 'a7_5', label: 'Outro', goto: 'result', answerKey: 'A7' },
    ],
  },

  A8: { id: 'A8', kind: 'text', title: 'Conte rapidamente o que você precisa.', answerKey: 'A8', next: 'result', placeholder: 'Escreva aqui...' },

  // ---------------------------------------------------------------------
  // FLUXO B — QUERO UM ORÇAMENTO
  // ---------------------------------------------------------------------
  B: {
    id: 'B', kind: 'choice', title: 'O que você quer resolver?', answerKey: 'B',
    options: [
      { id: 'b1', label: 'Reduzir minha conta de energia', goto: 'B_consumo', answerKey: 'B' },
      { id: 'b2', label: 'Usar mais ar-condicionado sem medo da conta', goto: 'B_consumo', answerKey: 'B' },
      { id: 'b3', label: 'Ter energia mesmo quando faltar luz', goto: 'B_consumo', answerKey: 'B' },
      { id: 'b4', label: 'Reduzir o custo da minha empresa', goto: 'B_consumo', answerKey: 'B' },
      { id: 'b5', label: 'Energia para propriedade rural', goto: 'B_consumo', answerKey: 'B' },
      { id: 'b6', label: 'Quero ampliar um sistema que já tenho', goto: 'B_consumo', answerKey: 'B' },
      { id: 'b7', label: 'Meu consumo é muito alto / Grupo A', goto: 'B_consumo', answerKey: 'B' },
      { id: 'b8', label: 'Ainda não sei. Quero descobrir o que faz sentido', goto: 'B_consumo', answerKey: 'B' },
    ],
  },

  B_consumo: {
    id: 'B_consumo', kind: 'choice', title: 'Qual dessas situações mais parece com a sua?',
    options: [
      {
        id: 'b_c1', label: 'Minha conta fica entre R$ 250 e R$ 600',
        sublabel: 'ou eu gostaria de usar mais o ar-condicionado sem medo da conta',
        goto: 'B_priority', patch: { intent: 'quote' }, chip: 'Conta R$ 250–600',
      },
      { id: 'b_c2', label: 'Minha conta fica entre R$ 600 e R$ 1.000', goto: 'B_priority', patch: { intent: 'quote' }, chip: 'Conta R$ 600–1.000' },
      { id: 'b_c3', label: 'Minha conta fica entre R$ 1.000 e R$ 3.000', goto: 'B_priority', patch: { intent: 'quote' }, chip: 'Conta R$ 1.000–3.000' },
      { id: 'b_c4', label: 'Meu consumo é ainda maior', goto: 'B_priority', patch: { intent: 'quote' }, chip: 'Consumo acima de R$ 3.000' },
    ],
  },

  B_priority: {
    id: 'B_priority', kind: 'choice', title: 'Na hora de escolher quem vai instalar seu sistema, qual dessas opções combina mais com você?',
    options: [
      { id: 'b_p1', label: 'Quero uma empresa local, responsável pela instalação e pelo pós-venda', goto: 'B_excitement', patch: { priority: 'responsabilidade' }, chip: 'Prefere empresa local' },
      { id: 'b_p2', label: 'Meu foco principal é conseguir o menor orçamento possível', goto: 'B_excitement', patch: { priority: 'preco' }, chip: 'Foco no orçamento' },
    ],
  },

  B_excitement: {
    id: 'B_excitement', kind: 'scale', title: 'Agora seja sincero…',
    subtitle: 'O quanto você está empolgado para ter sua própria usina de energia solar?',
    milestones: [
      { value: 1, label: 'Só estou dando uma olhada' },
      { value: 3, label: 'Tenho curiosidade' },
      { value: 6, label: 'Já estou considerando de verdade', chip: 'Considerando de verdade' },
      { value: 9, label: 'Quero colocar solar', chip: 'Quer colocar solar' },
      { value: 10, label: 'Se os números fizerem sentido, quero resolver isso', chip: 'Pronto para decidir' },
    ],
    gotoForValue: (v) => (v <= 3 ? 'B_low' : 'B_testimonials'),
  },

  B_low: {
    id: 'B_low', kind: 'choice', title: 'Sem problema.',
    subtitle: 'Muita gente começa apenas pesquisando. Quer descobrir em menos de 1 minuto se energia solar realmente faria sentido para você?',
    options: [
      { id: 'b_low_sim', label: 'Sim, quero descobrir', goto: 'B_educational' },
      { id: 'b_low_nao', label: 'Agora não', goto: 'lead' },
    ],
  },

  B_educational: {
    id: 'B_educational', kind: 'info', title: 'Um jeito simples de pensar nisso',
    subtitle: 'Muitas pessoas reduzem o uso de ar-condicionado por medo da conta. Um projeto bem dimensionado pode ser pensado considerando o consumo que você gostaria de ter, e não apenas o consumo atual.',
    next: 'lead',
  },

  B_testimonials: {
    id: 'B_testimonials', kind: 'testimonials', title: 'Você está no mesmo ponto em que muitos dos nossos clientes começaram.',
    subtitle: 'Veja histórias parecidas com a sua',
    testimonialKeys: ['residencial', 'empresa', 'hibrido'], next: 'lead',
  },

  lead: {
    id: 'lead', kind: 'lead', title: 'Pronto. Já conseguimos entender seu perfil.',
    subtitle: 'Para onde podemos continuar sua análise?',
    leadFields: ['nome', 'whatsapp'], leadButtonLabel: 'RECEBER MINHA ANÁLISE', next: 'result',
  },

  // ---------------------------------------------------------------------
  // FLUXO C — SISTEMA INSTALADO POR OUTRA EMPRESA
  // ---------------------------------------------------------------------
  C: {
    id: 'C', kind: 'choice', title: 'Pode contar com a gente.',
    subtitle: 'Não fomos nós que instalamos? Sem problema. Primeiro vamos entender o que está acontecendo.',
    options: [
      { id: 'C1', label: 'Meu sistema parou de gerar', goto: 'C1', patch: { intent: 'service' } },
      { id: 'C2', label: 'Está gerando menos do que deveria', goto: 'C2', patch: { intent: 'service' } },
      { id: 'C3', label: 'Não tenho acesso ao monitoramento', goto: 'C3', patch: { intent: 'service' } },
      { id: 'C4', label: 'Não entendo minha conta de energia', goto: 'C4', patch: { intent: 'service' } },
      { id: 'C5', label: 'Preciso de manutenção/reparo', goto: 'C5', patch: { intent: 'service' } },
      { id: 'C6', label: 'Quero limpeza/revisão', goto: 'C6', patch: { intent: 'service' } },
      { id: 'C7', label: 'Quero ampliar meu sistema', goto: 'C7', patch: { intent: 'upgrade' } },
      { id: 'C8', label: 'Quero adicionar bateria / backup', goto: 'C8', patch: { intent: 'upgrade' } },
      { id: 'C9', label: 'Tenho problema com projeto/homologação', goto: 'C9', patch: { intent: 'service' } },
      { id: 'C10', label: 'A empresa que instalou sumiu / fechou', goto: 'C10', patch: { intent: 'service' } },
      { id: 'C11', label: 'Meu problema é outro', goto: 'C11', patch: { intent: 'service' } },
    ],
  },

  C1: {
    id: 'C1', kind: 'choice', title: 'O inversor está ligado?', answerKey: 'C1',
    options: [
      { id: 'c1_sim', label: 'Sim', goto: 'C1_erro', answerKey: 'C1' },
      { id: 'c1_nao', label: 'Não', goto: 'C1_marca', answerKey: 'C1' },
      { id: 'c1_nsei', label: 'Não sei', goto: 'C1_marca', answerKey: 'C1' },
    ],
  },
  C1_erro: {
    id: 'C1_erro', kind: 'choice', title: 'Ele apresenta alguma luz vermelha ou mensagem de erro?',
    options: [
      { id: 'c1e_sim', label: 'Sim', goto: 'C1_foto' },
      { id: 'c1e_nao', label: 'Não', goto: 'C1_marca' },
    ],
  },
  C1_foto: { id: 'C1_foto', kind: 'fileUpload', title: 'Tire uma foto da tela ou dos LEDs.', uploadPrompt: 'Foto da tela ou dos LEDs', next: 'C1_marca' },
  C1_marca: {
    id: 'C1_marca', kind: 'choice', title: 'Qual é a marca do inversor?', answerKey: 'C1_marca',
    options: [
      { id: 'c1m_1', label: 'Solis', goto: 'result', answerKey: 'C1_marca' },
      { id: 'c1m_2', label: 'GoodWe', goto: 'result', answerKey: 'C1_marca' },
      { id: 'c1m_3', label: 'Growatt', goto: 'result', answerKey: 'C1_marca' },
      { id: 'c1m_4', label: 'Deye', goto: 'result', answerKey: 'C1_marca' },
      { id: 'c1m_5', label: 'Sofar', goto: 'result', answerKey: 'C1_marca' },
      { id: 'c1m_6', label: 'Hoymiles', goto: 'result', answerKey: 'C1_marca' },
      { id: 'c1m_7', label: 'WEG', goto: 'result', answerKey: 'C1_marca' },
      { id: 'c1m_8', label: 'Outro', goto: 'result', answerKey: 'C1_marca' },
      { id: 'c1m_9', label: 'Não sei', goto: 'result', answerKey: 'C1_marca' },
    ],
  },

  C2: {
    id: 'C2', kind: 'choice', title: 'O que fez você notar isso?', answerKey: 'C2',
    options: [
      { id: 'c2_1', label: 'Minha conta aumentou', goto: 'result', answerKey: 'C2' },
      { id: 'c2_2', label: 'O aplicativo mostra pouca geração', goto: 'result', answerKey: 'C2' },
      { id: 'c2_3', label: 'Comparei com meses anteriores', goto: 'result', answerKey: 'C2' },
      { id: 'c2_4', label: 'Não sei, quero confirmar', goto: 'result', answerKey: 'C2' },
    ],
  },

  C3: {
    id: 'C3', kind: 'choice', title: 'O que está acontecendo?', answerKey: 'C3',
    options: [
      { id: 'c3_1', label: 'Não tenho login/senha', goto: 'result', answerKey: 'C3' },
      { id: 'c3_2', label: 'Nunca recebi acesso', goto: 'result', answerKey: 'C3' },
      { id: 'c3_3', label: 'O aplicativo não abre', goto: 'result', answerKey: 'C3' },
      { id: 'c3_4', label: 'Não sei quem instalou o monitoramento', goto: 'result', answerKey: 'C3' },
    ],
  },

  C4: {
    id: 'C4', kind: 'choice', title: 'O que você não está entendendo na sua conta?', answerKey: 'C4',
    options: [
      { id: 'c4_1', label: 'Minha conta veio mais alta', goto: 'result', answerKey: 'C4' },
      { id: 'c4_2', label: 'Ainda estou pagando energia mesmo com solar', goto: 'result', answerKey: 'C4' },
      { id: 'c4_3', label: 'Não entendi os créditos', goto: 'result', answerKey: 'C4' },
      { id: 'c4_4', label: 'Quero uma análise completa', goto: 'result', answerKey: 'C4' },
    ],
  },

  C5: {
    id: 'C5', kind: 'choice', title: 'O que você precisa?', answerKey: 'C5',
    options: [
      { id: 'c5_1', label: 'Limpeza', goto: 'result', answerKey: 'C5' },
      { id: 'c5_2', label: 'Revisão elétrica', goto: 'result', answerKey: 'C5' },
      { id: 'c5_3', label: 'Reparo', goto: 'result', answerKey: 'C5' },
      { id: 'c5_4', label: 'Não sei, preciso de um diagnóstico', goto: 'result', answerKey: 'C5' },
    ],
  },

  C6: {
    id: 'C6', kind: 'choice', title: 'Quando foi a última limpeza ou revisão?', answerKey: 'C6',
    options: [
      { id: 'c6_1', label: 'Menos de 6 meses', goto: 'result', answerKey: 'C6' },
      { id: 'c6_2', label: '6 a 12 meses', goto: 'result', answerKey: 'C6' },
      { id: 'c6_3', label: 'Mais de 1 ano', goto: 'result', answerKey: 'C6' },
      { id: 'c6_4', label: 'Nunca', goto: 'result', answerKey: 'C6' },
      { id: 'c6_5', label: 'Não sei', goto: 'result', answerKey: 'C6' },
    ],
  },

  C7: {
    id: 'C7', kind: 'choice', title: 'O que você gostaria de ampliar?', answerKey: 'C7',
    options: [
      { id: 'c7_1', label: 'Mais placas', goto: 'result', answerKey: 'C7' },
      { id: 'c7_2', label: 'Mais potência', goto: 'result', answerKey: 'C7' },
      { id: 'c7_3', label: 'Não sei, quero avaliar', goto: 'result', answerKey: 'C7' },
    ],
  },

  C8: {
    id: 'C8', kind: 'choice', title: 'O que você procura?', answerKey: 'C8',
    options: [
      { id: 'c8_1', label: 'Bateria para backup', goto: 'result', answerKey: 'C8' },
      { id: 'c8_2', label: 'Energia quando faltar luz', goto: 'result', answerKey: 'C8' },
      { id: 'c8_3', label: 'Sistema híbrido completo', goto: 'result', answerKey: 'C8' },
      { id: 'c8_4', label: 'Não sei, quero entender as opções', goto: 'result', answerKey: 'C8' },
    ],
  },

  C9: {
    id: 'C9', kind: 'choice', title: 'Qual é o problema?', answerKey: 'C9',
    options: [
      { id: 'c9_1', label: 'Projeto não foi aprovado', goto: 'result', answerKey: 'C9' },
      { id: 'c9_2', label: 'Não sei se foi homologado', goto: 'result', answerKey: 'C9' },
      { id: 'c9_3', label: 'Documentação pendente', goto: 'result', answerKey: 'C9' },
      { id: 'c9_4', label: 'Outro', goto: 'result', answerKey: 'C9' },
    ],
  },

  C10: { id: 'C10', kind: 'text', title: 'Conte rapidamente o que aconteceu.', answerKey: 'C10', next: 'result', placeholder: 'Escreva aqui...' },
  C11: { id: 'C11', kind: 'text', title: 'Conte rapidamente o que você precisa.', answerKey: 'C11', next: 'result', placeholder: 'Escreva aqui...' },

  // ---------------------------------------------------------------------
  // FLUXO D — FORNECEDOR
  // ---------------------------------------------------------------------
  D: {
    id: 'D', kind: 'choice', title: 'Legal. O que você oferece?', answerKey: 'D',
    options: [
      { id: 'd1', label: 'Equipamentos para energia solar', sublabel: 'Módulos, inversores, baterias, microinversores, estruturas etc.', goto: 'D_atende_solar', answerKey: 'D' },
      { id: 'd2', label: 'Materiais elétricos', sublabel: 'Cabos, proteções, quadros, eletrocalhas, conectores etc.', goto: 'D_atende_solar', answerKey: 'D' },
      { id: 'd3', label: 'Serviço / mão de obra', sublabel: 'Instalação, engenharia, manutenção, obras, munck, máquinas, terraplanagem etc.', goto: 'D_atende_solar', answerKey: 'D' },
      { id: 'd4', label: 'Marketing / tecnologia / software', sublabel: 'Agências, sistemas, automação, IA, CRM, telefonia etc.', goto: 'D_atende_solar', answerKey: 'D' },
      { id: 'd5', label: 'Logística / transporte', sublabel: 'Frete, entregas, caminhões, transporte de equipamentos etc.', goto: 'D_atende_solar', answerKey: 'D' },
      { id: 'd6', label: 'Financeiro / crédito / consórcio', sublabel: 'Bancos, cooperativas, financeiras ou soluções de pagamento.', goto: 'D_atende_solar', answerKey: 'D' },
      { id: 'd7', label: 'Outro produto ou serviço', goto: 'D_atende_solar', answerKey: 'D' },
    ],
  },
  D_atende_solar: {
    id: 'D_atende_solar', kind: 'choice', title: 'Sua empresa já atende o setor de energia solar?',
    options: [
      { id: 'das_sim', label: 'Sim', goto: 'D_atende_regiao' },
      { id: 'das_nao', label: 'Não', goto: 'D_atende_regiao' },
    ],
  },
  D_atende_regiao: {
    id: 'D_atende_regiao', kind: 'choice', title: 'Você atende Três Lagoas e região?',
    options: [
      { id: 'dar_sim', label: 'Sim', goto: 'D_apresentar' },
      { id: 'dar_nao', label: 'Não', goto: 'D_apresentar' },
    ],
  },
  D_apresentar: {
    id: 'D_apresentar', kind: 'text', title: 'O que você quer nos apresentar?', answerKey: 'D_apresentar',
    placeholder: 'Escreva aqui...', next: 'leadSupplier',
  },
  leadSupplier: {
    id: 'leadSupplier', kind: 'lead', title: 'Quase lá.', subtitle: 'Para continuarmos, deixe seus dados de contato.',
    leadFields: ['nome', 'empresa', 'whatsapp', 'site', 'catalogo'], leadButtonLabel: 'ENVIAR APRESENTAÇÃO', next: 'result',
  },

  // ---------------------------------------------------------------------
  // RESULTADO
  // ---------------------------------------------------------------------
  result: { id: 'result', kind: 'result', title: 'Recebemos suas informações.' },
};

export const START_STEP = 'home';
