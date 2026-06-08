// Pós-venda: geração automática de tarefas de acompanhamento (3 anos),
// substituição de variáveis e construção do link de WhatsApp.

import { supabase } from '@/integrations/supabase/client';

export type TarefaTipo =
  | 'verificar_geracao'
  | 'solicitar_conta'
  | 'avaliacao_google'
  | 'indicacao'
  | 'encerramento';

export interface TarefaPosVenda {
  id: string;
  projeto_id: string;
  fase: number;
  tipo: TarefaTipo;
  template_key: string | null;
  descricao: string;
  data_programada: string; // yyyy-mm-dd
  visivel_cliente: boolean;
  concluido: boolean;
  data_conclusao: string | null;
  usuario_id: string | null;
  observacao: string | null;
  adiamentos: number;
  criado_em: string;
}

export const TIPO_LABEL: Record<TarefaTipo, string> = {
  verificar_geracao: 'Verificar geração',
  solicitar_conta: 'Solicitar conta de luz',
  avaliacao_google: 'Avaliação Google',
  indicacao: 'Indicação',
  encerramento: 'Encerramento',
};

export const TIPO_ICONE: Record<TarefaTipo, string> = {
  verificar_geracao: '🌞',
  solicitar_conta: '📄',
  avaliacao_google: '⭐',
  indicacao: '🤝',
  encerramento: '🎉',
};

interface PlanoItem {
  fase: number;
  tipo: TarefaTipo;
  template_key: string;
  descricao: string;
  visivel_cliente: boolean;
  /** dias após a instalação OU null se usar conta de luz */
  dias?: number;
  /** meses após a instalação (usado nos checkpoints trimestrais) */
  meses?: number;
  /** nº da conta de luz (1, 2, 3) — calcula com base no dia_leitura */
  conta?: number;
}

const PLANO: PlanoItem[] = [
  // FASE 2 — Primeiros contatos
  { fase: 2, tipo: 'verificar_geracao', template_key: 'geracao_2dias', descricao: 'Verificar geração (+2 dias)', visivel_cliente: false, dias: 2 },
  { fase: 2, tipo: 'verificar_geracao', template_key: 'geracao_7dias', descricao: 'Verificar geração (+7 dias)', visivel_cliente: false, dias: 7 },
  { fase: 2, tipo: 'solicitar_conta', template_key: 'conta_1', descricao: 'Solicitar 1ª conta de luz', visivel_cliente: true, conta: 1 },
  { fase: 2, tipo: 'verificar_geracao', template_key: 'geracao_1mes', descricao: 'Verificar geração 1 mês', visivel_cliente: false, dias: 30 },
  { fase: 2, tipo: 'solicitar_conta', template_key: 'conta_2', descricao: 'Solicitar 2ª conta de luz', visivel_cliente: true, conta: 2 },
  { fase: 2, tipo: 'verificar_geracao', template_key: 'geracao_2meses', descricao: 'Verificar geração 2 meses', visivel_cliente: false, dias: 60 },
  { fase: 2, tipo: 'solicitar_conta', template_key: 'conta_3', descricao: 'Solicitar 3ª conta de luz', visivel_cliente: true, conta: 3 },
  { fase: 2, tipo: 'avaliacao_google', template_key: 'geracao_3meses_google', descricao: 'Verificar geração 3 meses + Avaliação Google', visivel_cliente: false, dias: 90 },
  // FASE 3 — Acompanhamento
  { fase: 3, tipo: 'verificar_geracao', template_key: 'geracao_6meses', descricao: 'Verificar geração 6 meses', visivel_cliente: false, dias: 180 },
  { fase: 3, tipo: 'indicacao', template_key: 'aniversario_1ano', descricao: 'Verificar geração 1 ano + Indicação', visivel_cliente: false, dias: 365 },
  // FASE 4 — Trimestral (anos 2 e 3)
  { fase: 4, tipo: 'verificar_geracao', template_key: 'geracao_15meses', descricao: 'Verificar geração 15 meses', visivel_cliente: false, meses: 15 },
  { fase: 4, tipo: 'verificar_geracao', template_key: 'geracao_18meses', descricao: 'Verificar geração 18 meses', visivel_cliente: false, meses: 18 },
  { fase: 4, tipo: 'verificar_geracao', template_key: 'geracao_21meses', descricao: 'Verificar geração 21 meses', visivel_cliente: false, meses: 21 },
  { fase: 4, tipo: 'verificar_geracao', template_key: 'geracao_24meses', descricao: 'Verificar geração 24 meses (2 anos)', visivel_cliente: false, meses: 24 },
  { fase: 4, tipo: 'verificar_geracao', template_key: 'geracao_27meses', descricao: 'Verificar geração 27 meses', visivel_cliente: false, meses: 27 },
  { fase: 4, tipo: 'verificar_geracao', template_key: 'geracao_30meses', descricao: 'Verificar geração 30 meses', visivel_cliente: false, meses: 30 },
  { fase: 4, tipo: 'verificar_geracao', template_key: 'geracao_33meses', descricao: 'Verificar geração 33 meses', visivel_cliente: false, meses: 33 },
  { fase: 4, tipo: 'encerramento', template_key: 'geracao_36meses', descricao: 'Verificar geração 36 meses (encerramento)', visivel_cliente: false, meses: 36 },
];

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}
/** Data de solicitação da Nª conta: dia_leitura no mês (instalação + N), +5 dias */
function dataConta(instalacao: Date, diaLeitura: number, contaN: number): Date {
  const base = addMonths(instalacao, contaN);
  const dia = Math.min(Math.max(diaLeitura || instalacao.getDate(), 1), 28);
  const leitura = new Date(base.getFullYear(), base.getMonth(), dia);
  return addDays(leitura, 5);
}

