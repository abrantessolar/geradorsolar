import { supabase } from '@/integrations/supabase/client';
import type { ClienteBaseResumo, MonUsina } from '../types';

// Acesso a `mon_usinas`/`clientes_base` para a tela de vínculo. Tabelas
// ainda sem tipos gerados pelo Supabase client (mesmo padrão já usado para
// `clientes_base` no resto do painel do gestor) — por isso o `as any`.

export async function listarUsinasSemVinculo(): Promise<MonUsina[]> {
  const { data, error } = await supabase
    .from('mon_usinas' as any)
    .select('*')
    .eq('vinculo_confirmado', false)
    .order('criado_em', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as MonUsina[];
}

export async function listarUsinasVinculadas(): Promise<MonUsina[]> {
  const { data, error } = await supabase
    .from('mon_usinas' as any)
    .select('*')
    .eq('vinculo_confirmado', true)
    .order('atualizado_em', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as MonUsina[];
}

// Usina única — usada pela ferramenta de conta de luz (Fase 4) pra
// montar o cabeçalho do relatório sem precisar carregar a lista inteira.
export async function obterUsina(usinaId: string): Promise<MonUsina | null> {
  const { data, error } = await supabase.from('mon_usinas' as any).select('*').eq('id', usinaId).maybeSingle();
  if (error) throw error;
  return (data as unknown as MonUsina) ?? null;
}

export async function obterClienteBase(clienteId: string): Promise<ClienteBaseResumo | null> {
  const { data, error } = await supabase
    .from('clientes_base' as any)
    .select('id, nome_completo, endereco, uc')
    .eq('id', clienteId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as ClienteBaseResumo) ?? null;
}

export async function listarClientesParaVinculo(): Promise<ClienteBaseResumo[]> {
  const { data, error } = await supabase
    .from('clientes_base' as any)
    .select('id, nome_completo, endereco, uc')
    .order('nome_completo', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as ClienteBaseResumo[];
}

export async function confirmarVinculo(usinaId: string, clienteBaseId: string): Promise<void> {
  const { error } = await supabase
    .from('mon_usinas' as any)
    .update({ cliente_base_id: clienteBaseId, vinculo_confirmado: true })
    .eq('id', usinaId);
  if (error) throw error;
}

export async function desfazerVinculo(usinaId: string): Promise<void> {
  const { error } = await supabase
    .from('mon_usinas' as any)
    .update({ cliente_base_id: null, vinculo_confirmado: false })
    .eq('id', usinaId);
  if (error) throw error;
}

export async function marcarInativa(usinaId: string, ativo: boolean): Promise<void> {
  const { error } = await supabase
    .from('mon_usinas' as any)
    .update({ ativo })
    .eq('id', usinaId);
  if (error) throw error;
}

// Ajuste manual de kWp (2026-10-17, pedido do usuário) — último recurso
// pra quando nem a API da marca nem o fallback automático via cliente
// vinculado (preencherKwpAusente em mon-coleta) resolvem. Sobrescreve
// qualquer valor existente de propósito: é uma correção manual
// explícita, não um preenchimento condicional.
export async function atualizarKwp(usinaId: string, kwp: number | null): Promise<void> {
  const { error } = await supabase
    .from('mon_usinas' as any)
    .update({ kwp })
    .eq('id', usinaId);
  if (error) throw error;
}

// Painel de saúde da frota (Fase 2) — lista todas as usinas ativas com o
// `estado_atual` já calculado pela edge function `mon-coleta` (cache em
// mon_usinas, ver drizzle/migrations/0009_monitoramento_estado_cache.sql),
// mais a potência da leitura mais recente de cada uma, para contexto.
export async function listarUsinasSaude(): Promise<MonUsina[]> {
  const { data, error } = await supabase
    .from('mon_usinas' as any)
    .select('*')
    .eq('ativo', true)
    .order('estado_atualizado_em', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as unknown as MonUsina[];
}

export interface PotenciaRecente {
  usina_id: string;
  potencia_w: number | null;
  coletado_em: string;
}

// Não dá pra pedir "a última leitura de cada usina" direto no client do
// Supabase (sem DISTINCT ON/RPC) — então pedimos um lote recente das
// leituras mais novas e ficamos só com a primeira ocorrência de cada
// usina_id (a mais recente, já que vem ordenado desc).
export async function listarPotenciasRecentes(usinaIds: string[]): Promise<Map<string, PotenciaRecente>> {
  const mapa = new Map<string, PotenciaRecente>();
  if (usinaIds.length === 0) return mapa;

  const { data, error } = await supabase
    .from('mon_leituras' as any)
    .select('usina_id, potencia_w, coletado_em')
    .in('usina_id', usinaIds)
    .order('coletado_em', { ascending: false })
    .limit(usinaIds.length * 3);
  if (error) throw error;

  for (const leitura of (data ?? []) as unknown as PotenciaRecente[]) {
    if (!mapa.has(leitura.usina_id)) {
      mapa.set(leitura.usina_id, leitura);
    }
  }
  return mapa;
}
