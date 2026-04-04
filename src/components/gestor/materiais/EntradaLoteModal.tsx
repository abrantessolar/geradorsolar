import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { X, Loader2 } from 'lucide-react';
import { CATEGORIA_ICONS } from './types';

type MatRow = {
  id: string;
  nome: string;
  categoria: string;
  estoque_atual: number;
  entrada: string;
  preco_unitario: number | null;
};

export default function EntradaLoteModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { session } = useAuth();
  const [rows, setRows] = useState<MatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nota, setNota] = useState('');

  useEffect(() => {
    (async () => {
      const [{ data: mats }, { data: estoque }] = await Promise.all([
        supabase.from('materiais').select('id, nome, categoria, preco_unitario').eq('ativo', true).order('categoria').order('nome'),
        supabase.from('estoque').select('material_id, quantidade_atual'),
      ]);
      const estoqueMap: Record<string, number> = {};
      (estoque || []).forEach((e: any) => { estoqueMap[e.material_id] = e.quantidade_atual || 0; });
      setRows((mats || []).map((m: any) => ({
        id: m.id, nome: m.nome, categoria: m.categoria,
        estoque_atual: estoqueMap[m.id] || 0,
        entrada: '', preco_unitario: m.preco_unitario ? Number(m.preco_unitario) : null,
      })));
      setLoading(false);
    })();
  }, []);

  const handleConfirm = async () => {
    const userId = session?.user?.id;
    if (!userId) { toast.error('Sessão expirada'); return; }
    const entradas = rows.filter(r => r.entrada && parseInt(r.entrada) > 0);
    if (entradas.length === 0) { toast.error('Nenhuma quantidade informada'); return; }
    setSaving(true);
    try {
      // Save price updates for all rows with a price
      for (const row of rows) {
        if (row.preco_unitario != null) {
          await supabase.from('materiais').update({ preco_unitario: Number(row.preco_unitario) }).eq('id', row.id);
        }
      }
      for (const row of entradas) {
        const qtd = parseInt(row.entrada);
        // Register movement
        await supabase.from('movimentacoes_estoque').insert({
          material_id: row.id, tipo: 'entrada', quantidade: qtd,
          observacao: nota || null, usuario_id: userId,
        });
        // Update stock
        const { data: est } = await supabase.from('estoque').select('quantidade_atual').eq('material_id', row.id).maybeSingle();
        if (est) {
          await supabase.from('estoque').update({
            quantidade_atual: (est as any).quantidade_atual + qtd,
            atualizado_em: new Date().toISOString(),
          }).eq('material_id', row.id);
        } else {
          await supabase.from('estoque').insert({
            material_id: row.id, quantidade_atual: qtd, quantidade_minima: null,
          });
        }
      }
      toast.success(`${entradas.length} entradas registradas com sucesso!`);
      onDone();
      onClose();
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    }
    setSaving(false);
  };

  const totalEntrada = rows.reduce((sum, r) => {
    const qtd = parseInt(r.entrada) || 0;
    return sum + (qtd * (r.preco_unitario || 0));
  }, 0);
  const qtdItens = rows.filter(r => r.entrada && parseInt(r.entrada) > 0).length;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-primary">📦 Entrada em Lote</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <input
          className="solar-input w-full"
          placeholder="Nota geral (ex: Compra NF 1234 - Fornecedor X)"
          value={nota}
          onChange={e => setNota(e.target.value)}
        />

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <div className="border rounded-lg overflow-hidden max-h-[55vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted">
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 px-3">Material</th>
                  <th className="py-2 px-3 text-center w-24">Qtd Atual</th>
                  <th className="py-2 px-3 text-center w-32">+ Entrada</th>
                  <th className="py-2 px-3 text-center w-28">R$ Unit.</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="py-2 px-3">
                      <span className="mr-1">{CATEGORIA_ICONS[row.categoria] || '📦'}</span>
                      {row.nome}
                    </td>
                    <td className="py-2 px-3 text-center font-medium">{row.estoque_atual}</td>
                    <td className="py-2 px-3 text-center">
                      <input
                        className="solar-input w-20 text-center mx-auto"
                        type="number" min="0"
                        value={row.entrada}
                        onChange={e => {
                          const newRows = [...rows];
                          newRows[idx] = { ...newRows[idx], entrada: e.target.value };
                          setRows(newRows);
                        }}
                        placeholder="0"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <input
                        className="solar-input w-20 text-center mx-auto"
                        type="number" min="0" step="0.01"
                        value={row.preco_unitario != null ? String(row.preco_unitario) : ''}
                        onChange={e => {
                          const newRows = [...rows];
                          newRows[idx] = { ...newRows[idx], preco_unitario: e.target.value ? Number(e.target.value) : null };
                          setRows(newRows);
                        }}
                        placeholder="0.00"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="text-sm text-muted-foreground">
            {qtdItens} itens · Valor estimado: <span className="font-bold text-foreground">R$ {totalEntrada.toFixed(2)}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm bg-muted text-muted-foreground">Cancelar</button>
            <button onClick={handleConfirm} disabled={saving || qtdItens === 0}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-50">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Salvando...</> : `Confirmar ${qtdItens} entradas`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
