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
