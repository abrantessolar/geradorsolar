import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Search, Scissors, Wrench, Building2, Scale } from 'lucide-react';

type EstoqueItem = {
  material_id: string;
  material_nome: string;
  quantidade_atual: number;
};

const MOTIVOS = [
  {
    value: 'uso_interno',
    icon: Wrench,
    titulo: 'Uso interno',
    desc: 'Material utilizado internamente pela empresa (escritório, veículos, ferramentas, etc.)',
  },
  {
    value: 'obra_nao_identificada',
    icon: Building2,
    titulo: 'Uso em obra não identificada',
    desc: 'Material usado em obra mas sem vínculo registrado no sistema',
  },
  {
    value: 'ajuste_estoque',
    icon: Scale,
    titulo: 'Ajuste de estoque',
    desc: 'Correção de divergência entre estoque físico e sistema (quebra, perda, inventário, etc.)',
  },
] as const;

export default function SaidaManualModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { session } = useAuth();
  const [motivo, setMotivo] = useState<string>('');
  const [observacao, setObservacao] = useState('');
  const [busca, setBusca] = useState('');
  const [items, setItems] = useState<EstoqueItem[]>([]);
  const [qtds, setQtds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('estoque' as any)
        .select('material_id, quantidade_atual, materiais(nome)')
        .gt('quantidade_atual', 0)
        .order('quantidade_atual', { ascending: false });
      setItems((data || []).map((e: any) => ({
        material_id: e.material_id,
        material_nome: e.materiais?.nome || '—',
        quantidade_atual: e.quantidade_atual,
      })));
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(
    () => items.filter(i => i.material_nome.toLowerCase().includes(busca.toLowerCase())),
    [items, busca]
  );

  const selecionados = useMemo(() => {
    return Object.entries(qtds)
      .map(([material_id, val]) => ({ material_id, qtd: parseInt(val) || 0 }))
      .filter(s => s.qtd > 0);
  }, [qtds]);

  const temExcesso = selecionados.some(s => {
    const item = items.find(i => i.material_id === s.material_id);
    return item && s.qtd > item.quantidade_atual;
  });

  const handleConfirmar = async () => {
    if (!motivo) { toast.error('Selecione o motivo da saída'); return; }
    if (selecionados.length === 0) { toast.error('Informe a quantidade de pelo menos um material'); return; }
    if (temExcesso) { toast.error('Há quantidades maiores que o estoque disponível'); return; }
    if (!session?.user?.id) return;

    setSaving(true);
    try {
      const movs = selecionados.map(s => ({
        material_id: s.material_id,
        tipo: 'saida_manual',
        tipo_saida: motivo,
        quantidade: s.qtd,
        observacao: observacao.trim() || null,
        usuario_id: session.user.id,
      }));
      const { error: movErr } = await supabase.from('movimentacoes_estoque' as any).insert(movs);
      if (movErr) throw movErr;

      for (const s of selecionados) {
        const item = items.find(i => i.material_id === s.material_id)!;
        await supabase
          .from('estoque' as any)
          .update({ quantidade_atual: item.quantidade_atual - s.qtd, atualizado_em: new Date().toISOString() })
          .eq('material_id', s.material_id);
      }

      toast.success('✅ Saída registrada com sucesso!');
      onDone();
      onClose();
    } catch (e) {
      console.error(e);
      toast.error('Erro ao registrar saída');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-bold flex items-center gap-2"><Scissors className="w-5 h-5" /> Saída Manual</h3>
          <p className="text-sm text-muted-foreground">Saída de material sem vínculo com obra</p>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Motivo */}
          <div>
            <label className="block text-sm font-medium mb-2">Motivo da saída <span className="text-destructive">*</span></label>
            <div className="grid gap-2 sm:grid-cols-3">
              {MOTIVOS.map(m => {
                const active = motivo === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMotivo(m.value)}
                    className={`text-left p-3 rounded-lg border transition-all ${active ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border hover:border-primary/40'}`}
                  >
                    <m.icon className={`w-5 h-5 mb-1 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="text-sm font-semibold">{m.titulo}</div>
                    <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">{m.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Observação */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Observação (opcional)</label>
            <textarea
              className="solar-input w-full min-h-[60px]"
              placeholder='Ex: "Cabo usado no veículo da empresa" ou "Inventário revelou diferença de 3 un"'
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              maxLength={500}
            />
          </div>

          {/* Materiais */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Materiais</label>
            <div className="relative mb-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input className="solar-input w-full pl-9" placeholder="Filtrar material..." value={busca} onChange={e => setBusca(e.target.value)} />
            </div>

            {loading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum material em estoque.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto border border-border rounded-lg divide-y divide-border/50">
                {filtered.map(item => {
                  const val = qtds[item.material_id] || '';
                  const qtd = parseInt(val) || 0;
                  const excesso = qtd > item.quantidade_atual;
                  return (
                    <div key={item.material_id} className="flex items-center gap-3 p-2.5">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{item.material_nome}</div>
                        <div className="text-[11px] text-muted-foreground">Estoque: {item.quantidade_atual}</div>
                        {excesso && (
                          <div className="text-[11px] text-destructive">
                            Quantidade maior que o estoque disponível ({item.quantidade_atual} em estoque)
                          </div>
                        )}
                      </div>
                      <input
                        type="number"
                        min="0"
                        max={item.quantidade_atual}
                        placeholder="Qtd"
                        value={val}
                        onChange={e => setQtds(p => ({ ...p, [item.material_id]: e.target.value }))}
                        className={`w-20 px-2 py-1.5 rounded-lg border text-sm text-center bg-card focus:outline-none focus:ring-2 ${excesso ? 'border-destructive ring-destructive/30 text-destructive' : 'border-input focus:ring-primary/30'}`}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-border flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">{selecionados.length} {selecionados.length === 1 ? 'item selecionado' : 'itens selecionados'}</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm bg-muted text-muted-foreground">Cancelar</button>
            <button
              onClick={handleConfirmar}
              disabled={saving || selecionados.length === 0 || temExcesso || !motivo}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Confirmar saída'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
