import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

interface DeleteConfirmModalProps {
  nome: string;
  id: string;
  tabela: 'projetos' | 'clientes_base';
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeleteConfirmModal({ nome, id, tabela, onClose, onDeleted }: DeleteConfirmModalProps) {
  const [step, setStep] = useState(1);
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    setDeleting(true);
    try {
      const { error } = await supabase.from(tabela as any).delete().eq('id', id);
      if (error) throw error;

      // Try to remove from Google Sheets
      try {
        await supabase.functions.invoke('sync-to-sheets', {
          body: { delete_id: id, sheet: tabela === 'projetos' ? 'Obras' : 'Clientes' },
        });
      } catch {
        // Non-blocking
      }

      toast.success(`${nome} excluído com sucesso`);
      onDeleted();
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + (err.message || err));
    } finally {
      setDeleting(false);
    }
  };

  const steps = [
    {
      text: `Tem certeza que deseja excluir ${nome}?`,
      confirm: 'Sim, tenho certeza',
    },
    {
      text: '⚠️ Atenção! Esta ação não pode ser desfeita. O registro será removido permanentemente do sistema e do Google Sheets.',
      confirm: 'Sim, pode ser que dê bosta',
    },
    {
      text: `🗑️ Última chance. Confirma a exclusão de ${nome}?`,
      confirm: 'Sim, excluir definitivamente',
    },
  ];

  const current = steps[step - 1];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background rounded-xl shadow-xl max-w-md w-full p-6 space-y-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-destructive/10">
            <Trash2 className="w-5 h-5 text-destructive" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Excluir registro ({step}/3)</h2>
        </div>

        <p className="text-sm text-foreground">{current.text}</p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/70 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleting}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
          >
            {deleting ? 'Excluindo...' : current.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
