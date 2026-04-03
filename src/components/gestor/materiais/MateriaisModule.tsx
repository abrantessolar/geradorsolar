import React, { useState } from 'react';
import { Package, Warehouse, Truck, ShoppingCart } from 'lucide-react';
import ProdutosTab from './ProdutosTab';
import EstoqueTab from './EstoqueTab';
import FornecedoresTab from './FornecedoresTab';
import ComprasTab from './ComprasTab';

const SUB_TABS = [
  { key: 'produtos', label: 'Produtos', icon: Package },
  { key: 'estoque', label: 'Estoque', icon: Warehouse },
  { key: 'fornecedores', label: 'Fornecedores', icon: Truck },
  { key: 'compras', label: 'Compras', icon: ShoppingCart },
] as const;

type SubTab = typeof SUB_TABS[number]['key'];

export default function MateriaisModule() {
  const [subTab, setSubTab] = useState<SubTab>('produtos');

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {SUB_TABS.map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              subTab === t.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {subTab === 'produtos' && <ProdutosTab />}
      {subTab === 'estoque' && <EstoqueTab />}
      {subTab === 'fornecedores' && <FornecedoresTab />}
      {subTab === 'compras' && <ComprasTab />}
    </div>
  );
}
