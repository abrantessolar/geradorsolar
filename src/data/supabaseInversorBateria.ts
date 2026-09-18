import { supabase } from '@/integrations/supabase/client';
import type { InversorHibrido, BateriaHibrida, TipoTensao, TensaoSaida } from '@/data/equipamentosHibrido';

// ─── INVERSORES ───

export async function getInversoresHibridoDB(soAtivos = true): Promise<InversorHibrido[]> {
  let query = supabase.from('equipamentos_inversor_hibrido' as any).select('*').order('ordem');
  if (soAtivos) query = query.eq('ativo', true);
  const { data, error } = await query;
  if (error) throw error;
  return ((data || []) as any[]).map(mapInversorRow);
}

function mapInversorRow(r: any): InversorHibrido {
  return {
    id: r.id, marca: r.marca, modelo: r.modelo, miniaturaUrl: r.miniatura_url,
    potenciaNominalKw: Number(r.potencia_nominal_kw), potenciaPicoKw: r.potencia_pico_kw != null ? Number(r.potencia_pico_kw) : null,
    potenciaFvMaxKwp: r.potencia_fv_max_kwp != null ? Number(r.potencia_fv_max_kwp) : null,
    tipoTensaoBateria: r.tipo_tensao_bateria, tensaoBateriaV: r.tensao_bateria_v != null ? Number(r.tensao_bateria_v) : null,
    tensaoSaida: r.tensao_saida,
    numMppt: r.num_mppt, mpptTensaoMinV: r.mppt_tensao_min_v != null ? Number(r.mppt_tensao_min_v) : null,
    mpptTensaoMaxV: r.mppt_tensao_max_v != null ? Number(r.mppt_tensao_max_v) : null,
    correnteMaxCargaBateriaA: r.corrente_max_carga_bateria_a != null ? Number(r.corrente_max_carga_bateria_a) : null,
    protocoloComunicacao: r.protocolo_comunicacao, bateriasCompativeis: r.baterias_compativeis,
    ativo: r.ativo,
  };
}

export interface InversorForm {
  id?: string;
  marca: string; modelo: string; miniaturaUrl: string;
  potenciaNominalKw: string; potenciaPicoKw: string; potenciaFvMaxKwp: string;
  tipoTensaoBateria: TipoTensao; tensaoBateriaV: string;
  tensaoSaida: TensaoSaida;
  numMppt: string; mpptTensaoMinV: string; mpptTensaoMaxV: string;
  correnteMaxCargaBateriaA: string; protocoloComunicacao: string; bateriasCompativeis: string;
}

export function inversorFormVazio(): InversorForm {
  return {
    marca: '', modelo: '', miniaturaUrl: '',
    potenciaNominalKw: '', potenciaPicoKw: '', potenciaFvMaxKwp: '',
    tipoTensaoBateria: 'low_voltage', tensaoBateriaV: '48',
    tensaoSaida: 'bivolt',
    numMppt: '', mpptTensaoMinV: '', mpptTensaoMaxV: '',
    correnteMaxCargaBateriaA: '', protocoloComunicacao: '', bateriasCompativeis: '',
  };
}

export function inversorParaForm(i: InversorHibrido): InversorForm {
  return {
    id: i.id, marca: i.marca, modelo: i.modelo, miniaturaUrl: i.miniaturaUrl || '',
    potenciaNominalKw: String(i.potenciaNominalKw), potenciaPicoKw: i.potenciaPicoKw != null ? String(i.potenciaPicoKw) : '',
    potenciaFvMaxKwp: i.potenciaFvMaxKwp != null ? String(i.potenciaFvMaxKwp) : '',
    tipoTensaoBateria: i.tipoTensaoBateria, tensaoBateriaV: i.tensaoBateriaV != null ? String(i.tensaoBateriaV) : '',
    tensaoSaida: i.tensaoSaida,
    numMppt: i.numMppt != null ? String(i.numMppt) : '', mpptTensaoMinV: i.mpptTensaoMinV != null ? String(i.mpptTensaoMinV) : '',
    mpptTensaoMaxV: i.mpptTensaoMaxV != null ? String(i.mpptTensaoMaxV) : '',
    correnteMaxCargaBateriaA: i.correnteMaxCargaBateriaA != null ? String(i.correnteMaxCargaBateriaA) : '',
    protocoloComunicacao: i.protocoloComunicacao || '', bateriasCompativeis: i.bateriasCompativeis || '',
  };
}

