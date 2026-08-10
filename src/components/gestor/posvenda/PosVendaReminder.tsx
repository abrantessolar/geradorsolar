import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, X } from 'lucide-react';

const SESSION_KEY = 'posvenda_popup_shown';

/** Pop-up exibido uma vez por sessão se houver tarefas de pós-venda para hoje. */
export default function PosVendaReminder() {
  const { permissions } = useAuth();
  const navigate = useNavigate();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);

  // Somente o responsável pelo pós-venda recebe o aviso.
  const podeVer = permissions.posvenda;

  useEffect(() => {
    if (!podeVer) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    (async () => {
      const hoje = new Date().toISOString().slice(0, 10);
      const { count: c } = await supabase
        .from('tarefas_posvenda' as any)
        .select('id', { count: 'exact', head: true })
        .eq('concluido', false)
        .lte('data_programada', hoje);
      if (c && c > 0) { setCount(c); setOpen(true); }
      sessionStorage.setItem(SESSION_KEY, '1');
    })();
  }, [podeVer]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
      <div className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-xl space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center"><Bell className="w-5 h-5" /></span>
            <h3 className="text-lg font-bold text-primary">Pós-venda</h3>
          </div>
          <button onClick={() => setOpen(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <p className="text-sm text-foreground">
          📋 Você tem <strong>{count}</strong> tarefa{count === 1 ? '' : 's'} de pós-venda para hoje!
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => { setOpen(false); navigate('/clientes', { state: { tab: 'posvenda' } }); }}
            className="flex-1 solar-btn-primary text-sm py-2"
          >
            Ver tarefas
          </button>
          <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg text-sm bg-muted text-muted-foreground hover:bg-muted/70">
            Depois
          </button>
        </div>
      </div>
    </div>
  );
}
