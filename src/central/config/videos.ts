// Vídeos usados entre etapas (VideoStep) e nos cases de prova social
// (TestimonialCase). Tudo aqui é opcional: com enabled:false ou src vazio,
// o componente correspondente pula direto para o próximo passo — então a
// Central funciona de ponta a ponta mesmo antes de existir material em
// vídeo de verdade. Quando os vídeos reais chegarem, basta preencher src/
// thumbnail e virar enabled:true, sem tocar em nenhum componente.

export interface VideoDef {
  enabled: boolean;
  src: string;
  thumbnail?: string;
  title: string;
  category?: string;
  description?: string;
}

export const videos: Record<string, VideoDef> = {
  wifiTutorial: {
    enabled: false,
    src: '',
    title: 'Como reconectar o monitoramento ao trocar o Wi-Fi',
    category: 'Tutorial',
  },
};

export const testimonialCases: Record<string, VideoDef> = {
  residencial: {
    enabled: false,
    src: '',
    title: 'Conta alta + muito uso de ar-condicionado',
    category: 'Residencial',
    description: 'Como um cliente resolveu a conta de energia sem abrir mão do conforto.',
  },
  empresa: {
    enabled: false,
    src: '',
    title: 'Redução de custo operacional',
    category: 'Empresa',
    description: 'Como uma empresa local reduziu o custo de energia na operação.',
  },
  hibrido: {
    enabled: false,
    src: '',
    title: 'Energia solar + bateria',
    category: 'Sistema híbrido',
    description: 'Como funciona um sistema híbrido com bateria na prática.',
  },
};
