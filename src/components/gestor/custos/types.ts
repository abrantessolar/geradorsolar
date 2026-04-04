export type CustoObra = {
  id: string;
  projeto_id: string;
  criado_em: string;
  atualizado_em: string;
  custo_kit: number;
  custo_instalacao: number;
  custo_trt: number;
  custo_materiais: number;
  custo_frete: number | null;
  custo_homologacao: number | null;
  custo_comissao: number | null;
  custo_outros: number | null;
  descricao_outros: string | null;
  preco_venda: number;
  observacoes: string | null;
};

export type ProjetoComCusto = {
  id: string;
  nome_completo?: string;
  razao_social?: string;
  qtd_placas?: number;
  potencia_placa?: string;
  preco_venda?: number;
  status: string;
  instalador?: string;
  data_instalacao?: string;
  data_fechamento?: string;
  criado_em: string;
  custo?: CustoObra;
};

export function calcCustoTotal(c: Partial<CustoObra>): number {
  return (
    (c.custo_kit || 0) +
    (c.custo_instalacao || 0) +
    (c.custo_trt || 0) +
    (c.custo_materiais || 0) +
    (c.custo_frete || 0) +
    (c.custo_homologacao || 0) +
    (c.custo_comissao || 0) +
    (c.custo_outros || 0)
  );
}

export function calcLucroBruto(c: Partial<CustoObra>): number {
  return (c.preco_venda || 0) - calcCustoTotal(c);
}

export function calcMargem(c: Partial<CustoObra>): number {
  const venda = c.preco_venda || 0;
  if (venda <= 0) return 0;
  return (calcLucroBruto(c) / venda) * 100;
}

export function margemColor(margem: number): string {
  if (margem > 20) return 'text-green-600';
  if (margem >= 10) return 'text-yellow-600';
  return 'text-red-600';
}

export function margemBgColor(margem: number): string {
  if (margem > 20) return 'bg-green-500';
  if (margem >= 10) return 'bg-yellow-500';
  return 'bg-red-500';
}

export const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
