import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle } from 'lucide-react';

type Instalador = { id: string; nome: string };

export default function ObraConcluidaModal({ projetoId, currentInstalador, onClose, onDone }: {
  projetoId: string;
  currentInstalador?: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [dataInstalacao, setDataInstalacao] = useState(new Date().toISOString().split('T')[0]);
  const [instalador, setInstalador] = useState(currentInstalador || '');
  const [observacoes, setObservacoes] = useState('');
  const [instaladores, setInstaladores] = useState<Instalador[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('instaladores' as any).select('id, nome').eq('ativo', true).order('nome').then(({ data }) => {
      setInstaladores((data || []) as any);
    });
  }, []);

  const handleConfirmar = async () => {
    setSaving(true);
    const update: any = {
      status: 'Instalado',
      data_instalacao: dataInstalacao,
      instalador: instalador || null,
    };
    if (observacoes.trim()) update.objecoes = observacoes.trim();

    const { error } = await supabase.from('projetos' as any).update(update).eq('id', projetoId);
    if (error) { toast.error('Erro: ' + error.message); setSaving(false); return; }

    // Sync to Sheets
    supabase.functions.invoke('sync-to-sheets', { body: { project_id: projetoId, sync_all: false } }).catch(() => {});

    setSaving(false);
    toast.success('Obra concluída! Cliente movido para a base.');
    onDone();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background rounded-xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <h2 className="text-lg font-bold">Obra Concluída</h2>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Data de Instalação</label>
          <input type="date" className="solar-input" value={dataInstalacao} onChange={e => setDataInstalacao(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Instalador Responsável</label>
          <select className="solar-input" value={instalador} onChange={e => setInstalador(e.target.value)}>
            <option value="">Selecione...</option>
            {instaladores.map(i => <option key={i.id} value={i.nome}>{i.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Observações finais (opcional)</label>
          <textarea className="solar-input" rows={2} value={observacoes} onChange={e => setObservacoes(e.target.value)} />
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground">Cancelar</button>
          <button onClick={handleConfirmar} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
            {saving ? 'Concluindo...' : '✅ Confirmar conclusão'}
          </button>
        </div>
      </div>
    </div>
  );
}
