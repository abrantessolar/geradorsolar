export interface Servico {
  slug: string;
  route: string;
  emoji: string;
  title: string;
  cardResumo: string;
  seoTitle: string;
  seoDescription: string;
  heroSubtitle: string;
  heroDestaque?: string;
  oQueE: string;
  quandoContratar: string[];
  comoFunciona: string[];
  whatsappMsg: string;
}

const WHATS = '5567996448995';
export const waLink = (msg: string) =>
  `https://wa.me/${WHATS}?text=${encodeURIComponent(msg)}`;

export const SERVICOS: Servico[] = [
  {
    slug: 'analise-de-demanda',
    route: '/servicos/analise-de-demanda',
    emoji: '⚡',
    title: 'Análise e Ajuste de Demanda',
    cardResumo: 'Reduza sua demanda contratada e pague menos na conta de luz do seu negócio.',
    seoTitle: 'Análise e Ajuste de Demanda | Três Lagoas Solar',
    seoDescription: 'Reduza sua demanda contratada e economize na conta de luz da sua empresa. Análise técnica especializada em Três Lagoas/MS.',
    heroSubtitle: 'Análise técnica da sua demanda contratada para reduzir custos fixos na conta de luz da sua empresa.',
    oQueE: 'A demanda contratada é um valor fixo que empresas pagam à distribuidora independente do consumo real. Uma análise criteriosa pode identificar se sua empresa está pagando mais do que deveria — e quanto pode economizar ajustando esse valor.',
    quandoContratar: [
      'Sua empresa tem medidor de demanda (geralmente acima de 75 kVA)',
      'Você percebe que a demanda medida é sempre menor que a contratada',
      'Vai instalar energia solar e quer otimizar o contrato antes',
      'Recebeu multa por ultrapassagem de demanda',
    ],
    comoFunciona: [
      'Coletamos suas faturas dos últimos 12 meses',
      'Analisamos o perfil de demanda da sua instalação',
      'Calculamos o valor ideal a contratar',
      'Acompanhamos o processo de ajuste com a distribuidora',
    ],
    whatsappMsg: 'Olá! Gostaria de saber mais sobre análise e ajuste de demanda para minha empresa.',
  },
  {
    slug: 'grid-zero',
    route: '/servicos/grid-zero',
    emoji: '🔌',
    title: 'Sistema Grid Zero',
    cardResumo: 'Independência total da rede elétrica com sistema solar + banco de baterias.',
    seoTitle: 'Sistema Grid Zero | Três Lagoas Solar',
    seoDescription: 'Independência total da rede elétrica com solar + baterias. Ideal para área rural e locais sem energia em Três Lagoas/MS.',
    heroSubtitle: 'Sistema solar híbrido com banco de baterias para autonomia energética completa.',
    oQueE: 'O sistema Grid Zero combina painéis solares com banco de baterias para que sua propriedade produza e armazene energia suficiente para operar sem depender da rede elétrica — ideal para áreas rurais, locais com fornecimento instável ou quem deseja autonomia energética total.',
    quandoContratar: [
      'Propriedade rural sem acesso à rede elétrica',
      'Região com frequentes quedas de energia',
      'Alto custo de extensão da rede até o local',
      'Busca por autonomia e independência energética',
      'Gerador a diesel com custo operacional alto',
    ],
    comoFunciona: [
      'Levantamento do consumo e perfil de uso da propriedade',
      'Dimensionamento do sistema solar e banco de baterias',
      'Instalação e configuração do sistema híbrido',
      'Monitoramento e suporte pós-instalação',
    ],
    whatsappMsg: 'Olá! Tenho interesse em um sistema Grid Zero para minha propriedade. Pode me ajudar?',
  },
  {
    slug: 'adequacao-bombeiro',
    route: '/servicos/adequacao-bombeiro',
    emoji: '🚒',
    title: 'Adequação às Normas do Corpo de Bombeiros',
    cardResumo: 'Regularize sua instalação solar perante o Corpo de Bombeiros e evite multas e interdições.',
    seoTitle: 'Adequação Corpo de Bombeiros | Três Lagoas Solar',
    seoDescription: 'Regularize sua instalação solar perante o Corpo de Bombeiros. AVCB e laudos de conformidade em Três Lagoas/MS.',
    heroSubtitle: 'Projeto, adequação técnica e aprovação junto ao Corpo de Bombeiros.',
    oQueE: 'Sistemas de energia solar podem exigir aprovação e adequação junto ao Corpo de Bombeiros, especialmente em instalações comerciais, industriais e edificações com maior área construída. A Três Lagoas Solar auxilia todo o processo de documentação, adequação técnica e aprovação.',
    quandoContratar: [
      'Instalação comercial ou industrial',
      'Edificação com AVCB vencido ou nunca emitido',
      'Bombeiros exigiram adequação do sistema solar',
      'Reforma ou ampliação de instalação existente',
      'Imóvel em processo de regularização junto à prefeitura',
    ],
    comoFunciona: [
      'Vistoria técnica da instalação',
      'Elaboração do projeto de adequação conforme normas',
      'Submissão e acompanhamento junto ao Corpo de Bombeiros',
      'Emissão do AVCB ou laudo de conformidade',
    ],
    whatsappMsg: 'Olá! Preciso adequar minha instalação solar às normas do Corpo de Bombeiros. Podem me ajudar?',
  },
  {
    slug: 'homologacao-solar',
    route: '/servicos/homologacao-solar',
    emoji: '📋',
    title: 'Homologação de Sistemas Solares',
    cardResumo: 'Homologamos seu sistema solar junto à distribuidora com agilidade e segurança.',
    seoTitle: 'Homologação de Sistema Solar | Três Lagoas Solar',
    seoDescription: 'Homologamos seu sistema solar junto à Elektro, Energisa e demais distribuidoras. Agilidade e segurança em Três Lagoas/MS.',
    heroSubtitle: 'Projeto elétrico e homologação junto à distribuidora de energia.',
    oQueE: 'A homologação é o processo oficial de aprovação do sistema solar pela distribuidora de energia — sem ela o sistema não pode injetar energia na rede. Cuidamos de toda a documentação técnica, projeto elétrico e acompanhamento até a liberação.',
    quandoContratar: [
      'Sistema instalado por outra empresa e ainda não homologado',
      'Ampliação de sistema já existente',
      'Homologação travada ou com pendências na distribuidora',
      'Necessidade de projeto elétrico para aprovação',
    ],
    comoFunciona: [
      'Análise da documentação existente e da instalação',
      'Elaboração ou correção do projeto elétrico',
      'Protocolo junto à distribuidora (Elektro, Energisa, CPFL, etc.)',
      'Acompanhamento até a aprovação e vistoria',
    ],
    whatsappMsg: 'Olá! Preciso homologar um sistema solar. Podem me ajudar com o processo?',
  },
  {
    slug: 'regularize-seu-projeto',
    route: '/servicos/regularize-seu-projeto',
    emoji: '⚠️',
    title: 'Regularize seu Projeto',
    cardResumo: 'Seu sistema solar foi instalado mas nunca regularizado? A gente resolve.',
    seoTitle: 'Regularize seu Sistema Solar | Três Lagoas Solar',
    seoDescription: 'Sistema solar instalado sem homologação? A gente regulariza. Atendemos Três Lagoas e região, independente de quem instalou.',
    heroSubtitle: 'Regularização completa de sistemas solares instalados sem homologação.',
    heroDestaque: 'Não importa quem instalou — a gente regulariza.',
    oQueE: 'Muitos sistemas solares no Brasil foram instalados sem a devida homologação junto à distribuidora ou sem o projeto elétrico aprovado. Isso impede a injeção de créditos na rede e pode gerar problemas legais. A Três Lagoas Solar regulariza sua situação do zero.',
    quandoContratar: [
      'Sistema instalado há meses ou anos sem homologação',
      'Medidor não foi trocado pela distribuidora',
      'Não está recebendo créditos de energia na conta de luz',
      'Instalação feita por empresa que não finalizou o processo',
      'Documentação perdida ou nunca elaborada',
    ],
    comoFunciona: [
      'Diagnóstico completo da situação atual',
      'Levantamento técnico da instalação existente',
      'Elaboração de toda a documentação necessária',
      'Regularização junto à distribuidora e demais órgãos competentes',
    ],
    whatsappMsg: 'Olá! Tenho um sistema solar instalado mas nunca regularizado. Preciso de ajuda para regularizar.',
  },
];

export const getServicoBySlug = (slug: string) =>
  SERVICOS.find(s => s.slug === slug);
