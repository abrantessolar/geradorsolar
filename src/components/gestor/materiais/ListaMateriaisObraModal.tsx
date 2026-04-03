import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { X, Plus, Check, Loader2 } from 'lucide-react';
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
};

type CaboItem = {
  id: string;
  tipo_cabo: string;
  quantidade_metros: number;
  observacao: string | null;
};

export default function ListaMateriaisObraModal({ projeto, onClose }: { projeto: Projeto; onClose: () => void }) {
  const { session } = useAuth();
  const [materiais, setMateriais] = useState<MatItem[]>([]);
  const [cabos, setCabos] = useState<CaboItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newCabo, setNewCabo] = useState({ tipo_cabo: '', quantidade_metros: '' });

  const loadList = async () => {
    setLoading(true);
    const [{ data: mats }, { data: cbs }] = await Promise.all([
      supabase.from('lista_materiais_obra' as any).select('*, materiais(nome, categoria)').eq('projeto_id', projeto.id),
      supabase.from('cabos_obra' as any).select('*').eq('projeto_id', projeto.id),
    ]);

    setMateriais((mats || []).map((m: any) => ({
      id: m.id, material_id: m.material_id,
      nome: m.materiais?.nome || '—', categoria: m.materiais?.categoria || 'Outros',
      quantidade_necessaria: m.quantidade_necessaria,
      quantidade_separada: m.quantidade_separada,
      separado: m.separado,
    })));
    setCabos((cbs || []).map((c: any) => ({ id: c.id, tipo_cabo: c.tipo_cabo, quantidade_metros: c.quantidade_metros, observacao: c.observacao })));
    setLoading(false);
  };

  useEffect(() => { loadList(); }, [projeto.id]);

  const generateList = async () => {
    setGenerating(true);
    try {
      // Determine power key from inversor
      const potInv = parseFloat(projeto.potencia_inversor || '0');
      const isMicro = (projeto.inversor?.tipo || '').toUpperCase().includes('MICRO');
      let potKey = '';
      
      if (isMicro) {
        const qtdMicro = projeto.qtd_inversores || 1;
        potKey = `${qtdMicro} MICRO`;
      } else {
        // Find closest standard potencia
        const pots = [3, 4, 5, 6, 7.5, 8, 10];
        const closest = pots.reduce((prev, curr) => Math.abs(curr - potInv) < Math.abs(prev - potInv) ? curr : prev, pots[0]);
        potKey = closest.toString();
      }

      // Get standard quantities for this power
      const { data: qtdPadrao } = await supabase
        .from('materiais_quantidades_padrao' as any)
        .select('*, materiais(id, nome, categoria)')
        .eq('potencia', potKey);

      // Get standard cables
      const { data: cabosPadrao } = await supabase.from('cabos_padrao' as any).select('*').eq('potencia', potKey);

      // Clear existing
      await supabase.from('lista_materiais_obra' as any).delete().eq('projeto_id', projeto.id);
      await supabase.from('cabos_obra' as any).delete().eq('projeto_id', projeto.id);

      // Insert materials
      if (qtdPadrao && qtdPadrao.length > 0) {
        const rows = qtdPadrao.map((q: any) => ({
          projeto_id: projeto.id, material_id: q.material_id, quantidade_necessaria: q.quantidade, quantidade_separada: 0, separado: false,
        }));
        await supabase.from('lista_materiais_obra' as any).insert(rows);
      }

      // Insert cables
      if (cabosPadrao && cabosPadrao.length > 0) {
        const caboRows = cabosPadrao.map((c: any) => ({
          projeto_id: projeto.id, tipo_cabo: c.tipo_cabo, quantidade_metros: 0, observacao: c.observacao,
        }));
        await supabase.from('cabos_obra' as any).insert(caboRows);
      }

      toast.success(`Lista gerada para potência ${potKey}!`);
      loadList();
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    }
    setGenerating(false);
  };

  const toggleSeparado = async (item: MatItem) => {
    const newSeparado = !item.separado;
    const userId = session?.user?.id;
    
    // Update the item
    await supabase.from('lista_materiais_obra' as any).update({
      separado: newSeparado,
      quantidade_separada: newSeparado ? item.quantidade_necessaria : 0,
    }).eq('id', item.id);

    // Register stock movement
    if (userId) {
      if (newSeparado) {
        // Saída de estoque
        await supabase.from('movimentacoes_estoque' as any).insert({
          material_id: item.material_id, tipo: 'saida', quantidade: item.quantidade_necessaria,
          obra_id: projeto.id, observacao: `Separação para obra: ${projeto.nome_completo || projeto.razao_social}`,
          usuario_id: userId,
        });
        // Update stock
        const { data: est } = await supabase.from('estoque' as any).select('quantidade_atual').eq('material_id', item.material_id).maybeSingle();
        if (est) {
          await supabase.from('estoque' as any).update({ quantidade_atual: Math.max(0, (est as any).quantidade_atual - item.quantidade_necessaria) }).eq('material_id', item.material_id);
        }
      } else {
        // Retorno de estoque (estorno)
        await supabase.from('movimentacoes_estoque' as any).insert({
          material_id: item.material_id, tipo: 'retorno', quantidade: item.quantidade_necessaria,
          obra_id: projeto.id, observacao: `Estorno de separação: ${projeto.nome_completo || projeto.razao_social}`,
          usuario_id: userId,
        });
        const { data: est } = await supabase.from('estoque' as any).select('quantidade_atual').eq('material_id', item.material_id).maybeSingle();
        if (est) {
          await supabase.from('estoque' as any).update({ quantidade_atual: (est as any).quantidade_atual + item.quantidade_necessaria }).eq('material_id', item.material_id);
        }
      }
    }

    loadList();
  };

  const addCabo = async () => {
    if (!newCabo.tipo_cabo) return;
    await supabase.from('cabos_obra' as any).insert({
      projeto_id: projeto.id, tipo_cabo: newCabo.tipo_cabo,
      quantidade_metros: parseFloat(newCabo.quantidade_metros) || 0,
    });
    setNewCabo({ tipo_cabo: '', quantidade_metros: '' });
    loadList();
  };

  const separados = materiais.filter(m => m.separado).length;
  const total = materiais.length;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-primary">📋 Lista de Materiais</h2>
            <p className="text-sm text-muted-foreground">{projeto.nome_completo || projeto.razao_social}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        {total > 0 && (
          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${total > 0 ? (separados / total) * 100 : 0}%` }} />
            </div>
            <span className="text-sm font-medium">{separados}/{total} separados</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : materiais.length === 0 ? (
          <div className="text-center py-8 space-y-3">
            <p className="text-muted-foreground">Nenhuma lista gerada para esta obra.</p>
            <button onClick={generateList} disabled={generating}
              className="px-6 py-3 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-50">
              {generating ? <><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Gerando...</> : '⚡ Gerar Lista Automática'}
            </button>
          </div>
        ) : (
          <>
            <div className="solar-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 px-3 w-10">✓</th>
                    <th className="py-2 px-3">Material</th>
                    <th className="py-2 px-3 text-center">Qtd</th>
                  </tr>
                </thead>
                <tbody>
                  {materiais.map(m => (
                    <tr key={m.id} className={`border-b border-border/50 ${m.separado ? 'bg-primary/5' : ''}`}>
                      <td className="py-2 px-3">
                        <button onClick={() => toggleSeparado(m)}
                          className={`w-6 h-6 rounded flex items-center justify-center border-2 transition-colors ${
                            m.separado ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground'
                          }`}>
                          {m.separado && <Check className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className={`py-2 px-3 ${m.separado ? 'line-through text-muted-foreground' : ''}`}>
                        <span className="mr-2">{CATEGORIA_ICONS[m.categoria] || '📦'}</span>
                        {m.nome}
                      </td>
                      <td className="py-2 px-3 text-center font-medium">{m.quantidade_necessaria}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cabos */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">🔌 Cabos</h4>
              {cabos.map(c => (
                <div key={c.id} className="flex items-center gap-3 text-sm px-3 py-2 bg-muted/30 rounded-lg">
                  <span className="font-medium">{c.tipo_cabo}</span>
                  <span className="text-muted-foreground">{c.quantidade_metros}m</span>
                  {c.observacao && <span className="text-xs text-muted-foreground">({c.observacao})</span>}
                </div>
              ))}
              <div className="flex gap-2">
                <input className="solar-input flex-1" placeholder="Tipo de cabo" value={newCabo.tipo_cabo} onChange={e => setNewCabo(f => ({ ...f, tipo_cabo: e.target.value }))} />
                <input className="solar-input w-24" type="number" placeholder="Metros" value={newCabo.quantidade_metros} onChange={e => setNewCabo(f => ({ ...f, quantidade_metros: e.target.value }))} />
                <button onClick={addCabo} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground"><Plus className="w-4 h-4" /></button>
              </div>
            </div>

            <button onClick={generateList} disabled={generating}
              className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-accent text-accent-foreground">
              {generating ? 'Regenerando...' : '🔄 Regenerar Lista'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
