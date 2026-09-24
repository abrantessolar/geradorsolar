import { supabase } from '@/integrations/supabase/client';
import type { PropostaHibrida } from '@/data/propostaHibridaTypes';

function mapRow(r: any): PropostaHibrida {
  return {
    id: r.id, numeroProposta: r.numero_proposta, codigoAcesso: r.codigo_acesso,
    clienteNome: r.cliente_nome, clienteCidade: r.cliente_cidade, clienteTelefone: r.cliente_telefone,
    responsavelNome: r.responsavel_nome, responsavelTelefone: r.responsavel_telefone, responsavelEmail: r.responsavel_email,
    placaId: r.placa_id, placaMarca: r.placa_marca, placaModelo: r.placa_modelo,
    placaPotenciaWp: r.placa_potencia_wp != null ? Number(r.placa_potencia_wp) : null,
    qtdPlacas: r.qtd_placas, potenciaKwp: r.potencia_kwp != null ? Number(r.potencia_kwp) : null,
    inversorHibridoId: r.inversor_hibrido_id, inversorHibridoMarca: r.inversor_hibrido_marca,
    inversorHibridoModelo: r.inversor_hibrido_modelo, inversorHibridoImagem: r.inversor_hibrido_imagem,
    inversorHibridoGarantiaAnos: r.inversor_hibrido_garantia_anos,
    bateriaId: r.bateria_id, bateriaMarca: r.bateria_marca, bateriaModelo: r.bateria_modelo,
    bateriaCapacidadeKwh: r.bateria_capacidade_kwh != null ? Number(r.bateria_capacidade_kwh) : null,
    bateriaQtd: r.bateria_qtd ?? 1, bateriaImagem: r.bateria_imagem, bateriaGarantiaAnos: r.bateria_garantia_anos,
    consumoDiarioKwh: r.consumo_diario_kwh != null ? Number(r.consumo_diario_kwh) : null,
    geracaoNubladoKwhDia: r.geracao_nublado_kwh_dia != null ? Number(r.geracao_nublado_kwh_dia) : null,
    geracaoTipicoKwhDia: r.geracao_tipico_kwh_dia != null ? Number(r.geracao_tipico_kwh_dia) : null,
    geracaoLimpoKwhDia: r.geracao_limpo_kwh_dia != null ? Number(r.geracao_limpo_kwh_dia) : null,
    autonomiaHoras: r.autonomia_horas != null ? Number(r.autonomia_horas) : null,
    precoTotal: r.preco_total != null ? Number(r.preco_total) : null,
    observacoes: r.observacoes,
    status: r.status, visualizadoEm: r.visualizado_em, criadoEm: r.criado_em,
  };
}

export interface NovaPropostaHibrida {
  clienteNome: string; clienteCidade?: string; clienteTelefone?: string;
  responsavelNome?: string; responsavelTelefone?: string; responsavelEmail?: string;
  placaId?: string | null; placaMarca?: string | null; placaModelo?: string | null;
  placaPotenciaWp?: number | null; qtdPlacas?: number | null; potenciaKwp?: number | null;
  inversorHibridoId?: string | null; inversorHibridoMarca?: string | null; inversorHibridoModelo?: string | null;
  inversorHibridoImagem?: string | null; inversorHibridoGarantiaAnos?: number | null;
  bateriaId?: string | null; bateriaMarca?: string | null; bateriaModelo?: string | null;
  bateriaCapacidadeKwh?: number | null; bateriaQtd?: number; bateriaImagem?: string | null; bateriaGarantiaAnos?: number | null;
  consumoDiarioKwh?: number | null; geracaoNubladoKwhDia?: number | null; geracaoTipicoKwhDia?: number | null;
  geracaoLimpoKwhDia?: number | null; autonomiaHoras?: number | null;
  precoTotal?: number | null; observacoes?: string | null;
}

export async function criarPropostaHibridaDB(input: NovaPropostaHibrida): Promise<string> {
  const payload = {
    cliente_nome: input.clienteNome, cliente_cidade: input.clienteCidade || null, cliente_telefone: input.clienteTelefone || null,
    responsavel_nome: input.responsavelNome || null, responsavel_telefone: input.responsavelTelefone || null, responsavel_email: input.responsavelEmail || null,
    placa_id: input.placaId || null, placa_marca: input.placaMarca || null, placa_modelo: input.placaModelo || null,
    placa_potencia_wp: input.placaPotenciaWp ?? null, qtd_placas: input.qtdPlacas ?? null, potencia_kwp: input.potenciaKwp ?? null,
    inversor_hibrido_id: input.inversorHibridoId || null, inversor_hibrido_marca: input.inversorHibridoMarca || null,
    inversor_hibrido_modelo: input.inversorHibridoModelo || null, inversor_hibrido_imagem: input.inversorHibridoImagem || null,
    inversor_hibrido_garantia_anos: input.inversorHibridoGarantiaAnos ?? null,
    bateria_id: input.bateriaId || null, bateria_marca: input.bateriaMarca || null, bateria_modelo: input.bateriaModelo || null,
    bateria_capacidade_kwh: input.bateriaCapacidadeKwh ?? null, bateria_qtd: input.bateriaQtd ?? 1,
    bateria_imagem: input.bateriaImagem || null, bateria_garantia_anos: input.bateriaGarantiaAnos ?? null,
    consumo_diario_kwh: input.consumoDiarioKwh ?? null, geracao_nublado_kwh_dia: input.geracaoNubladoKwhDia ?? null,
    geracao_tipico_kwh_dia: input.geracaoTipicoKwhDia ?? null, geracao_limpo_kwh_dia: input.geracaoLimpoKwhDia ?? null,
    autonomia_horas: input.autonomiaHoras ?? null,
    preco_total: input.precoTotal ?? null, observacoes: input.observacoes || null,
  };
  const { data, error } = await supabase.from('propostas_hibridas' as any).insert(payload).select('codigo_acesso').single();
  if (error) throw error;
  return (data as any).codigo_acesso;
}

export async function getPropostaHibridaByAccessDB(accessCode: string, authenticated: boolean): Promise<PropostaHibrida | null> {
  const query = authenticated
    ? supabase.from('propostas_hibridas' as any).select('*').or(`id.eq.${accessCode},codigo_acesso.eq.${accessCode}`).maybeSingle()
    : (supabase.rpc as any)('get_proposta_hibrida_public', { _codigo: accessCode }).maybeSingle();
  const { data, error } = await query;
  if (error) throw error;
  return data ? mapRow(data) : null;
}

export async function updatePropostaHibridaDB(id: string, patch: Partial<NovaPropostaHibrida> & { status?: string }): Promise<void> {
  const payload: Record<string, any> = { atualizado_em: new Date().toISOString() };
  if (patch.precoTotal !== undefined) payload.preco_total = patch.precoTotal;
  if (patch.observacoes !== undefined) payload.observacoes = patch.observacoes;
  if (patch.status !== undefined) payload.status = patch.status;
  const { error } = await supabase.from('propostas_hibridas' as any).update(payload).eq('id', id);
  if (error) throw error;
}

export async function marcarVisualizadaHibridaDB(accessCode: string): Promise<void> {
  await (supabase.rpc as any)('marcar_proposta_hibrida_visualizada', { _codigo: accessCode });
}
