import { supabase } from '@/integrations/supabase/client';

/**
 * Determines the potência key for material lookup based on inversor data.
 * Returns e.g. "5", "7.5", "4 MICRO"
 */
export function getPotenciaKey(opts: {
  potencia_inversor?: string | null;
  inversor_tipo?: string | null;
  marca_inversor?: string | null;
  qtd_inversores?: number | null;
}): string | null {
  const potRaw = parseFloat(opts.potencia_inversor || '0');
  if (!potRaw) return null;

  const potKw = potRaw > 100 ? potRaw / 1000 : potRaw;

  const tipo = (opts.inversor_tipo || '').toUpperCase();
  const marca = (opts.marca_inversor || '').toUpperCase();
  const microBrands = ['HOYMILES', 'HOYMMILES', 'HOMYLES', 'HOMILES'];
  const isMicro =
    tipo.includes('MICRO') ||
    marca.includes('MICRO') ||
    microBrands.some(b => marca.includes(b)) ||
    (marca.includes('DEYE') && potKw < 3) ||
    ((opts.qtd_inversores || 1) > 1 && potKw < 3);

  if (isMicro) {
    return `${opts.qtd_inversores || 1} MICRO`;
  }

  const pots = [3, 4, 5, 6, 7.5, 8, 10];
  const closest = pots.reduce((prev, curr) =>
    Math.abs(curr - potKw) < Math.abs(prev - potKw) ? curr : prev, pots[0]);
  return closest.toString();
}

/**
 * Generates (or regenerates) the materials list and cables for a project.
 * Returns true if generated, false if skipped.
 */
export async function generateMaterialList(projetoId: string, potKey: string): Promise<boolean> {
  // Get standard quantities for this power
  const [{ data: qtdPadrao }, { data: cabosPadrao }] = await Promise.all([
    supabase.from('materiais_quantidades_padrao' as any)
      .select('*, materiais(id, nome, categoria)')
      .eq('potencia', potKey),
    supabase.from('cabos_padrao' as any)
      .select('*')
      .eq('potencia', potKey),
  ]);

  // Clear existing
  await Promise.all([
    supabase.from('lista_materiais_obra' as any).delete().eq('projeto_id', projetoId),
    supabase.from('cabos_obra' as any).delete().eq('projeto_id', projetoId),
  ]);

  // Insert materials
  if (qtdPadrao && qtdPadrao.length > 0) {
    const rows = qtdPadrao.map((q: any) => ({
      projeto_id: projetoId,
      material_id: q.material_id,
      quantidade_necessaria: q.quantidade,
      quantidade_separada: 0,
      separado: false,
    }));
    await supabase.from('lista_materiais_obra' as any).insert(rows);
  }

  // Insert cables
  if (cabosPadrao && cabosPadrao.length > 0) {
    const caboRows = cabosPadrao.map((c: any) => ({
      projeto_id: projetoId,
      tipo_cabo: c.tipo_cabo,
      quantidade_metros: 0,
      observacao: c.observacao,
    }));
    await supabase.from('cabos_obra' as any).insert(caboRows);
  }

  return true;
}

/**
 * Check if a project already has a materials list generated.
 */
export async function hasExistingList(projetoId: string): Promise<boolean> {
  const { count } = await supabase
    .from('lista_materiais_obra' as any)
    .select('id', { count: 'exact', head: true })
    .eq('projeto_id', projetoId);
  return (count || 0) > 0;
}
