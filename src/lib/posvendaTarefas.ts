// Pós-venda: geração automática de tarefas de acompanhamento (3 anos),
// substituição de variáveis e construção do link de WhatsApp.

import { supabase } from '@/integrations/supabase/client';

export type TarefaTipo =
  | 'verificar_geracao'
  | 'solicitar_conta'
  | 'avaliacao_google'
  | 'indicacao'
  | 'aniversario'
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
  aguardando_leitura: boolean;
  criado_em: string;
}

export const TIPO_LABEL: Record<TarefaTipo, string> = {
  verificar_geracao: 'Verificar geração',
  solicitar_conta: 'Solicitar conta de luz',
  avaliacao_google: 'Avaliação Google',
  indicacao: 'Indicação',
  aniversario: 'Aniversário',
  encerramento: 'Encerramento',
};

export const TIPO_ICONE: Record<TarefaTipo, string> = {
  verificar_geracao: '🌞',
  solicitar_conta: '📄',
  avaliacao_google: '⭐',
  indicacao: '🤝',
  aniversario: '🎂',
  encerramento: '🎉',
};

interface PlanoItem {
  fase: number;
  tipo: TarefaTipo;
  template_key: string;
  descricao: string;
  visivel_cliente: boolean;
  /** dias fixos após a instalação (usado nos lembretes +2 e +7 dias) */
  dias?: number;
  /** nº da conta de luz âncora (1, 2, 3, 6, 12, 15…36) */
  conta?: number;
  /** deslocamento em dias em relação à data da conta (ex.: -3 = geração, +3 = avaliação) */
  offsetDias?: number;
}

const PLANO: PlanoItem[] = [
  // FASE 2 — Primeiros contatos
  { fase: 2, tipo: 'verificar_geracao', template_key: 'geracao_2dias', descricao: 'Verificar geração (+2 dias)', visivel_cliente: false, dias: 2 },
  { fase: 2, tipo: 'verificar_geracao', template_key: 'geracao_7dias', descricao: 'Verificar geração (+7 dias)', visivel_cliente: false, dias: 7 },
  { fase: 2, tipo: 'verificar_geracao', template_key: 'geracao_1mes', descricao: 'Verificar geração — mês 1', visivel_cliente: false, conta: 1, offsetDias: -3 },
  { fase: 2, tipo: 'solicitar_conta', template_key: 'conta_1', descricao: 'Solicitar 1ª conta de luz', visivel_cliente: true, conta: 1, offsetDias: 0 },
  { fase: 2, tipo: 'verificar_geracao', template_key: 'geracao_2meses', descricao: 'Verificar geração — mês 2', visivel_cliente: false, conta: 2, offsetDias: -3 },
  { fase: 2, tipo: 'solicitar_conta', template_key: 'conta_2', descricao: 'Solicitar 2ª conta de luz', visivel_cliente: true, conta: 2, offsetDias: 0 },
  { fase: 2, tipo: 'verificar_geracao', template_key: 'geracao_3meses', descricao: 'Verificar geração — mês 3', visivel_cliente: false, conta: 3, offsetDias: -3 },
  { fase: 2, tipo: 'solicitar_conta', template_key: 'conta_3', descricao: 'Solicitar 3ª conta de luz', visivel_cliente: true, conta: 3, offsetDias: 0 },
  { fase: 2, tipo: 'avaliacao_google', template_key: 'geracao_3meses_google', descricao: 'Avaliação Google', visivel_cliente: false, conta: 3, offsetDias: 3 },
  // FASE 3 — Acompanhamento
  { fase: 3, tipo: 'verificar_geracao', template_key: 'geracao_6meses', descricao: 'Verificar geração 6 meses', visivel_cliente: false, conta: 6, offsetDias: -3 },
  { fase: 3, tipo: 'indicacao', template_key: 'aniversario_1ano', descricao: 'Verificar geração 1 ano + Indicação', visivel_cliente: false, conta: 12, offsetDias: -3 },
  // FASE 4 — Trimestral (anos 2 e 3)
  { fase: 4, tipo: 'verificar_geracao', template_key: 'geracao_15meses', descricao: 'Verificar geração 15 meses', visivel_cliente: false, conta: 15, offsetDias: -3 },
  { fase: 4, tipo: 'verificar_geracao', template_key: 'geracao_18meses', descricao: 'Verificar geração 18 meses', visivel_cliente: false, conta: 18, offsetDias: -3 },
  { fase: 4, tipo: 'verificar_geracao', template_key: 'geracao_21meses', descricao: 'Verificar geração 21 meses', visivel_cliente: false, conta: 21, offsetDias: -3 },
  { fase: 4, tipo: 'verificar_geracao', template_key: 'geracao_24meses', descricao: 'Verificar geração 24 meses (2 anos)', visivel_cliente: false, conta: 24, offsetDias: -3 },
  { fase: 4, tipo: 'verificar_geracao', template_key: 'geracao_27meses', descricao: 'Verificar geração 27 meses', visivel_cliente: false, conta: 27, offsetDias: -3 },
  { fase: 4, tipo: 'verificar_geracao', template_key: 'geracao_30meses', descricao: 'Verificar geração 30 meses', visivel_cliente: false, conta: 30, offsetDias: -3 },
  { fase: 4, tipo: 'verificar_geracao', template_key: 'geracao_33meses', descricao: 'Verificar geração 33 meses', visivel_cliente: false, conta: 33, offsetDias: -3 },
  { fase: 4, tipo: 'encerramento', template_key: 'geracao_36meses', descricao: 'Verificar geração 36 meses (encerramento)', visivel_cliente: false, conta: 36, offsetDias: -3 },
];