/**
 * Gera (se ainda não existirem) todas as tarefas de pós-venda para um projeto.
 * Retorna a quantidade criada.
 */
export async function gerarTarefasPosVenda(opts: {
  projetoId: string;
  dataInstalacao: Date;
  diaLeitura: number | null;
  usuarioId?: string | null;
}): Promise<number> {
  const { projetoId, dataInstalacao, diaLeitura } = opts;

  // Evita duplicar
  const { count } = await supabase
    .from('tarefas_posvenda' as any)
    .select('id', { count: 'exact', head: true })
    .eq('projeto_id', projetoId);
  if ((count || 0) > 0) return 0;

  const dia = diaLeitura ?? dataInstalacao.getDate();
  const rows = PLANO.map((p) => {
    let data: Date;
    if (p.conta) data = dataConta(dataInstalacao, dia, p.conta);
    else if (p.meses != null) data = addMonths(dataInstalacao, p.meses);
    else data = addDays(dataInstalacao, p.dias || 0);
    return {
      projeto_id: projetoId,
      fase: p.fase,
      tipo: p.tipo,
      template_key: p.template_key,
      descricao: p.descricao,
      data_programada: toISODate(data),
      visivel_cliente: p.visivel_cliente,
      concluido: false,
      adiamentos: 0,
    };
  });

  const { error } = await supabase.from('tarefas_posvenda' as any).insert(rows);
  if (error) throw error;
  return rows.length;
}

/** Substitui variáveis [nome] e [link avaliação] no texto */
export function aplicarVariaveis(texto: string, nome: string, googleLink: string): string {
  return (texto || '')
    .replace(/\[nome\]/gi, nome || 'cliente')
    .replace(/\[link avaliação\]/gi, googleLink || '')
    .replace(/\[link avaliacao\]/gi, googleLink || '');
}

/** Monta o link wa.me com o texto pré-preenchido */
export function montarLinkWhatsApp(telefone: string | null, texto: string): string {
  let num = (telefone || '').replace(/\D/g, '');
  if (num && num.length <= 11) num = '55' + num;
  const base = num ? `https://wa.me/${num}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(texto)}`;
}
