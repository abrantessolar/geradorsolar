import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, Download, RefreshCw } from 'lucide-react';
import { ProjetoComCusto, CustoObra, calcCustoTotal, calcLucroBruto, calcMargem, margemColor, fmt } from './types';
import CustoModal from './CustoModal';

type Props = {
  onExport: (data: ProjetoComCusto[]) => void;
};

export default function CustosLista({ onExport }: Props) {
  const [projetos, setProjetos] = useState<ProjetoComCusto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProjeto, setSelectedProjeto] = useState<ProjetoComCusto | null>(null);

  // Filters
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroInstalador, setFiltroInstalador] = useState('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState('');
  const [instaladores, setInstaladores] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: projs } = await supabase
      .from('projetos' as any)
      .select('id, nome_completo, razao_social, qtd_placas, potencia_placa, preco_venda, status, instalador, data_instalacao, criado_em')
      .order('criado_em', { ascending: false });

    const { data: custos } = await supabase.from('custos_obra' as any).select('*');

    const custosMap = new Map<string, CustoObra>();
    for (const c of (custos || []) as any[]) {
      custosMap.set(c.projeto_id, c);
    }

    const instSet = new Set<string>();
    const result: ProjetoComCusto[] = (projs || []).map((p: any) => {
      if (p.instalador) instSet.add(p.instalador);
      return { ...p, custo: custosMap.get(p.id) };
    });

    setInstaladores([...instSet]);
    setProjetos(result);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = projetos.filter(p => {
    if (filtroStatus === 'instalado' && p.status !== 'Instalado' && p.status !== 'Homologado') return false;
    if (filtroStatus === 'pendente' && (p.status === 'Instalado' || p.status === 'Homologado')) return false;
    if (filtroInstalador !== 'todos' && p.instalador !== filtroInstalador) return false;
    if (filtroPeriodo) {
      const d = p.data_instalacao || p.criado_em?.slice(0, 7);
      if (!d?.startsWith(filtroPeriodo)) return false;
    }
    return true;
  });

  const kwp = (p: ProjetoComCusto) => {
    if (!p.qtd_placas || !p.potencia_placa) return 0;
    return (p.qtd_placas * parseFloat(p.potencia_placa)) / 1000;
  };

  const openModal = (p: ProjetoComCusto) => {
    setSelectedProjeto(p);
    setModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="w-36">
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="instalado">Instalado</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <Select value={filtroInstalador} onValueChange={setFiltroInstalador}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Instalador" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {instaladores.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Input type="month" value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)} className="w-40 h-9 text-xs" />
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-3.5 h-3.5 mr-1" /> Atualizar</Button>
        <Button variant="outline" size="sm" onClick={() => onExport(filtered)}><Download className="w-3.5 h-3.5 mr-1" /> Exportar Excel</Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-2">Cliente</th>
              <th className="text-right p-2">KWp</th>
              <th className="text-right p-2">Venda</th>
              <th className="text-right p-2">Kit</th>
              <th className="text-right p-2">Instal.</th>
              <th className="text-right p-2">Mat.</th>
              <th className="text-right p-2">TRT</th>
              <th className="text-right p-2">Outros</th>
              <th className="text-right p-2">Total</th>
              <th className="text-right p-2">Lucro</th>
              <th className="text-right p-2">Margem</th>
              <th className="text-center p-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={12} className="p-4 text-center text-muted-foreground">Carregando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={12} className="p-4 text-center text-muted-foreground">Nenhum projeto encontrado</td></tr>
            ) : filtered.map(p => {
              const c = p.custo;
              const custoTotal = c ? calcCustoTotal(c) : 0;
              const lucro = c ? calcLucroBruto(c) : 0;
              const margem = c ? calcMargem(c) : 0;
              const extras = (c?.custo_frete || 0) + (c?.custo_homologacao || 0) + (c?.custo_comissao || 0) + (c?.custo_outros || 0);

              return (
                <tr key={p.id} className="border-t hover:bg-muted/50">
                  <td className="p-2 font-medium">{p.nome_completo || p.razao_social || '—'}</td>
                  <td className="p-2 text-right">{kwp(p).toFixed(2)}</td>
                  <td className="p-2 text-right">{fmt(p.preco_venda || 0)}</td>
                  {c ? (
                    <>
                      <td className="p-2 text-right">{fmt(c.custo_kit)}</td>
                      <td className="p-2 text-right">{fmt(c.custo_instalacao)}</td>
                      <td className="p-2 text-right">{fmt(c.custo_materiais)}</td>
                      <td className="p-2 text-right">{fmt(c.custo_trt)}</td>
                      <td className="p-2 text-right">{fmt(extras)}</td>
                      <td className="p-2 text-right font-semibold">{fmt(custoTotal)}</td>
                      <td className={`p-2 text-right font-semibold ${lucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(lucro)}</td>
                      <td className={`p-2 text-right font-bold ${margemColor(margem)}`}>{margem.toFixed(1)}%</td>
                    </>
                  ) : (
                    <td colSpan={7} className="p-2 text-center text-muted-foreground italic">Sem custos registrados</td>
                  )}
                  <td className="p-2 text-center">
                    <Button variant="ghost" size="sm" onClick={() => openModal(p)} title="Registrar Custos">
                      <DollarSign className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedProjeto && (
        <CustoModal
          open={modalOpen}
          onClose={() => { setModalOpen(false); setSelectedProjeto(null); }}
          projetoId={selectedProjeto.id}
          nomeCliente={selectedProjeto.nome_completo || selectedProjeto.razao_social || '—'}
          qtdPlacas={selectedProjeto.qtd_placas || 0}
          precoVenda={selectedProjeto.preco_venda || 0}
          onSaved={load}
        />
      )}
    </div>
  );
}
