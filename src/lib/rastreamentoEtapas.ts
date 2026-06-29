// Estrutura fixa dos 3 fluxos de rastreamento de obra.
// Compartilhada entre o Kanban interno e a página pública.

export type CampoEspecial = 'local_entrega' | 'numero_fila' | 'data_agendamento' | 'data_operacao';

export interface EtapaDef {
  etapa: number;
  titulo: string;
  /** Etapa só aparece quando ativada internamente (campo_extra.ativada = true) */
  condicional?: boolean;
  /** Campo extra editável associado a esta etapa */
  campo?: CampoEspecial;
}

export interface FluxoDef {
  fluxo: number;
  titulo: string;
  icone: string;
  /** Macro-etapa do Kanban correspondente */
  coluna: 'homologacao' | 'equipamentos' | 'instalacao';
  etapas: EtapaDef[];
}

export const FLUXOS: FluxoDef[] = [
  {
    fluxo: 1,
    titulo: 'Homologação',
    icone: '📄',
    coluna: 'homologacao',
    etapas: [
      { etapa: 1, titulo: 'Documentação recebida' },
      { etapa: 2, titulo: 'Projeto protocolado' },
      { etapa: 3, titulo: 'Projeto aprovado' },
      { etapa: 4, titulo: 'Projeto aprovado com troca', condicional: true },
    ],
  },
  {
    fluxo: 2,
    titulo: 'Equipamentos',
    icone: '📦',
    coluna: 'equipamentos',
    etapas: [
      { etapa: 1, titulo: 'Pedido de compra realizado' },
      { etapa: 2, titulo: 'Equipamento pago' },
      { etapa: 3, titulo: 'Em transporte' },
      { etapa: 4, titulo: 'Material entregue', campo: 'local_entrega' },
    ],
  },
  {
    fluxo: 3,
    titulo: 'Instalação',
    icone: '⚡',
    coluna: 'instalacao',
    etapas: [
      { etapa: 1, titulo: 'Aguardando instalação', campo: 'numero_fila' },
      { etapa: 2, titulo: 'Instalação agendada', campo: 'data_agendamento' },
      { etapa: 3, titulo: 'Instalação finalizada' },
      { etapa: 4, titulo: 'Explicar funcionamento, chaves de segurança, DPS e afins' },
      { etapa: 5, titulo: 'Conectar logger no WiFi' },
      { etapa: 6, titulo: 'Criar planta no monitoramento' },
      { etapa: 7, titulo: 'Adicionar datalogger' },
      { etapa: 8, titulo: 'Apresentar app de monitoramento ao cliente' },
    ],
  },
];

/**
 * Mapeamento etapa → coluna canônica na tabela `projetos`.
 * Fonte única de verdade: o valor preenchido no Acompanhamento mora aqui
 * (e não mais em rastreamento_obras.campo_extra), refletindo automaticamente
 * na edição do projeto/cliente e no "Ver dados".
 */
export interface CampoCanonicoDef {
  fluxo: number;
  etapa: number;
  /** comportamento do campo */
  tipo: 'data_auto' | 'int' | 'date' | 'local' | 'wifi' | 'planta' | 'fornecedor';
  /** coluna principal em projetos */
  coluna: string;
}

export const CAMPOS_CANONICOS: CampoCanonicoDef[] = [
  { fluxo: 1, etapa: 2, tipo: 'data_auto', coluna: 'projeto_enviado_em' },
  { fluxo: 1, etapa: 3, tipo: 'data_auto', coluna: 'projeto_aprovado' },
  { fluxo: 2, etapa: 1, tipo: 'fornecedor', coluna: 'distribuidor' },
  { fluxo: 2, etapa: 4, tipo: 'local', coluna: 'local_entrega' },
  { fluxo: 3, etapa: 1, tipo: 'int', coluna: 'numero_fila' },
  { fluxo: 3, etapa: 2, tipo: 'date', coluna: 'data_agendamento' },
  { fluxo: 3, etapa: 3, tipo: 'data_auto', coluna: 'data_instalacao' },
  { fluxo: 3, etapa: 5, tipo: 'wifi', coluna: 'wifi_nome' },
  { fluxo: 3, etapa: 6, tipo: 'planta', coluna: 'nome_planta' },
];

export function getCampoCanonico(fluxo: number, etapa: number): CampoCanonicoDef | undefined {
  return CAMPOS_CANONICOS.find(c => c.fluxo === fluxo && c.etapa === etapa);
}

export const KANBAN_COLUNAS: { key: string; titulo: string }[] = [
  { key: 'homologacao', titulo: 'Homologação' },
  { key: 'equipamentos', titulo: 'Equipamentos' },
  { key: 'instalacao', titulo: 'Instalação' },
  { key: 'concluido', titulo: 'Concluído' },
];

export interface RastreamentoRow {
  id: string;
  projeto_id: string;
  fluxo: number;
  etapa: number;
  concluido: boolean;
  data_conclusao: string | null;
  visivel_cliente: boolean;
  observacao_interna: string | null;
  campo_extra: Record<string, any> | null;
  usuario_id?: string | null;
}

export function getEtapaDef(fluxo: number, etapa: number): EtapaDef | undefined {
  return FLUXOS.find(f => f.fluxo === fluxo)?.etapas.find(e => e.etapa === etapa);
}

/** Gera as linhas padrão (sem a etapa condicional) para semear um projeto */
export function defaultEtapasSeed(projetoId: string) {
  const rows: any[] = [];
  for (const f of FLUXOS) {
    for (const e of f.etapas) {
      if (e.condicional) continue; // só criada quando ativada internamente
      rows.push({
        projeto_id: projetoId,
        fluxo: f.fluxo,
        etapa: e.etapa,
        concluido: false,
        visivel_cliente: true,
      });
    }
  }
  return rows;
}

/** Define em qual coluna do Kanban o projeto está, a partir das etapas concluídas */
export function colunaAtual(rows: RastreamentoRow[]): string {
  const done = (fluxo: number, etapa: number) =>
    rows.some(r => r.fluxo === fluxo && r.etapa === etapa && r.concluido);

  if (done(3, 4)) return 'concluido';
  // Está em "instalação" se qualquer etapa do fluxo 3 começou ou os fluxos anteriores concluíram
  const f3Started = rows.some(r => r.fluxo === 3 && r.concluido);
  const f2Started = rows.some(r => r.fluxo === 2 && r.concluido);
  const f1Started = rows.some(r => r.fluxo === 1 && r.concluido);
  if (f3Started) return 'instalacao';
  if (f2Started) return 'equipamentos';
  if (f1Started) return 'homologacao';
  return 'homologacao';
}
