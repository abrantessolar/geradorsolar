import { supabase } from '@/integrations/supabase/client';
import type { PropostaPlaca } from '@/data/propostaPlacaTypes';

function mapRow(r: any): PropostaPlaca {
  return {
    id: r.id, numeroProposta: r.numero_proposta, codigoAcesso: r.codigo_acesso,
    clienteNome: r.cliente_nome, clienteCidade: r.cliente_cidade, clienteUf: r.cliente_uf,
    clienteTelefone: r.cliente_telefone,
    responsavelNome: r.responsavel_nome, responsavelTelefone: r.responsavel_telefone,
    placaId: r.placa_id, placaMarca: r.placa_marca, placaModelo: r.placa_modelo,
    placaPotenciaWp: r.placa_potencia_wp != null ? Number(r.placa_potencia_wp) : null,
    placaImagem: r.placa_imagem, qtdPlacas: r.qtd_placas,
    potenciaKwp: r.potencia_kwp != null ? Number(r.potencia_kwp) : null,
    geracaoMensalKwh: r.geracao_mensal_kwh || null,
    geracaoMediaKwh: r.geracao_media_kwh != null ? Number(r.geracao_media_kwh) : null,
    precoAvista: Number(r.preco_avista),
    cartaoParcelas: r.cartao_parcelas || null,
    observacoes: r.observacoes,
    status: r.status, visualizadoEm: r.visualizado_em, criadoEm: r.criado_em,
  };
}

export interface NovaPropostaPlaca {
  clienteNome: string; clienteCidade?: string; clienteUf?: string; clienteTelefone?: string;
  responsavelNome?: string; responsavelTelefone?: string;
  placaId?: string | null; placaMarca?: string | null; placaModelo?: string | null;
  placaPotenciaWp?: number | null; placaImagem?: string | null;
  qtdPlacas: number; potenciaKwp?: number | null;
  geracaoMensalKwh?: number[] | null; geracaoMediaKwh?: number | null;
  precoAvista: number;
  cartaoParcelas?: { meses: number; valor: number }[] | null;
  observacoes?: string | null;
}

export async function criarPropostaPlacaDB(input: NovaPropostaPlaca): Promise<{ id: string; codigoAcesso: string }> {
  const payload = {
    cliente_nome: input.clienteNome, cliente_cidade: input.clienteCidade || null,
    cliente_uf: input.clienteUf || null, cliente_telefone: input.clienteTelefone || null,
    responsavel_nome: input.responsavelNome || null, responsavel_telefone: input.responsavelTelefone || null,
    placa_id: input.placaId || null, placa_marca: input.placaMarca || null, placa_modelo: input.placaModelo || null,
    placa_potencia_wp: input.placaPotenciaWp ?? null, placa_imagem: input.placaImagem || null,
    qtd_placas: input.qtdPlacas, potencia_kwp: input.potenciaKwp ?? null,
    geracao_mensal_kwh: input.geracaoMensalKwh ?? null, geracao_media_kwh: input.geracaoMediaKwh ?? null,
    preco_avista: input.precoAvista,
    cartao_parcelas: input.cartaoParcelas ?? null,
    observacoes: input.observacoes || null,
  };
  const { data, error } = await supabase.from('propostas_placa' as any).insert(payload).select('id, codigo_acesso').single();
  if (error) throw error;
  return { id: (data as any).id, codigoAcesso: (data as any).codigo_acesso };
}

/** Uso interno (equipe autenticada) — lê direto pela tabela, RLS já garante permissão. */
export async function getPropostaPlacaByIdDB(id: string): Promise<PropostaPlaca | null> {
  const { data, error } = await supabase.from('propostas_placa' as any).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

/** Uso público (link enviado ao cliente) — sempre pelo código de acesso, via função segura. */
export async function getPropostaPlacaByCodigoDB(codigo: string): Promise<PropostaPlaca | null> {
  const { data, error } = await supabase.rpc('get_proposta_placa_public' as any, { _codigo: codigo });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row ? mapRow(row) : null;
}

export async function marcarPropostaPlacaVisualizadaDB(codigo: string): Promise<void> {
  await supabase.rpc('marcar_proposta_placa_visualizada' as any, { _codigo: codigo });
}

export async function updatePropostaPlacaDB(id: string, patch: { precoAvista?: number; observacoes?: string | null; status?: string }): Promise<void> {
  const payload: Record<string, any> = { atualizado_em: new Date().toISOString() };
  if (patch.precoAvista !== undefined) payload.preco_avista = patch.precoAvista;
  if (patch.observacoes !== undefined) payload.observacoes = patch.observacoes;
  if (patch.status !== undefined) payload.status = patch.status;
  const { error } = await supabase.from('propostas_placa' as any).update(payload).eq('id', id);
  if (error) throw error;
}
