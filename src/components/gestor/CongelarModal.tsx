import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Snowflake } from 'lucide-react';

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r.toISOString().split('T')[0];
}

export default function CongelarModal({ projetoId, onClose, onDone }: {
  projetoId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [data, setData] = useState(addDays(new Date(), 7));
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCongelar = async () => {
    setSaving(true);
    const { error } = await supabase.from('projetos' as any).update({
      congelado: true,
      congelado_ate: data,
      motivo_congelamento: motivo || null,
    }).eq('id', projetoId);
    setSaving(false);
    if (error) { toast.error('Erro: ' + error.message); return; }
    toast.success('Obra congelada!');
    onDone();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background rounded-xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <Snowflake className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-bold">Congelar Obra</h2>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Descongelar em</label>
          <input type="date" className="solar-input" value={data} onChange={e => setData(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Motivo (opcional)</label>
          <textarea className="solar-input" rows={2} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex: Cliente viajou, aguardando material..." />
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground">Cancelar</button>
          <button onClick={handleCongelar} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50">
            {saving ? 'Congelando...' : '❄️ Congelar'}
          </button>
        </div>
      </div>
    </div>
  );
}
