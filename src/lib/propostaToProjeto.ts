import type { Proposal } from '@/data/types';

/**
 * Prefill payload passed to ProjetoForm when creating a project (obra)
 * from a closed proposal. Keys prefixed with "_" are match hints used to
 * auto-select placa_id / inversor_id from the equipment catalog.
 */
export interface ProjetoPrefill {
  nome_completo?: string;
  cidade?: string;
  estado?: string;
  qtd_placas?: string;
  geracao_estimada_kwh?: string;
  preco_venda?: string;
  // match hints (not form fields)
  _placaMarca?: string;
  _placaPotenciaWp?: number;
  _inversorMarca?: string;
  _inversorPotenciaKw?: number;
}

function parsePotenciaWp(label?: string): number | undefined {
  if (!label) return undefined;
  const n = parseFloat(String(label).replace(/[^\d.,]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function propostaToProjetoPrefill(p: Proposal): ProjetoPrefill {
  const salePrice = p.costBreakdown?.salePrice ?? p.totalPrice;
  const monthlyGen = p.dimensioning?.monthlyGeneration;
  return {
    nome_completo: p.clientData?.name || undefined,
    cidade: p.clientData?.city || undefined,
    estado: p.clientData?.state || undefined,
    qtd_placas: p.selectedKit?.panelCount ? String(p.selectedKit.panelCount) : undefined,
    geracao_estimada_kwh: monthlyGen ? String(Math.round(monthlyGen)) : undefined,
    preco_venda: salePrice ? String(salePrice) : undefined,
    _placaMarca: p.panelBrand || p.selectedKit?.panel?.brand || undefined,
    _placaPotenciaWp: parsePotenciaWp(p.panelPowerLabel) ?? p.selectedKit?.panel?.power,
    _inversorMarca: p.inverterBrand || p.selectedKit?.inverter?.brand || undefined,
    _inversorPotenciaKw: p.selectedKit?.inverter?.power,
  };
}
