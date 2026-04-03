import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, Minus, RotateCcw } from 'lucide-react';
import { CATEGORIA_ICONS } from './types';

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

export default function EstoqueTab() {
  const { session } = useAuth();
  const [items, setItems] = useState<EstoqueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState('');
  const [movModal, setMovModal] = useState<{ materialId: string; nome: string; tipo: 'entrada' | 'saida' | 'retorno' } | null>(null);
  const [movQtd, setMovQtd] = useState('');
  const [movObs, setMovObs] = useState('');

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

  const handleMovimentacao = async () => {
    if (!movModal || !movQtd || !session?.user?.id) return;
    const qtd = parseInt(movQtd);
    if (qtd <= 0) { toast.error('Quantidade inválida'); return; }

    // Register movement
    await supabase.from('movimentacoes_estoque' as any).insert({
      material_id: movModal.materialId,
      tipo: movModal.tipo,
      quantidade: qtd,
      observacao: movObs || null,
      usuario_id: session.user.id,
    });

    // Update stock
    const item = items.find(i => i.material_id === movModal.materialId);
    if (item) {
      const newQtd = movModal.tipo === 'saida'
        ? Math.max(0, item.quantidade_atual - qtd)
        : item.quantidade_atual + qtd;
      await supabase.from('estoque' as any).update({ quantidade_atual: newQtd, atualizado_em: new Date().toISOString() }).eq('material_id', movModal.materialId);
    }

    toast.success(`${movModal.tipo === 'entrada' ? 'Entrada' : movModal.tipo === 'saida' ? 'Saída' : 'Retorno'} registrado!`);
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
        <div className="ml-auto solar-card px-4 py-2">
          <span className="text-sm text-muted-foreground">Valor total em estoque: </span>
          <span className="font-bold text-primary">R$ {totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

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
                        className="px-2 py-1 rounded text-xs font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200" title="Entrada">
                        <Plus className="w-3 h-3 inline" /> Entrada
                      </button>
                      <button onClick={() => setMovModal({ materialId: item.material_id, nome: item.material_nome, tipo: 'saida' })}
                        className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200" title="Saída">
                        <Minus className="w-3 h-3 inline" /> Saída
                      </button>
                      <button onClick={() => setMovModal({ materialId: item.material_id, nome: item.material_nome, tipo: 'retorno' })}
                        className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200" title="Retorno">
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

      {/* Modal de movimentação */}
      {movModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setMovModal(null)}>
          <div className="bg-background rounded-xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold">
              {movModal.tipo === 'entrada' ? '➕ Entrada' : movModal.tipo === 'saida' ? '➖ Saída' : '↩️ Retorno'}
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
    </div>
  );
}
