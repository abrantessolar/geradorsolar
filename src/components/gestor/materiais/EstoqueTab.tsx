import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, RotateCcw, Package } from 'lucide-react';
import { CATEGORIA_ICONS } from './types';
import EntradaLoteModal from './EntradaLoteModal';

type EstoqueRow = {
  id: string;
  material_id: string;
  quantidade_atual: number;
  quantidade_minima: number | null;
  material_nome: string;
  material_categoria: string;
  preco_unitario: number | null;
  fornecedor_nome: string | null;
};

type MovRow = {
  id: string;
  material_nome: string;
  tipo: string;
  quantidade: number;
  obra_nome: string | null;
  observacao: string | null;
  criado_em: string;
};

export default function EstoqueTab() {
  const { session } = useAuth();
  const [items, setItems] = useState<EstoqueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState('');
  const [movModal, setMovModal] = useState<{ materialId: string; nome: string; tipo: 'entrada' | 'retorno' } | null>(null);
  const [movQtd, setMovQtd] = useState('');
  const [movObs, setMovObs] = useState('');
  const [showEntradaLote, setShowEntradaLote] = useState(false);
  const [showHistorico, setShowHistorico] = useState(false);
  const [historico, setHistorico] = useState<MovRow[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);
  const [showZerar, setShowZerar] = useState(false);
  const [zerando, setZerando] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('estoque' as any)
      .select('*, materiais(nome, categoria, preco_unitario, fornecedores_materiais(nome))')
      .order('quantidade_atual', { ascending: true });
    
    setItems((data || []).map((e: any) => ({
      id: e.id,
      material_id: e.material_id,
      quantidade_atual: e.quantidade_atual,
      quantidade_minima: e.quantidade_minima,
      material_nome: e.materiais?.nome || '—',
      material_categoria: e.materiais?.categoria || 'Outros',
      preco_unitario: e.materiais?.preco_unitario,
      fornecedor_nome: e.materiais?.fornecedores_materiais?.nome || null,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const loadHistorico = async () => {
    setLoadingHist(true);
    const { data } = await supabase
      .from('movimentacoes_estoque' as any)
      .select('*, materiais(nome), projetos(nome_completo, razao_social)')
      .order('criado_em', { ascending: false })
      .limit(100);
    
    setHistorico((data || []).map((m: any) => ({
      id: m.id,
      material_nome: m.materiais?.nome || '—',
      tipo: m.tipo,
      quantidade: m.quantidade,
      obra_nome: m.projetos?.nome_completo || m.projetos?.razao_social || null,
      observacao: m.observacao,
      criado_em: m.criado_em,
    })));
    setLoadingHist(false);
  };

  const handleMovimentacao = async () => {
    if (!movModal || !movQtd || !session?.user?.id) return;
    const qtd = parseInt(movQtd);
    if (qtd <= 0) { toast.error('Quantidade inválida'); return; }

    await supabase.from('movimentacoes_estoque' as any).insert({
      material_id: movModal.materialId,
      tipo: movModal.tipo,
      quantidade: qtd,
      observacao: movObs || null,
      usuario_id: session.user.id,
    });

    const item = items.find(i => i.material_id === movModal.materialId);
    if (item) {
      const newQtd = item.quantidade_atual + qtd;
      await supabase.from('estoque' as any).update({ quantidade_atual: newQtd, atualizado_em: new Date().toISOString() }).eq('material_id', movModal.materialId);
    }

    toast.success(`${movModal.tipo === 'entrada' ? 'Entrada' : 'Retorno'} registrado!`);
    setMovModal(null);
    setMovQtd('');
    setMovObs('');
    load();
  };

  const filtered = items.filter(i => !catFilter || i.material_categoria === catFilter);
  const totalValor = filtered.reduce((sum, i) => sum + (i.quantidade_atual * (i.preco_unitario || 0)), 0);
  const categorias = [...new Set(items.map(i => i.material_categoria))].sort();

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select className="solar-input max-w-[200px]" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">Todas categorias</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={() => setShowEntradaLote(true)} className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground flex items-center gap-2">
          <Package className="w-4 h-4" /> Entrada em Lote
        </button>
        <button
          onClick={() => { setShowHistorico(!showHistorico); if (!showHistorico) loadHistorico(); }}
          className="px-4 py-2 rounded-lg text-sm bg-muted hover:bg-muted/70 flex items-center gap-2"
        >
          📋 {showHistorico ? 'Ocultar' : 'Ver'} Histórico
        </button>
        <div className="ml-auto solar-card px-4 py-2">
          <span className="text-sm text-muted-foreground">Valor total em estoque: </span>
          <span className="font-bold text-primary">R$ {totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Histórico de movimentações */}
      {showHistorico && (
        <div className="solar-card p-4 space-y-2">
          <h3 className="text-sm font-bold">Últimas Movimentações</h3>
          {loadingHist ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : historico.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-1 px-2">Material</th>
                    <th className="py-1 px-2">Tipo</th>
                    <th className="py-1 px-2 text-center">Qtd</th>
                    <th className="py-1 px-2">Obra/Cliente</th>
                    <th className="py-1 px-2">Data</th>
                    <th className="py-1 px-2">Obs</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map(m => (
                    <tr key={m.id} className="border-b border-border/30">
                      <td className="py-1 px-2 font-medium">{m.material_nome}</td>
                      <td className="py-1 px-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          m.tipo === 'entrada' ? 'bg-primary/10 text-primary' :
                          m.tipo === 'saida' ? 'bg-destructive/10 text-destructive' :
                          'bg-accent text-accent-foreground'
                        }`}>
                          {m.tipo === 'entrada' ? '➕ Entrada' : m.tipo === 'saida' ? '➖ Saída' : '↩️ Retorno'}
                        </span>
                      </td>
                      <td className="py-1 px-2 text-center">{m.quantidade}</td>
                      <td className="py-1 px-2">{m.obra_nome || <span className="text-muted-foreground">—</span>}</td>
                      <td className="py-1 px-2 text-muted-foreground">{new Date(m.criado_em).toLocaleDateString('pt-BR')}</td>
                      <td className="py-1 px-2 text-muted-foreground max-w-[150px] truncate">{m.observacao || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="solar-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-3 px-4">Material</th>
              <th className="py-3 px-4">Estoque Atual</th>
              <th className="py-3 px-4">Preço Unit.</th>
              <th className="py-3 px-4">Valor Total</th>
              <th className="py-3 px-4">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => {
              const valorTotal = item.quantidade_atual * (item.preco_unitario || 0);
              const lowStock = item.quantidade_minima && item.quantidade_atual <= item.quantidade_minima;
              return (
                <tr key={item.id} className={`border-b border-border/50 hover:bg-muted/30 ${lowStock ? 'bg-destructive/5' : ''}`}>
                  <td className="py-3 px-4 font-medium">
                    <span className="mr-2">{CATEGORIA_ICONS[item.material_categoria] || '📦'}</span>
                    {item.material_nome}
                    {item.fornecedor_nome && <span className="ml-2 text-xs text-muted-foreground">({item.fornecedor_nome})</span>}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`font-bold ${item.quantidade_atual === 0 ? 'text-destructive' : lowStock ? 'text-amber-600' : ''}`}>
                      {item.quantidade_atual}
                    </span>
                    {lowStock && <span className="ml-2 text-[10px] text-destructive">⚠ Baixo</span>}
                  </td>
                  <td className="py-3 px-4">{item.preco_unitario ? `R$ ${Number(item.preco_unitario).toFixed(2)}` : '—'}</td>
                  <td className="py-3 px-4 font-medium">{valorTotal > 0 ? `R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      <button onClick={() => setMovModal({ materialId: item.material_id, nome: item.material_nome, tipo: 'entrada' })}
                        className="px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20" title="Entrada">
                        <Plus className="w-3 h-3 inline" /> Entrada
                      </button>
                      <button onClick={() => setMovModal({ materialId: item.material_id, nome: item.material_nome, tipo: 'retorno' })}
                        className="px-2 py-1 rounded text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/80" title="Retorno">
                        <RotateCcw className="w-3 h-3 inline" /> Retorno
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Nenhum item em estoque.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de movimentação individual (entrada/retorno apenas) */}
      {movModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setMovModal(null)}>
          <div className="bg-background rounded-xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold">
              {movModal.tipo === 'entrada' ? '➕ Entrada' : '↩️ Retorno'}
            </h3>
            <p className="text-sm text-muted-foreground">{movModal.nome}</p>
            <input className="solar-input w-full" type="number" min="1" placeholder="Quantidade" value={movQtd} onChange={e => setMovQtd(e.target.value)} autoFocus />
            <input className="solar-input w-full" placeholder="Observação (opcional)" value={movObs} onChange={e => setMovObs(e.target.value)} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setMovModal(null)} className="px-4 py-2 rounded-lg text-sm bg-muted text-muted-foreground">Cancelar</button>
              <button onClick={handleMovimentacao} className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de entrada em lote */}
      {showEntradaLote && (
        <EntradaLoteModal onClose={() => setShowEntradaLote(false)} onDone={load} />
      )}
    </div>
  );
}
