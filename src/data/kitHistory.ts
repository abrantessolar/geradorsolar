import { supabase } from '@/integrations/supabase/client';

export interface KitHistoryRow {
  id: string;
  tipo_inversor: 'string' | 'micro';
  marca_inversor: string;
  modelo_inversor: string;
  potencia_inversor_kw: number;
  quantidade_inversores: number;
  marca_placa: string;
  modelo_placa: string;
  potencia_placa_wp: number;
  quantidade_placas: number;
  custo_kit: number;
  usado_em: string;
  vezes_usado: number;
}

export interface KitInput {
  tipoInversor: 'string' | 'micro';
  marcaInversor: string;
  modeloInversor: string;
  potenciaInversorKw: number;
  qtdInversores: number;
  marcaPlaca: string;
  modeloPlaca: string;
  potenciaPlacaWp: number;
  qtdPlacas: number;
  custoKit: number;
}

export async function listKitsHistory(limit = 30): Promise<KitHistoryRow[]> {
  const { data, error } = await supabase
    .from('historico_kits')
    .select('*')
    .order('vezes_usado', { ascending: false })
    .order('usado_em', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('Erro listKitsHistory:', error);
    return [];
  }
  return (data || []) as KitHistoryRow[];
}

export async function upsertKitHistory(kit: KitInput, userId: string | null): Promise<void> {
  const norm = {
    tipo_inversor: kit.tipoInversor,
    marca_inversor: (kit.marcaInversor || '').trim().toUpperCase(),
    modelo_inversor: (kit.modeloInversor || '').trim().toUpperCase(),
    potencia_inversor_kw: Number(kit.potenciaInversorKw) || 0,
    quantidade_inversores: Math.max(1, Number(kit.qtdInversores) || 1),
    marca_placa: (kit.marcaPlaca || '').trim().toUpperCase(),
    modelo_placa: (kit.modeloPlaca || '').trim().toUpperCase(),
    potencia_placa_wp: Number(kit.potenciaPlacaWp) || 0,
    quantidade_placas: Math.max(0, Number(kit.qtdPlacas) || 0),
    custo_kit: Number(kit.custoKit) || 0,
  };

  // Try to find existing matching row
  const { data: existing } = await supabase
    .from('historico_kits')
    .select('id, vezes_usado')
    .match(norm)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('historico_kits')
      .update({
        vezes_usado: (existing.vezes_usado || 0) + 1,
        usado_em: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    await supabase.from('historico_kits').insert({
      ...norm,
      criador_user_id: userId,
    });
  }
}

export function kitRowToInput(row: KitHistoryRow): KitInput {
  return {
    tipoInversor: row.tipo_inversor,
    marcaInversor: row.marca_inversor,
    modeloInversor: row.modelo_inversor,
    potenciaInversorKw: Number(row.potencia_inversor_kw),
    qtdInversores: row.quantidade_inversores,
    marcaPlaca: row.marca_placa,
    modeloPlaca: row.modelo_placa,
    potenciaPlacaWp: Number(row.potencia_placa_wp),
    qtdPlacas: row.quantidade_placas,
    custoKit: Number(row.custo_kit),
  };
}

export function describeKitRow(row: KitHistoryRow): string {
  const prefix = row.tipo_inversor === 'micro' ? 'MICRO ' : '';
  const qInv = row.quantidade_inversores > 1 ? `${row.quantidade_inversores}× ` : '';
  const inv = `${prefix}${qInv}${row.marca_inversor} ${row.potencia_inversor_kw}kW`.trim();
  const pla = `${row.marca_placa} ${row.potencia_placa_wp}Wp × ${row.quantidade_placas}`;
  return `${inv} + ${pla}`;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `há ${d} ${d === 1 ? 'dia' : 'dias'}`;
  const w = Math.floor(d / 7);
  if (w < 5) return `há ${w} ${w === 1 ? 'semana' : 'semanas'}`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `há ${mo} ${mo === 1 ? 'mês' : 'meses'}`;
  const y = Math.floor(d / 365);
  return `há ${y} ${y === 1 ? 'ano' : 'anos'}`;
}
