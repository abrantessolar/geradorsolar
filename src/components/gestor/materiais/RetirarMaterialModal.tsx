import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { X, Loader2, Check, AlertTriangle } from 'lucide-react';
import { CATEGORIA_ICONS } from './types';
import type { Projeto } from '@/pages/GestorPage';

type MatItem = {
  id: string;
  material_id: string;
  nome: string;
  categoria: string;
  quantidade_necessaria: number;
  quantidade_separada: number;
  separado: boolean;
  estoque_atual: number;
  selected: boolean;
};

export default function RetirarMaterialModal({ projeto, onClose, onDone }: {
  projeto: Projeto;
  onClose: () => void;
  onDone: () => void;
}) {
  const { session } = useAuth();
  const [items, setItems] = useState<MatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: mats }, { data: estoque }] = await Promise.all([
        supabase.from('lista_materiais_obra').select('*, materiais(nome, categoria)').eq('projeto_id', projeto.id),
        supabase.from('estoque').select('material_id, quantidade_atual'),
      ]);
      const estoqueMap: Record<string, number> = {};
      (estoque || []).forEach((e: any) => { estoqueMap[e.material_id] = e.quantidade_atual || 0; });

      setItems((mats || []).map((m: any) => ({
        id: m.id, material_id: m.material_id,
        nome: m.materiais?.nome || '—', categoria: m.materiais?.categoria || 'Outros',
        quantidade_necessaria: m.quantidade_necessaria,
        quantidade_separada: m.quantidade_separada,
        separado: m.separado,
        estoque_atual: estoqueMap[m.material_id] || 0,
        selected: !m.separado,
      })));
      setLoading(false);
    })();
  }, [projeto.id]);

  const toggleItem = (idx: number) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, selected: !item.selected } : item));
  };

  const handleConfirm = async () => {
    const userId = session?.user?.id;
    if (!userId) { toast.error('Sessão expirada'); return; }
    const toProcess = items.filter(i => i.selected && !i.separado);
    if (toProcess.length === 0) { toast.error('Nenhum item selecionado'); return; }

    const alertas: string[] = [];
    toProcess.forEach(item => {
      if (item.estoque_atual < item.quantidade_necessaria) {
        alertas.push(`${item.nome}: estoque ${item.estoque_atual}, necessário ${item.quantidade_necessaria}`);
      }
    });

    if (alertas.length > 0) {
      const proceed = window.confirm(`⚠️ Estoque insuficiente:\n\n${alertas.join('\n')}\n\nDeseja continuar mesmo assim?`);
      if (!proceed) return;
    }

    setSaving(true);
    const clientName = projeto.nome_completo || projeto.razao_social || 'Obra';

    try {
      for (const item of toProcess) {
        // Mark as separated
        await supabase.from('lista_materiais_obra').update({
          separado: true,
          quantidade_separada: item.quantidade_necessaria,
        }).eq('id', item.id);

        // Register stock exit linked to obra
        await supabase.from('movimentacoes_estoque').insert({
          material_id: item.material_id, tipo: 'saida',
          quantidade: item.quantidade_necessaria,
          obra_id: projeto.id,
          observacao: `Retirada para obra: ${clientName}`,
          usuario_id: userId,
        });

        // Update stock
        const { data: est } = await supabase.from('estoque').select('quantidade_atual').eq('material_id', item.material_id).maybeSingle();
        if (est) {
          await supabase.from('estoque').update({
            quantidade_atual: Math.max(0, (est as any).quantidade_atual - item.quantidade_necessaria),
            atualizado_em: new Date().toISOString(),
          }).eq('material_id', item.material_id);
        }
      }
      toast.success(`${toProcess.length} itens retirados para ${clientName}!`);
      onDone();
      onClose();
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    }
    setSaving(false);
  };

  const separados = items.filter(i => i.separado).length;
  const total = items.length;
  const naoSeparados = items.filter(i => !i.separado);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-primary">📦 Retirar Material</h2>
            <p className="text-sm text-muted-foreground">{projeto.nome_completo || projeto.razao_social}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        {total > 0 && (
          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(separados / total) * 100}%` }} />
            </div>
            <span className="text-sm font-medium">{separados}/{total} já separados</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : items.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">Nenhuma lista de materiais gerada para esta obra.</p>
        ) : naoSeparados.length === 0 ? (
          <div className="text-center py-8">
            <Check className="w-12 h-12 mx-auto mb-3 text-primary" />
            <p className="text-lg font-medium">Todos os materiais já foram separados!</p>
          </div>
        ) : (
          <>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground bg-muted/50">
                    <th className="py-2 px-3 w-10">✓</th>
                    <th className="py-2 px-3">Material</th>
                    <th className="py-2 px-3 text-center">Necessário</th>
                    <th className="py-2 px-3 text-center">Em Estoque</th>
                    <th className="py-2 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.filter(i => !i.separado).map((item, idx) => {
                    const realIdx = items.findIndex(i => i.id === item.id);
                    const insuficiente = item.estoque_atual < item.quantidade_necessaria;
                    return (
                      <tr key={item.id} className={`border-b border-border/50 ${insuficiente ? 'bg-destructive/5' : ''}`}>
                        <td className="py-2 px-3">
                          <button onClick={() => toggleItem(realIdx)}
                            className={`w-6 h-6 rounded flex items-center justify-center border-2 transition-colors ${
                              item.selected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground'
                            }`}>
                            {item.selected && <Check className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="py-2 px-3">
                          <span className="mr-1">{CATEGORIA_ICONS[item.categoria] || '📦'}</span>
                          {item.nome}
                        </td>
                        <td className="py-2 px-3 text-center font-medium">{item.quantidade_necessaria}</td>
                        <td className={`py-2 px-3 text-center font-medium ${insuficiente ? 'text-destructive' : ''}`}>
                          {item.estoque_atual}
                          {insuficiente && <AlertTriangle className="w-3 h-3 inline ml-1 text-destructive" />}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {insuficiente ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">Insuficiente</span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">OK</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Already separated items */}
            {separados > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  {separados} itens já separados
                </summary>
                <div className="mt-2 space-y-1">
                  {items.filter(i => i.separado).map(item => (
                    <div key={item.id} className="flex items-center gap-2 px-3 py-1 text-muted-foreground">
                      <Check className="w-3 h-3 text-primary" />
                      <span className="line-through">{item.nome}</span>
                      <span className="text-xs">({item.quantidade_necessaria})</span>
                    </div>
                  ))}
                </div>
              </details>
            )}

            <div className="flex gap-2 justify-end">
              <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm bg-muted text-muted-foreground">Cancelar</button>
              <button onClick={handleConfirm} disabled={saving || naoSeparados.filter(i => i.selected).length === 0}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-50">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Processando...</> : `Confirmar Retirada (${items.filter(i => i.selected && !i.separado).length} itens)`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