/** Mapa template_key → item do plano (para sincronização e exibição de contexto). */
const PLANO_POR_KEY: Record<string, PlanoItem> = Object.fromEntries(
  PLANO.map((p) => [p.template_key, p]),
);

/** Info da conta âncora de um template (ou null se for lembrete fixo/sem conta). */
export function contaInfoDoTemplate(
  templateKey: string | null | undefined,
): { conta: number; offsetDias: number } | null {
  if (!templateKey) return null;
  const p = PLANO_POR_KEY[templateKey];
  if (!p || p.conta == null) return null;
  return { conta: p.conta, offsetDias: p.offsetDias || 0 };
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

/** Data programada de um item do plano dada a instalação e o dia de leitura. */
function dataDoItem(p: PlanoItem, instalacao: Date, diaLeitura: number): Date {
  if (p.conta != null) return addDays(dataConta(instalacao, diaLeitura, p.conta), p.offsetDias || 0);
  return addDays(instalacao, p.dias || 0);
}

export interface TarefaRow {
  fase: number;
  tipo: TarefaTipo;
  template_key: string;
  descricao: string;
  data_programada: string;
  visivel_cliente: boolean;
  concluido: boolean;
  adiamentos: number;
  aguardando_leitura: boolean;
}

/** Próximo aniversário (mês/dia da data de nascimento) a partir de uma data de referência. */
function proximoAniversario(ref: Date, nascimento: Date): Date {
  let d = new Date(ref.getFullYear(), nascimento.getMonth(), nascimento.getDate());
  if (d.getTime() < ref.getTime()) d = new Date(ref.getFullYear() + 1, nascimento.getMonth(), nascimento.getDate());
  return d;
}

/**
 * Constrói as linhas de tarefas do plano de pós-venda para uma data de
 * instalação. Se `onlyFuture` for true, ignora as datas que já passaram
 * (lembretes aguardando dia de leitura são sempre mantidos).
 * Se `dataNascimento` for informada, adiciona 1 lembrete de aniversário por
 * ano dentro da janela de 3 anos.
 */
export function construirTarefas(opts: {
  dataInstalacao: Date;
  diaLeitura: number | null;
  dataNascimento?: Date | null;
  onlyFuture?: boolean;
}): TarefaRow[] {
  const { dataInstalacao, diaLeitura, dataNascimento, onlyFuture } = opts;
  const temLeitura = diaLeitura != null;
  const dia = diaLeitura ?? dataInstalacao.getDate();
  const hojeISO = toISODate(new Date());

  let rows: TarefaRow[] = PLANO.map((p) => {
    // Lembretes mensais sem dia de leitura definido ficam aguardando.
    const aguardando = p.conta != null && !temLeitura;
    const data = aguardando ? dataInstalacao : dataDoItem(p, dataInstalacao, dia);
    return {
      fase: p.fase,
      tipo: p.tipo,
      template_key: p.template_key,
      descricao: p.descricao,
      data_programada: toISODate(data),
      visivel_cliente: p.visivel_cliente,
      concluido: false,
      adiamentos: 0,
      aguardando_leitura: aguardando,
    };
  });

  // Lembretes de aniversário (1 por ano dentro dos 3 anos de pós-venda)
  if (dataNascimento && !isNaN(dataNascimento.getTime())) {
    const limite = addMonths(dataInstalacao, 36);
    let aniv = proximoAniversario(dataInstalacao, dataNascimento);
    let ano = 1;
    while (aniv.getTime() < limite.getTime() && ano <= 3) {
      rows.push({
        fase: 3,
        tipo: 'aniversario',
        template_key: 'aniversario',
        descricao: `Aniversário do cliente (${ano}º ano)`,
        data_programada: toISODate(aniv),
        visivel_cliente: false,
        concluido: false,
        adiamentos: 0,
        aguardando_leitura: false,
      });
      aniv = new Date(aniv.getFullYear() + 1, aniv.getMonth(), aniv.getDate());
      ano++;
    }
  }

  // Mantém lembretes aguardando leitura mesmo com onlyFuture (não têm data real ainda).
  if (onlyFuture) rows = rows.filter((r) => r.aguardando_leitura || r.data_programada >= hojeISO);
  return rows;
}

/**
 * Gera (se ainda não existirem) todas as tarefas de pós-venda para um projeto.
 * Retorna a quantidade criada.
 */
export async function gerarTarefasPosVenda(opts: {
  projetoId: string;
  dataInstalacao: Date;
  diaLeitura: number | null;
  dataNascimento?: Date | null;
  usuarioId?: string | null;
}): Promise<number> {
  const { projetoId, dataInstalacao, diaLeitura, dataNascimento } = opts;

  // Evita duplicar
  const { count } = await supabase
    .from('tarefas_posvenda' as any)
    .select('id', { count: 'exact', head: true })
    .eq('projeto_id', projetoId);
  if ((count || 0) > 0) return 0;

  const rows = construirTarefas({ dataInstalacao, diaLeitura, dataNascimento }).map((r) => ({
    ...r,
    projeto_id: projetoId,
  }));

  const { error } = await supabase.from('tarefas_posvenda' as any).insert(rows);
  if (error) throw error;
  return rows.length;
}

export interface AtivacaoResultado {
  created: number;
  proximo: { data: string; descricao: string } | null;
}

/**
 * Ativa o pós-venda para um cliente da base histórica (clientes_base),
 * criando apenas os lembretes futuros a partir da data de instalação.
 */
export async function ativarPosVendaCliente(opts: {
  clienteBaseId: string;
  dataInstalacao: Date;
  diaLeitura: number | null;
  dataNascimento?: Date | null;
}): Promise<AtivacaoResultado> {
  const { clienteBaseId, dataInstalacao, diaLeitura, dataNascimento } = opts;

  // Evita duplicar
  const { count } = await supabase
    .from('tarefas_posvenda' as any)
    .select('id', { count: 'exact', head: true })
    .eq('cliente_base_id', clienteBaseId);
  if ((count || 0) > 0) return { created: 0, proximo: null };

  const base = construirTarefas({ dataInstalacao, diaLeitura, dataNascimento, onlyFuture: true });
  if (base.length === 0) return { created: 0, proximo: null };

  const rows = base.map((r) => ({ ...r, cliente_base_id: clienteBaseId }));
  const { error } = await supabase.from('tarefas_posvenda' as any).insert(rows);
  if (error) throw error;

  const ordenadas = [...base]
    .filter((r) => !r.aguardando_leitura)
    .sort((a, b) => (a.data_programada < b.data_programada ? -1 : 1));
  const prox = ordenadas[0];
  return {
    created: rows.length,
    proximo: prox ? { data: prox.data_programada, descricao: prox.descricao } : null,
  };
}

/**
 * Ativa o pós-venda para um projeto já instalado (ainda sem registro em
 * clientes_base), criando apenas os lembretes futuros a partir da instalação.
 */
export async function ativarPosVendaProjeto(opts: {
  projetoId: string;
  dataInstalacao: Date;
  diaLeitura: number | null;
  dataNascimento?: Date | null;
}): Promise<AtivacaoResultado> {
  const { projetoId, dataInstalacao, diaLeitura, dataNascimento } = opts;

  // Evita duplicar
  const { count } = await supabase
    .from('tarefas_posvenda' as any)
    .select('id', { count: 'exact', head: true })
    .eq('projeto_id', projetoId);
  if ((count || 0) > 0) return { created: 0, proximo: null };

  const base = construirTarefas({ dataInstalacao, diaLeitura, dataNascimento, onlyFuture: true });
  if (base.length === 0) return { created: 0, proximo: null };

  const rows = base.map((r) => ({ ...r, projeto_id: projetoId }));
  const { error } = await supabase.from('tarefas_posvenda' as any).insert(rows);
  if (error) throw error;

  const ordenadas = [...base]
    .filter((r) => !r.aguardando_leitura)
    .sort((a, b) => (a.data_programada < b.data_programada ? -1 : 1));
  const prox = ordenadas[0];
  return {
    created: rows.length,
    proximo: prox ? { data: prox.data_programada, descricao: prox.descricao } : null,
  };
}

/**
 * Recalcula as datas dos lembretes mensais que estavam aguardando o dia de
 * leitura, assim que o `dia_leitura` é informado. Retorna a quantidade
 * atualizada. Identifica o dono pelo projeto OU cliente da base.
 */
export async function sincronizarDiaLeitura(opts: {
  projetoId?: string | null;
  clienteBaseId?: string | null;
  dataInstalacao: Date;
  diaLeitura: number;
}): Promise<number> {
  const { projetoId, clienteBaseId, dataInstalacao, diaLeitura } = opts;
  if (!projetoId && !clienteBaseId) return 0;
  if (diaLeitura == null) return 0;

  let query = supabase
    .from('tarefas_posvenda' as any)
    .select('id, template_key')
    .eq('aguardando_leitura', true)
    .eq('concluido', false);
  query = projetoId ? query.eq('projeto_id', projetoId) : query.eq('cliente_base_id', clienteBaseId!);

  const { data, error } = await query;
  if (error) throw error;
  const tarefas = (data || []) as { id: string; template_key: string | null }[];
  if (tarefas.length === 0) return 0;

  await Promise.all(
    tarefas.map((t) => {
      const p = t.template_key ? PLANO_POR_KEY[t.template_key] : undefined;
      if (!p || p.conta == null) return Promise.resolve();
      const novaData = toISODate(dataDoItem(p, dataInstalacao, diaLeitura));
      return supabase
        .from('tarefas_posvenda' as any)
        .update({ data_programada: novaData, aguardando_leitura: false })
        .eq('id', t.id);
    }),
  );

  return tarefas.length;
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
