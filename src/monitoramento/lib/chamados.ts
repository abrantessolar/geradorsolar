import { supabase } from '@/integrations/supabase/client';
import type { MonChamado, MonChamadoEvento, MonEtapaChamado, MonUsina, ClienteBaseResumo } from '../types';

// Fila de contato (Fase 2) — kanban reativo sobre `mon_chamados`, aberto e
// fechado automaticamente pela edge function `mon-coleta` quando o estado
// de uma usina muda (ver avaliarEstados/atualizarChamado). Esta tela só
// move a etapa e registra eventos manuais (contato feito, observação,
// visita agendada) — não duplica nem funde com `tarefas_posvenda`.

export interface ChamadoComContexto extends MonChamado {
  usina?: Pick<MonUsina, 'id' | 'marca' | 'modelo' | 'sn_inversor' | 'id_externo' | 'cidade'>;
  cliente?: Pick<ClienteBaseResumo, 'id' | 'nome_completo'>;
}

export async function listarChamadosAbertos(): Promise<ChamadoComContexto[]> {
  const { data, error } = await supabase
    .from('mon_chamados' as any)
    .select('*')
    .is('resolvido_em', null)
    .order('aberto_em', { ascending: true });
  if (error) throw error;
  return enriquecerChamados((data ?? []) as unknown as MonChamado[]);
}

export async function listarChamadosResolvidosRecentes(limite = 20): Promise<ChamadoComContexto[]> {
  const { data, error } = await supabase
    .from('mon_chamados' as any)
    .select('*')
    .not('resolvido_em', 'is', null)
    .order('resolvido_em', { ascending: false })
    .limit(limite);
  if (error) throw error;
  return enriquecerChamados((data ?? []) as unknown as MonChamado[]);
}

async function enriquecerChamados(chamados: MonChamado[]): Promise<ChamadoComContexto[]> {
  if (chamados.length === 0) return [];

  const usinaIds = Array.from(new Set(chamados.map((c) => c.usina_id)));
  const clienteIds = Array.from(new Set(chamados.map((c) => c.cliente_base_id).filter(Boolean))) as string[];

  const [usinasRes, clientesRes] = await Promise.all([
    supabase.from('mon_usinas' as any).select('id, marca, modelo, sn_inversor, id_externo, cidade').in('id', usinaIds),
    clienteIds.length > 0
      ? supabase.from('clientes_base' as any).select('id, nome_completo').in('id', clienteIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (usinasRes.error) throw usinasRes.error;
  if (clientesRes.error) throw clientesRes.error;

  const usinasPorId = new Map((usinasRes.data ?? []).map((u: any) => [u.id, u]));
  const clientesPorId = new Map((clientesRes.data ?? []).map((c: any) => [c.id, c]));

  return chamados.map((c) => ({
    ...c,
    usina: usinasPorId.get(c.usina_id),
    cliente: c.cliente_base_id ? clientesPorId.get(c.cliente_base_id) : undefined,
  }));
}

export async function listarEventos(chamadoId: string): Promise<MonChamadoEvento[]> {
  const { data, error } = await supabase
    .from('mon_chamado_eventos' as any)
    .select('*')
    .eq('chamado_id', chamadoId)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as MonChamadoEvento[];
}

export async function moverEtapa(chamadoId: string, etapa: MonEtapaChamado, usuarioId: string | null): Promise<void> {
  const { error: erroUpdate } = await supabase
    .from('mon_chamados' as any)
    .update({ etapa })
    .eq('id', chamadoId);
  if (erroUpdate) throw erroUpdate;

  const { error: erroEvento } = await supabase.from('mon_chamado_eventos' as any).insert({
    chamado_id: chamadoId,
    tipo: 'mudanca_etapa',
    mensagem: `Movido para "${etapa}"`,
    usuario_id: usuarioId,
  });
  if (erroEvento) throw erroEvento;
}

export async function resolverManualmente(chamadoId: string, usuarioId: string | null): Promise<void> {
  const { error: erroUpdate } = await supabase
    .from('mon_chamados' as any)
    .update({ etapa: 'resolvido', resolvido_em: new Date().toISOString(), resolucao: 'manual' })
    .eq('id', chamadoId);
  if (erroUpdate) throw erroUpdate;

  const { error: erroEvento } = await supabase.from('mon_chamado_eventos' as any).insert({
    chamado_id: chamadoId,
    tipo: 'mudanca_etapa',
    mensagem: 'Resolvido manualmente',
    usuario_id: usuarioId,
  });
  if (erroEvento) throw erroEvento;
}

export async function registrarEvento(
  chamadoId: string,
  tipo: MonChamadoEvento['tipo'],
  mensagem: string,
  usuarioId: string | null
): Promise<void> {
  const { error } = await supabase.from('mon_chamado_eventos' as any).insert({
    chamado_id: chamadoId,
    tipo,
    mensagem,
    usuario_id: usuarioId,
  });
  if (error) throw error;
}
