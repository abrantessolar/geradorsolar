import { supabase } from '@/integrations/supabase/client';
import type { MonDiario } from '../types';

// Histórico diário por usina (Fase 3) — populado pelo backfill manual
// (supabase/functions/mon-backfill-diario) a partir do relatório mensal
// da FoxESS, e também pela coleta em tempo real mais pra frente. Usado
// pela visão de histórico dentro de "Saúde da frota".
export async function listarDiarioUsina(usinaId: string): Promise<MonDiario[]> {
  const { data, error } = await supabase
    .from('mon_diario' as any)
    .select('*')
    .eq('usina_id', usinaId)
    .order('data', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as MonDiario[];
}

const DIAS_KWH_POR_KWP_RECENTE = 30;

// kWh/kWp médio dos últimos 30 dias por usina, pra aparecer na linha da
// lista de "Saúde da frota" com o card FECHADO (pedido do usuário,
// 2026-10-17: "mantenha só o kwh/kwp [...] faca com que ele apareca com
// o popup do cliente fechado, na lista") — sem nenhuma comparação com
// mediana/frota, é só a média bruta do próprio kWh/kWp da usina.
export async function listarKwhPorKwpRecente(usinaIds: string[]): Promise<Map<string, number>> {
  const mapa = new Map<string, number>();
  if (usinaIds.length === 0) return mapa;

  const desde = new Date();
  desde.setDate(desde.getDate() - DIAS_KWH_POR_KWP_RECENTE);
  const desdeIso = desde.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('mon_diario' as any)
    .select('usina_id, kwh_por_kwp')
    .in('usina_id', usinaIds)
    .gte('data', desdeIso)
    .not('kwh_por_kwp', 'is', null);
  if (error) throw error;

  const soma = new Map<string, { total: number; contagem: number }>();
  for (const linha of (data ?? []) as unknown as Array<{ usina_id: string; kwh_por_kwp: number }>) {
    const atual = soma.get(linha.usina_id) ?? { total: 0, contagem: 0 };
    atual.total += linha.kwh_por_kwp;
    atual.contagem += 1;
    soma.set(linha.usina_id, atual);
  }
  for (const [usinaId, { total, contagem }] of soma) {
    mapa.set(usinaId, total / contagem);
  }
  return mapa;
}
