import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, Download, RefreshCw, Pencil, Check, X } from 'lucide-react';
import { ProjetoComCusto, CustoObra, calcCustoTotal, calcLucroBruto, calcMargem, margemColor, fmt } from './types';
import CustoModal from './CustoModal';
import { toast } from 'sonner';

type Props = {
  onExport: (data: ProjetoComCusto[]) => void;
};

const MESES = [
  { value: '01', label: 'Janeiro' }, { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' }, { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' }, { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' }, { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' }, { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' }, { value: '12', label: 'Dezembro' },
];
const ANOS = ['2024', '2025', '2026'];

export default function CustosLista({ onExport }: Props) {
  const [projetos, setProjetos] = useState<ProjetoComCusto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProjeto, setSelectedProjeto] = useState<ProjetoComCusto | null>(null);

  // Filters
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroInstalador, setFiltroInstalador] = useState('todos');
  const now = new Date();
  const [filtroMes, setFiltroMes] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [filtroAno, setFiltroAno] = useState(String(now.getFullYear()));
  const [instaladores, setInstaladores] = useState<string[]>([]);

  // Inline edit for preco_venda
  const [editingVendaId, setEditingVendaId] = useState<string | null>(null);
  const [editingVendaValue, setEditingVendaValue] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data: projs } = await supabase
      .from('projetos' as any)
      .select('id, nome_completo, razao_social, qtd_placas, potencia_placa, preco_venda, status, instalador, data_instalacao, data_fechamento, criado_em')
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
    // Filter by data_fechamento month/year
    const periodo = `${filtroAno}-${filtroMes}`;
    const d = (p as any).data_fechamento || p.data_instalacao || p.criado_em?.slice(0, 7);
    if (!d?.startsWith(periodo)) return false;
    return true;
  });

  const kwp = (p: ProjetoComCusto) => {
    if (p.qtd_placas && p.potencia_placa) {
      return (p.qtd_placas * parseFloat(p.potencia_placa)) / 1000;
    }
    return 0;
  };

  const openModal = (p: ProjetoComCusto) => {
    setSelectedProjeto(p);
    setModalOpen(true);
  };

  const saveVenda = async (projetoId: string) => {
    const valor = parseFloat(editingVendaValue);
    if (isNaN(valor) || valor < 0) { toast.error('Valor inválido'); return; }
    const { error } = await supabase.from('projetos' as any).update({ preco_venda: valor }).eq('id', projetoId);
    if (error) { toast.error('Erro ao salvar: ' + error.message); return; }
    // Also update custos_obra if exists
    await supabase.from('custos_obra' as any).update({ preco_venda: valor }).eq('projeto_id', projetoId);
    toast.success('Preço de venda atualizado!');
    setEditingVendaId(null);
    load();
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
        <div className="w-36">
          <Select value={filtroMes} onValueChange={setFiltroMes}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Mês" /></SelectTrigger>
            <SelectContent>
              {MESES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-24">
          <Select value={filtroAno} onValueChange={setFiltroAno}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Ano" /></SelectTrigger>
            <SelectContent>
              {ANOS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-3.5 h-3.5 mr-1" /> Atualizar</Button>
        <Button variant="outline" size="sm" onClick={() => onExport(filtered)}><Download className="w-3.5 h-3.5 mr-1" /> Exportar</Button>
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
              <tr><td colSpan={12} className="p-4 text-center text-muted-foreground">Nenhum projeto encontrado neste período</td></tr>
            ) : filtered.map(p => {
              const c = p.custo;
              const venda = p.preco_venda || 0;
              const custoTotal = c ? calcCustoTotal(c) : 0;
              const lucro = venda > 0 && c ? venda - custoTotal : 0;
              const margem = venda > 0 && c ? (lucro / venda) * 100 : null;
              const extras = (c?.custo_frete || 0) + (c?.custo_homologacao || 0) + (c?.custo_comissao || 0) + (c?.custo_outros || 0);

              return (
                <tr key={p.id} className="border-t hover:bg-muted/50">
                  <td className="p-2 font-medium">{p.nome_completo || p.razao_social || '—'}</td>
                  <td className="p-2 text-right">{kwp(p).toFixed(2)}</td>
                  <td className="p-2 text-right">
                    {editingVendaId === p.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={editingVendaValue}
                          onChange={e => setEditingVendaValue(e.target.value)}
                          className="h-6 w-24 text-xs"
                          autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') saveVenda(p.id); if (e.key === 'Escape') setEditingVendaId(null); }}
                        />
                        <button onClick={() => saveVenda(p.id)} className="text-green-600 hover:text-green-700"><Check className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setEditingVendaId(null)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 ${!venda ? 'text-muted-foreground italic' : ''} cursor-pointer hover:text-primary`}
                        onClick={() => { setEditingVendaId(p.id); setEditingVendaValue(String(venda || '')); }}
                        title="Clique para editar"
                      >
                        {venda ? fmt(venda) : 'R$ 0'}
                        <Pencil className="w-3 h-3 text-muted-foreground" />
                      </span>
                    )}
                  </td>
                  {c ? (
                    <>
                      <td className="p-2 text-right">{fmt(c.custo_kit)}</td>
                      <td className="p-2 text-right">{fmt(c.custo_instalacao)}</td>
                      <td className="p-2 text-right">{fmt(c.custo_materiais)}</td>
                      <td className="p-2 text-right">{fmt(c.custo_trt)}</td>
                      <td className="p-2 text-right">{fmt(extras)}</td>
                      <td className="p-2 text-right font-semibold">{fmt(custoTotal)}</td>
                      <td className={`p-2 text-right font-semibold ${lucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(lucro)}</td>
                      <td className={`p-2 text-right font-bold ${margem !== null ? margemColor(margem) : ''}`}>
                        {margem !== null ? `${margem.toFixed(1)}%` : '—'}
                      </td>
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
