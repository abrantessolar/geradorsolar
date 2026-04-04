import React, { useState } from 'react';
import { BarChart3, List } from 'lucide-react';
import CustosLista from './CustosLista';
import CustosDashboard from './CustosDashboard';
import { ProjetoComCusto, calcCustoTotal, calcLucroBruto, calcMargem, fmt } from './types';

export default function CustosModule() {
  const [subTab, setSubTab] = useState<'lista' | 'dashboard'>('lista');

  const handleExport = async (data: ProjetoComCusto[]) => {
    // CSV export
    const headers = ['Cliente', 'KWp', 'Venda', 'Kit', 'Instalação', 'Materiais', 'TRT', 'Frete', 'Homologação', 'Comissão', 'Outros', 'Custo Total', 'Lucro', 'Margem %'];
    const rows = data.map(p => {
      const c = p.custo;
      const kwp = p.qtd_placas && p.potencia_placa ? (p.qtd_placas * parseFloat(p.potencia_placa)) / 1000 : 0;
      if (!c) return [p.nome_completo || p.razao_social || '', kwp.toFixed(2), p.preco_venda || 0, '', '', '', '', '', '', '', '', '', '', ''];
      const total = calcCustoTotal(c);
      const lucro = calcLucroBruto(c);
      const margem = calcMargem(c);
      return [
        p.nome_completo || p.razao_social || '',
        kwp.toFixed(2),
        p.preco_venda || 0,
        c.custo_kit, c.custo_instalacao, c.custo_materiais, c.custo_trt,
        c.custo_frete || 0, c.custo_homologacao || 0, c.custo_comissao || 0, c.custo_outros || 0,
        total.toFixed(2), lucro.toFixed(2), margem.toFixed(1),
      ];
    });

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `custos_obras_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { key: 'lista' as const, label: 'Lista', icon: List },
    { key: 'dashboard' as const, label: 'Dashboard', icon: BarChart3 },
  ];

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 flex-nowrap overflow-x-auto pb-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
              subTab === t.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'
            }`}>
            <t.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {t.label}
          </button>
        ))}
      </div>

      {subTab === 'lista' && <CustosLista onExport={handleExport} />}
      {subTab === 'dashboard' && <CustosDashboard />}
    </div>
  );
}
