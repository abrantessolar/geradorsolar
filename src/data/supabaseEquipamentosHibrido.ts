import { supabase } from '@/integrations/supabase/client';
import type { ItemCatalogo, CategoriaCatalogo, Janela } from '@/data/catalogoSimuladorHibrido';

export interface EquipamentoHibridoRow {
  id: string;
  categoria: string;
  nome: string;
  potencia_kw: number;
  janela: Janela;
  tipo: 'fixo' | 'tempo_ajustavel';
  fator_servico: number | null;
  horas_dia: number | null;
  unidade_tempo: 'h' | 'min' | null;
  tempo_padrao: number | null;
  km_dia: number | null;
  potencia_pico_kw: number | null;
  selecionado_padrao: boolean;
  ordem: number;
  ativo: boolean;
}

/** Formulário usado na tela de gerenciamento — mais simples de editar que o row bruto. */
export interface EquipamentoHibridoForm {
  id?: string;
  categoria: string;
  nome: string;
  potenciaKw: string;
  janela: Janela;
  tipo: 'fixo' | 'tempo_ajustavel';
  fatorServico: string;
  horasDia: string;
  unidadeTempo: 'h' | 'min';
  tempoPadrao: string;
  kmDia: string;
  potenciaPicoKw: string;
  selecionadoPadrao: boolean;
}

export async function getEquipamentosHibridoDB(soAtivos = true): Promise<EquipamentoHibridoRow[]> {
  let query = supabase.from('equipamentos_simulador_hibrido' as any).select('*').order('ordem');
  if (soAtivos) query = query.eq('ativo', true);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as EquipamentoHibridoRow[];
}

export async function saveEquipamentoHibridoDB(form: EquipamentoHibridoForm): Promise<void> {
  const payload = {
    categoria: form.categoria.trim(),
    nome: form.nome.trim(),
    potencia_kw: parseFloat(form.potenciaKw.replace(',', '.')) || 0,
    janela: form.janela,
    tipo: form.tipo,
    fator_servico: form.tipo === 'fixo' ? (parseFloat(form.fatorServico.replace(',', '.')) || null) : null,
    horas_dia: form.tipo === 'fixo' ? (parseFloat(form.horasDia.replace(',', '.')) || null) : null,
    unidade_tempo: form.tipo === 'tempo_ajustavel' ? form.unidadeTempo : null,
    tempo_padrao: form.tipo === 'tempo_ajustavel' ? (parseFloat(form.tempoPadrao.replace(',', '.')) || null) : null,
    km_dia: form.kmDia.trim() ? (parseFloat(form.kmDia.replace(',', '.')) || null) : null,
    potencia_pico_kw: form.potenciaPicoKw.trim() ? (parseFloat(form.potenciaPicoKw.replace(',', '.')) || null) : null,
    selecionado_padrao: form.selecionadoPadrao,
    atualizado_em: new Date().toISOString(),
  };

  if (form.id) {
    const { error } = await supabase.from('equipamentos_simulador_hibrido' as any).update(payload).eq('id', form.id);
    if (error) throw error;
  } else {
    const id = form.nome.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) + '_' + Date.now().toString(36);
    const { data: max } = await supabase.from('equipamentos_simulador_hibrido' as any).select('ordem').order('ordem', { ascending: false }).limit(1).maybeSingle();
    const ordem = ((max as any)?.ordem ?? 0) + 1;
    const { error } = await supabase.from('equipamentos_simulador_hibrido' as any).insert({ ...payload, id, ordem, ativo: true });
    if (error) throw error;
  }
}

export async function toggleAtivoEquipamentoHibridoDB(id: string, ativo: boolean): Promise<void> {
  const { error } = await supabase.from('equipamentos_simulador_hibrido' as any).update({ ativo, atualizado_em: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function deleteEquipamentoHibridoDB(id: string): Promise<void> {
  const { error } = await supabase.from('equipamentos_simulador_hibrido' as any).delete().eq('id', id);
  if (error) throw error;
}

/** Converte as linhas planas do banco pro formato agrupado por categoria que a tela usa. */
export function agruparPorCategoria(rows: EquipamentoHibridoRow[]): CategoriaCatalogo[] {
  const mapa = new Map<string, ItemCatalogo[]>();
  for (const r of rows) {
    const item: ItemCatalogo = r.tipo === 'fixo'
      ? { id: r.id, nome: r.nome, pot: r.potencia_kw, janela: r.janela, tipo: 'fixo', fator: r.fator_servico ?? 1, horas: r.horas_dia ?? 0, kmDia: r.km_dia ?? undefined, picoKw: r.potencia_pico_kw ?? undefined }
      : { id: r.id, nome: r.nome, pot: r.potencia_kw, janela: r.janela, tipo: 'tempo_ajustavel', unidade: r.unidade_tempo ?? 'h', padrao: r.tempo_padrao ?? 0, kmDia: r.km_dia ?? undefined, picoKw: r.potencia_pico_kw ?? undefined };
    if (!mapa.has(r.categoria)) mapa.set(r.categoria, []);
    mapa.get(r.categoria)!.push(item);
  }
  return Array.from(mapa.entries()).map(([categoria, itens]) => ({ categoria, itens }));
}

export function rowParaForm(r: EquipamentoHibridoRow): EquipamentoHibridoForm {
  return {
    id: r.id,
    categoria: r.categoria,
    nome: r.nome,
    potenciaKw: String(r.potencia_kw),
    janela: r.janela,
    tipo: r.tipo,
    fatorServico: r.fator_servico != null ? String(r.fator_servico) : '0.8',
    horasDia: r.horas_dia != null ? String(r.horas_dia) : '1',
    unidadeTempo: r.unidade_tempo ?? 'h',
    tempoPadrao: r.tempo_padrao != null ? String(r.tempo_padrao) : '1',
    kmDia: r.km_dia != null ? String(r.km_dia) : '',
    potenciaPicoKw: r.potencia_pico_kw != null ? String(r.potencia_pico_kw) : '',
    selecionadoPadrao: r.selecionado_padrao,
  };
}

export function formVazio(categoriaSugerida?: string): EquipamentoHibridoForm {
  return {
    categoria: categoriaSugerida || '',
    nome: '',
    potenciaKw: '',
    janela: [[0, 24]],
    tipo: 'fixo',
    fatorServico: '0.8',
    horasDia: '1',
    unidadeTempo: 'h',
    tempoPadrao: '1',
    kmDia: '',
    potenciaPicoKw: '',
    selecionadoPadrao: false,
  };
}
