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
