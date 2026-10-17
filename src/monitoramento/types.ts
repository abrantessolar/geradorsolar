// Central de Monitoramento TLS — tipos do módulo (isolado do fluxo de
// proposta ongrid). Nenhuma tabela aqui tem tipos gerados pelo Supabase
// client ainda (mesmo padrão de `clientes_base`/`tarefas_posvenda`: acesso
// via `.from('mon_x' as any)`), então os tipos abaixo são a fonte da
// verdade no front.

export type MonMarca = 'foxess' | 'solarman' | 'solis' | 'sofarcloud' | 'hoymiles';

export type MonEstadoDiario = 'normal' | 'baixo_desempenho' | 'sem_geracao' | 'offline';

export type MonTipoChamado = 'offline' | 'sem_geracao' | 'baixo_desempenho' | 'solicitado_cliente';

export type MonEtapaChamado = 'novo' | 'contato_feito' | 'aguardando_cliente' | 'visita_agendada' | 'resolvido';

export interface MonUsina {
  id: string;
  marca: MonMarca;
  id_externo: string;
  sn_inversor: string | null;
  modelo: string | null;
  kwp: number | null;
  cidade: string | null;
  data_instalacao: string | null;
  cliente_base_id: string | null;
  ativo: boolean;
  vinculo_confirmado: boolean;
  estado_atual: MonEstadoDiario;
  estado_atualizado_em: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface MonLeitura {
  id: number;
  usina_id: string;
  coletado_em: string;
  potencia_w: number | null;
  energia_dia_kwh: number | null;
  energia_total_kwh: number | null;
  online: boolean;
  alarmes: string[];
}

export interface MonDiario {
  id: string;
  usina_id: string;
  data: string;
  kwh: number | null;
  kwh_por_kwp: number | null;
  mediana_cidade: number | null;
  esperado_hsp: number | null;
  desvio_pct: number | null;
  estado: MonEstadoDiario;
}

export interface MonChamado {
  id: string;
  usina_id: string;
  cliente_base_id: string | null;
  tipo: MonTipoChamado;
  etapa: MonEtapaChamado;
  responsavel: string | null;
  aberto_em: string;
  resolvido_em: string | null;
  resolucao: 'auto' | 'manual' | null;
  prazo: string | null;
}

export interface MonChamadoEvento {
  id: string;
  chamado_id: string;
  tipo: 'contato' | 'mudanca_etapa' | 'observacao' | 'visita_agendada';
  mensagem: string | null;
  usuario_id: string | null;
  criado_em: string;
}

export interface MonGuiaReconexao {
  id: string;
  marca: MonMarca;
  modelo: string | null;
  titulo: string;
  conteudo: string;
  ordem: number;
  criado_em: string;
  atualizado_em: string;
}

// Formato padronizado que todo adaptador de fabricante devolve — ver
// especificação, seção 3.1. Usado hoje só do lado da edge function
// (supabase/functions/mon-coleta), mas mantido aqui também como
// referência/documentação do contrato.
export interface LeituraNormalizada {
  marca: MonMarca;
  id_externo_usina: string;
  sn_inversor: string | null;
  potencia_atual_w: number | null;
  energia_hoje_kwh: number | null;
  energia_total_kwh: number | null;
  ultima_comunicacao: string | null;
  status_inversor: string | null;
  // Sinal de conectividade puro, desacoplado de status_inversor (fix
  // 2026-10-17 — ver comentário em mon-coleta/index.ts).
  online: boolean;
  alarmes: string[];
}

// Cliente mínimo usado nas sugestões de vínculo (vem de `clientes_base`).
export interface ClienteBaseResumo {
  id: string;
  nome_completo: string | null;
  endereco: string | null;
  uc: string | null;
}
