// Central Inteligente — tipos centrais
//
// Tudo que o motor de perguntas (CentralEngine) e a configuração (flow.ts,
// contacts.ts, scoring.ts, etc.) precisam. Mantido deliberadamente simples:
// a árvore de telas inteira é dado (StepDef[]), não componentes.

export type DestinationKey = 'commercial' | 'externalSupport' | 'customerSupport' | 'general' | 'supplier';

export type CustomerStatus = 'customer' | 'external_system' | 'new' | 'supplier' | null;

/** Intenção detectada — alimenta o motor de roteamento (resolveDestination). */
export type Intent =
  | 'service' // suporte/manutenção/dúvida em sistema já existente
  | 'quote' // orçamento novo (fluxo B)
  | 'upgrade' // ampliação, bateria, novo projeto para quem já tem sistema
  | 'supplier_offer'
  | null;

export interface LeadData {
  nome?: string;
  whatsapp?: string;
  empresa?: string;
  site?: string;
  catalogo?: string;
}

export interface UtmData {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
  src?: string; // parâmetro simplificado (?src=instagram)
}

export interface CentralSession {
  sessionId: string;
  startedAt: string;
  utm: UtmData;
  entryPath: 'customer' | 'quote' | 'external_system' | 'supplier' | null;
  customerStatus: CustomerStatus;
  intent: Intent;
  /** true quando o usuário clicou em "Falar com alguém agora" — sempre vence o roteamento. */
  talkNow: boolean;
  /** Respostas livres, por chave de step/campo — usadas para montar a mensagem de WhatsApp. */
  answers: Record<string, string>;
  consumptionRange?: string;
  priority?: 'responsabilidade' | 'preco';
  excitement?: number;
  /** Diagnóstico acumulado mostrado como chips ("Seu diagnóstico"), chave = step id. */
  chips: Record<string, string>;
  videosViewed: string[];
  filesAttached: string[];
  lead: LeadData;
  score: number;
  destination: DestinationKey | null;
  completed: boolean;
  /** Histórico de steps visitados, para o botão Voltar. */
  history: string[];
  currentStep: string;
}

export type StepKind =
  | 'choice'
  | 'scale'
  | 'text'
  | 'video'
  | 'testimonials'
  | 'fileUpload'
  | 'info'
  | 'result';

export interface OptionDef {
  id: string;
  label: string;
  sublabel?: string;
  /** Nome de ícone lucide-react (opcional, usado sobretudo na tela inicial). */
  icon?: string;
  /** Próximo step ao escolher esta opção. */
  goto: string;
  /** Mescla nos campos "de topo" da sessão (customerStatus, intent, priority...). */
  patch?: Partial<Pick<CentralSession, 'customerStatus' | 'intent' | 'priority' | 'entryPath'>>;
  /** Guarda a resposta (rótulo amigável) em session.answers[answerKey ?? step.id]. */
  answerKey?: string;
  /** Rótulo curto mostrado na barra de "Seu diagnóstico" (chips). Omitir = não gera chip. */
  chip?: string;
  /** Pontos de score somados ao escolher esta opção. */
  score?: number;
}

export interface ScaleMilestone {
  value: number;
  label: string;
  /** Nome de ícone lucide-react mostrado na célula/leitura deste marco. */
  icon?: string;
  /** Rótulo curto para a barra de chips — só os marcos "quentes" costumam ter um. */
  chip?: string;
}

export interface StepDef {
  id: string;
  kind: StepKind;
  title: string;
  subtitle?: string;
  options?: OptionDef[];
  /** kind 'scale' */
  milestones?: ScaleMilestone[];
  /** kind 'scale' — para onde ir depois, pode depender do valor escolhido. */
  gotoForValue?: (value: number) => string;
  /** kind 'text' / 'info' */
  placeholder?: string;
  answerKey?: string;
  next?: string;
  /** kind 'fileUpload' */
  uploadPrompt?: string;
  uploadOptionalLabel?: string;
  /** kind 'video' */
  videoKey?: string;
  /** kind 'testimonials' */
  testimonialKeys?: string[];
  /** kind 'result' */
  resultVariant?: 'commercial' | 'support' | 'supplier';
}
