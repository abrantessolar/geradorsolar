import { supabase } from '@/integrations/supabase/client';
import type { AdminSettings, Kit, Proposal, SocialProof, PriceTableEntry, Seller, Distributor } from './types';
import { CA_MATERIAL_TABLE_DEFAULT, DEFAULT_CARD_RATES } from './types';

// ─── VENDEDORES ───
export async function getVendedoresDB(): Promise<Seller[]> {
  const { data } = await supabase.from('vendedores').select('*').order('criado_em');
  if (!data || data.length === 0) return [];
  return data.map(d => ({
    id: d.id, name: d.nome || '', phone: d.telefone || '', email: d.email || '', active: d.ativo ?? true,
  }));
}

export async function saveVendedoresDB(sellers: Seller[]) {
  // Delete all, then insert
  await supabase.from('vendedores').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (sellers.length === 0) return;
  const rows = sellers.map(s => ({
    nome: s.name, telefone: s.phone, email: s.email, ativo: s.active,
  }));
  await supabase.from('vendedores').insert(rows);
}

// ─── DISTRIBUIDORAS ───
export async function getDistribuidorasDB(): Promise<Distributor[]> {
  const { data } = await supabase.from('distribuidoras').select('*').order('nome');
  if (!data || data.length === 0) return [];
  return data.map(d => ({ name: d.nome, kwhPrice: Number(d.valor_kwh) }));
}

export async function saveDistribuidorasDB(dists: Distributor[], defaultName: string) {
  await supabase.from('distribuidoras').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (dists.length === 0) return;
  const rows = dists.map(d => ({
    nome: d.name, valor_kwh: d.kwhPrice, padrao: d.name === defaultName,
  }));
  await supabase.from('distribuidoras').insert(rows);
}

// ─── CONFIGURAÇÕES ───
export async function getConfigDB(chave: string): Promise<any | null> {
  const { data } = await supabase.from('configuracoes').select('valor').eq('chave', chave).maybeSingle();
  return data?.valor ?? null;
}

export async function saveConfigDB(chave: string, valor: any) {
  const { data: existing } = await supabase.from('configuracoes').select('id').eq('chave', chave).maybeSingle();
  if (existing) {
    await supabase.from('configuracoes').update({ valor }).eq('chave', chave);
  } else {
    await supabase.from('configuracoes').insert({ chave, valor });
  }
}

export async function getSettingsDB(): Promise<AdminSettings | null> {
  const val = await getConfigDB('admin_settings');
  return val as AdminSettings | null;
}

export async function saveSettingsDB(s: AdminSettings) {
  await saveConfigDB('admin_settings', s);
}

// ─── PROPOSTAS ───
export async function getPropostasDB(): Promise<Proposal[]> {
  const { data } = await supabase.from('propostas').select('*').order('criado_em', { ascending: false });
  if (!data) return [];
  return data.map(d => {
    const full = d.dados_completos as any;
    const base = full ? { ...full, id: d.id } : {
      id: d.id,
      clientData: { id: d.id, name: d.cliente, state: d.uf, city: d.cidade, networkType: 'bifasica', kwhPrice: 0.85, seller: '' },
      status: d.status,
      createdAt: d.criado_em,
    };
    // Attach criador_user_id from the row
    (base as any).criador_user_id = (d as any).criador_user_id;
    return base as any;
  });
}

export async function getPropostaByIdDB(id: string): Promise<Proposal | null> {
  const { data } = await supabase.from('propostas').select('*').eq('id', id).maybeSingle();
  if (!data) return null;
  const full = data.dados_completos as any;
  return full ? { ...full, id: data.id } : null;
}

export async function savePropostaDB(proposal: Proposal, criadorUserId?: string): Promise<string> {
  const row: Record<string, any> = {
    cliente: proposal.clientData.name,
    vendedor_id: null as string | null,
    cidade: proposal.clientData.city,
    uf: proposal.clientData.state,
    consumo_mensal: proposal.dimensioning.avgMonthlyKwh,
    linha: proposal.selectedLine,
    num_placas: proposal.selectedKit.panelCount,
    potencia_kwp: proposal.dimensioning.powerKwp,
    valor_total: proposal.totalPrice,
    cet: proposal.cetApplied,
    status: proposal.status,
    dados_completos: proposal as any,
  };
  if (criadorUserId) row.criador_user_id = criadorUserId;

  // Check if exists
  const { data: existing } = await supabase.from('propostas').select('id').eq('id', proposal.id).maybeSingle();
  if (existing) {
    await supabase.from('propostas').update(row).eq('id', proposal.id);
    return proposal.id;
  } else {
    const { data } = await supabase.from('propostas').insert(row as any).select('id').single();
    return data?.id || proposal.id;
  }
}

export async function updatePropostaStatusDB(id: string, status: string) {
  await supabase.from('propostas').update({ status }).eq('id', id);
}

export async function markPropostaViewedDB(id: string) {
  await supabase.from('propostas').update({ visualizado_em: new Date().toISOString(), status: 'visualizada' }).eq('id', id);
}

// ─── TABELA DE PREÇOS ───
export async function getPriceTableDB(): Promise<PriceTableEntry[]> {
  const val = await getConfigDB('price_table');
  return (val as PriceTableEntry[]) || [];
}

export async function savePriceTableDB(table: PriceTableEntry[]) {
  await saveConfigDB('price_table', table);
}

// ─── PROVAS SOCIAIS ───
export async function getSocialProofsDB(): Promise<SocialProof[]> {
  const val = await getConfigDB('social_proofs');
  return (val as SocialProof[]) || [];
}

export async function saveSocialProofsDB(proofs: SocialProof[]) {
  await saveConfigDB('social_proofs', proofs);
}

// ─── CIDADES IRRADIÂNCIA ───
export async function importCidadesIrradianciaDB(cidades: any[]) {
  // Clear existing
  await supabase.from('cidades_irradiancia').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  // Insert in batches of 100
  for (let i = 0; i < cidades.length; i += 100) {
    const batch = cidades.slice(i, i + 100).map((c: any) => ({
      cidade: c.cidade || c.city || '',
      uf: c.uf || c.state || 'MS',
      jan: c.irr?.[0] ?? c.jan ?? null,
      fev: c.irr?.[1] ?? c.fev ?? null,
      mar: c.irr?.[2] ?? c.mar ?? null,
      abr: c.irr?.[3] ?? c.abr ?? null,
      mai: c.irr?.[4] ?? c.mai ?? null,
      jun: c.irr?.[5] ?? c.jun ?? null,
      jul: c.irr?.[6] ?? c.jul ?? null,
      ago: c.irr?.[7] ?? c.ago ?? null,
      set_: c.irr?.[8] ?? c.set ?? null,
      out_: c.irr?.[9] ?? c.out ?? null,
      nov: c.irr?.[10] ?? c.nov ?? null,
      dez: c.irr?.[11] ?? c.dez ?? null,
    }));
    await supabase.from('cidades_irradiancia').insert(batch);
  }
}

export async function getCidadesIrradianciaDB(cidade: string, uf: string) {
  const { data } = await supabase
    .from('cidades_irradiancia')
    .select('*')
    .ilike('cidade', cidade)
    .eq('uf', uf)
    .maybeSingle();
  if (!data) return null;
  return [
    Number(data.jan), Number(data.fev), Number(data.mar),
    Number(data.abr), Number(data.mai), Number(data.jun),
    Number(data.jul), Number(data.ago), Number(data.set_),
    Number(data.out_), Number(data.nov), Number(data.dez),
  ];
}