const num = (s: string) => (s.trim() ? parseFloat(s.replace(',', '.')) : null);
const int = (s: string) => (s.trim() ? parseInt(s, 10) : null);
const gerarId = (nome: string) =>
  nome.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) + '_' + Date.now().toString(36);

export async function saveInversorHibridoDB(form: InversorForm): Promise<void> {
  const payload = {
    marca: form.marca.trim(), modelo: form.modelo.trim(), miniatura_url: form.miniaturaUrl.trim() || null,
    potencia_nominal_kw: num(form.potenciaNominalKw) ?? 0,
    potencia_pico_kw: num(form.potenciaPicoKw),
    potencia_fv_max_kwp: num(form.potenciaFvMaxKwp),
    tipo_tensao_bateria: form.tipoTensaoBateria,
    tensao_bateria_v: num(form.tensaoBateriaV),
    tensao_saida: form.tensaoSaida,
    num_mppt: int(form.numMppt),
    mppt_tensao_min_v: num(form.mpptTensaoMinV),
    mppt_tensao_max_v: num(form.mpptTensaoMaxV),
    corrente_max_carga_bateria_a: num(form.correnteMaxCargaBateriaA),
    protocolo_comunicacao: form.protocoloComunicacao.trim() || null,
    baterias_compativeis: form.bateriasCompativeis.trim() || null,
    atualizado_em: new Date().toISOString(),
  };
  if (form.id) {
    const { error } = await supabase.from('equipamentos_inversor_hibrido' as any).update(payload).eq('id', form.id);
    if (error) throw error;
  } else {
    const { data: max } = await supabase.from('equipamentos_inversor_hibrido' as any).select('ordem').order('ordem', { ascending: false }).limit(1).maybeSingle();
    const ordem = ((max as any)?.ordem ?? 0) + 1;
    const { error } = await supabase.from('equipamentos_inversor_hibrido' as any).insert({ ...payload, id: gerarId(form.marca + '_' + form.modelo), ordem, ativo: true });
    if (error) throw error;
  }
}

