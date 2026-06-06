// Setores de FAQ — compartilhado entre site público, link do cliente e admin.

export interface FaqSetor {
  key: string;
  label: string;
  icone: string;
}

export const FAQ_SETORES: FaqSetor[] = [
  { key: 'fila_instalacao', label: 'Fila e Instalação', icone: '⏳' },
  { key: 'concessionaria', label: 'Concessionária', icone: '⚡' },
  { key: 'financiamento', label: 'Financiamento', icone: '💰' },
  { key: 'tecnico', label: 'Técnico', icone: '🔧' },
  { key: 'documentos', label: 'Documentos', icone: '📄' },
  { key: 'fiscal_nf', label: 'Fiscal e NF', icone: '📋' },
  { key: 'geral', label: 'Geral', icone: '❓' },
];

export function getSetor(key: string): FaqSetor {
  return FAQ_SETORES.find((s) => s.key === key) || { key, label: key, icone: '❓' };
}

export interface FaqItem {
  id: string;
  setor: string;
  pergunta: string;
  resposta: string;
  visivel_cliente: boolean;
  visivel_site: boolean;
  ativo: boolean;
  ordem: number;
}
