export type Fornecedor = {
  id: string;
  nome: string;
  contato: string | null;
  telefone: string | null;
  ativo: boolean;
};

export type Material = {
  id: string;
  nome: string;
  categoria: string;
  imagem_url: string | null;
  preco_unitario: number | null;
  fornecedor_id: string | null;
  unidade: string;
  ativo: boolean;
  fornecedor?: Fornecedor;
};

export type QuantidadePadrao = {
  id: string;
  material_id: string;
  potencia: string;
  quantidade: number;
};

export type CaboPadrao = {
  id: string;
  potencia: string;
  tipo_cabo: string;
  observacao: string | null;
};

export type EstoqueItem = {
  id: string;
  material_id: string;
  quantidade_atual: number;
  quantidade_minima: number | null;
  material?: Material;
};

export type Movimentacao = {
  id: string;
  material_id: string;
  tipo: 'entrada' | 'saida' | 'retorno';
  quantidade: number;
  obra_id: string | null;
  observacao: string | null;
  usuario_id: string;
  criado_em: string;
};

export type MaterialObra = {
  id: string;
  projeto_id: string;
  material_id: string;
  quantidade_necessaria: number;
  quantidade_separada: number;
  separado: boolean;
  material?: Material;
};

export type CaboObra = {
  id: string;
  projeto_id: string;
  tipo_cabo: string;
  quantidade_metros: number;
  observacao: string | null;
};

export const CATEGORIAS = ['Eletroduto', 'Disjuntor', 'DPS', 'Cabo', 'Fixação', 'Conexão', 'Proteção', 'Outros'];

export const CATEGORIA_ICONS: Record<string, string> = {
  'Eletroduto': '🔧',
  'Disjuntor': '⚡',
  'DPS': '🛡️',
  'Cabo': '🔌',
  'Fixação': '🔩',
  'Conexão': '🔗',
  'Proteção': '🛡️',
  'Outros': '📦',
};

export const POTENCIAS = ['3', '4', '5', '6', '7.5', '8', '10', '1 MICRO', '2 MICRO', '3 MICRO', '4 MICRO', '5 MICRO', '6 MICRO', '7 MICRO', '8 MICRO'];