export async function toggleAtivoInversorHibridoDB(id: string, ativo: boolean): Promise<void> {
  const { error } = await supabase.from('equipamentos_inversor_hibrido' as any).update({ ativo, atualizado_em: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function deleteInversorHibridoDB(id: string): Promise<void> {
  const { error } = await supabase.from('equipamentos_inversor_hibrido' as any).delete().eq('id', id);
  if (error) throw error;
}

// ─── BATERIAS ───

export async function getBateriasHibridoDB(soAtivos = true): Promise<BateriaHibrida[]> {
  let query = supabase.from('equipamentos_bateria_hibrida' as any).select('*').order('ordem');
  if (soAtivos) query = query.eq('ativo', true);
  const { data, error } = await query;
  if (error) throw error;
  return ((data || []) as any[]).map(mapBateriaRow);
}

function mapBateriaRow(r: any): BateriaHibrida {
  return {
    id: r.id, marca: r.marca, modelo: r.modelo, miniaturaUrl: r.miniatura_url,
    capacidadeKwh: Number(r.capacidade_kwh), tipoTensao: r.tipo_tensao,
    tensaoNominalV: r.tensao_nominal_v != null ? Number(r.tensao_nominal_v) : null,
    correnteMaxDescargaContinuaA: r.corrente_max_descarga_continua_a != null ? Number(r.corrente_max_descarga_continua_a) : null,
    correnteMaxDescargaPicoA: r.corrente_max_descarga_pico_a != null ? Number(r.corrente_max_descarga_pico_a) : null,
    dodPct: Number(r.dod_pct ?? 90), quimica: r.quimica, ciclosVida: r.ciclos_vida,
    empilhavel: r.empilhavel, maxUnidadesParalelo: r.max_unidades_paralelo,
    ativo: r.ativo,
  };
}

export interface BateriaForm {
  id?: string;
  marca: string; modelo: string; miniaturaUrl: string;
  capacidadeKwh: string; tipoTensao: TipoTensao; tensaoNominalV: string;
  correnteMaxDescargaContinuaA: string; correnteMaxDescargaPicoA: string;
  dodPct: string; quimica: string; ciclosVida: string;
  empilhavel: boolean; maxUnidadesParalelo: string;
}

export function bateriaFormVazio(): BateriaForm {
  return {
    marca: '', modelo: '', miniaturaUrl: '',
    capacidadeKwh: '', tipoTensao: 'low_voltage', tensaoNominalV: '48',
    correnteMaxDescargaContinuaA: '', correnteMaxDescargaPicoA: '',
    dodPct: '90', quimica: 'LiFePO4', ciclosVida: '',
    empilhavel: false, maxUnidadesParalelo: '',
  };
}

export function bateriaParaForm(b: BateriaHibrida): BateriaForm {
  return {
    id: b.id, marca: b.marca, modelo: b.modelo, miniaturaUrl: b.miniaturaUrl || '',
    capacidadeKwh: String(b.capacidadeKwh), tipoTensao: b.tipoTensao, tensaoNominalV: b.tensaoNominalV != null ? String(b.tensaoNominalV) : '',
    correnteMaxDescargaContinuaA: b.correnteMaxDescargaContinuaA != null ? String(b.correnteMaxDescargaContinuaA) : '',
    correnteMaxDescargaPicoA: b.correnteMaxDescargaPicoA != null ? String(b.correnteMaxDescargaPicoA) : '',
    dodPct: String(b.dodPct), quimica: b.quimica || '', ciclosVida: b.ciclosVida != null ? String(b.ciclosVida) : '',
    empilhavel: b.empilhavel, maxUnidadesParalelo: b.maxUnidadesParalelo != null ? String(b.maxUnidadesParalelo) : '',
  };
}

export async function saveBateriaHibridoDB(form: BateriaForm): Promise<void> {
  const payload = {
    marca: form.marca.trim(), modelo: form.modelo.trim(), miniatura_url: form.miniaturaUrl.trim() || null,
    capacidade_kwh: num(form.capacidadeKwh) ?? 0,
    tipo_tensao: form.tipoTensao,
    tensao_nominal_v: num(form.tensaoNominalV),
    corrente_max_descarga_continua_a: num(form.correnteMaxDescargaContinuaA),
    corrente_max_descarga_pico_a: num(form.correnteMaxDescargaPicoA),
    dod_pct: num(form.dodPct) ?? 90,
    quimica: form.quimica.trim() || null,
    ciclos_vida: int(form.ciclosVida),
    empilhavel: form.empilhavel,
    max_unidades_paralelo: int(form.maxUnidadesParalelo),
    atualizado_em: new Date().toISOString(),
  };
  if (form.id) {
    const { error } = await supabase.from('equipamentos_bateria_hibrida' as any).update(payload).eq('id', form.id);
    if (error) throw error;
  } else {
    const { data: max } = await supabase.from('equipamentos_bateria_hibrida' as any).select('ordem').order('ordem', { ascending: false }).limit(1).maybeSingle();
    const ordem = ((max as any)?.ordem ?? 0) + 1;
    const { error } = await supabase.from('equipamentos_bateria_hibrida' as any).insert({ ...payload, id: gerarId(form.marca + '_' + form.modelo), ordem, ativo: true });
    if (error) throw error;
  }
}

export async function toggleAtivoBateriaHibridoDB(id: string, ativo: boolean): Promise<void> {
  const { error } = await supabase.from('equipamentos_bateria_hibrida' as any).update({ ativo, atualizado_em: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function deleteBateriaHibridoDB(id: string): Promise<void> {
  const { error } = await supabase.from('equipamentos_bateria_hibrida' as any).delete().eq('id', id);
  if (error) throw error;
}

// ─── UPLOAD DE MINIATURA (mesmo bucket, nome unico com timestamp — sem upsert) ───

export async function uploadMiniaturaHibrido(file: File, prefixo: 'inversor-hibrido' | 'bateria-hibrida'): Promise<string | null> {
  const ext = file.name.split('.').pop();
  const path = `equipamentos/${prefixo}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('site-content').upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from('site-content').getPublicUrl(path);
  return data.publicUrl;
}
