import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { X, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LeadNotif {
  id: string;
  nome: string;
  cidade: string;
  telefone: string;
  consumo_kwh: number;
  timestamp: number;
}

export function useNewLeadsCount() {
  const [count, setCount] = useState(0);
  const { session, isAdmin, isOrcamentista } = useAuth();

  useEffect(() => {
    if (!session || (!isAdmin && !isOrcamentista)) return;

    const loadCount = async () => {
      const { count: c } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'novo');
      setCount(c || 0);
    };

    loadCount();

    const channelName = `leads-count-${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        loadCount();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session, isAdmin, isOrcamentista]);

  return count;
}

export default function LeadNotification() {
  const [notifications, setNotifications] = useState<LeadNotif[]>([]);
  const { session, isAdmin, isOrcamentista } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!session || (!isAdmin && !isOrcamentista)) return;

    const channel = supabase
      .channel('leads-realtime-notif')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, (payload) => {
        const lead = payload.new as any;
        const notif: LeadNotif = {
          id: lead.id,
          nome: lead.nome,
          cidade: lead.cidade,
          telefone: lead.telefone,
          consumo_kwh: lead.consumo_kwh,
          timestamp: Date.now(),
        };
        setNotifications(prev => [...prev, notif]);

        // Auto-dismiss after 10 seconds
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== notif.id));
        }, 10000);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session, isAdmin, isOrcamentista]);

  const dismiss = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleView = (id: string) => {
    dismiss(id);
    navigate('/admin', { state: { tab: 'leads' } });
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map(n => (
        <div key={n.id} className="bg-card border border-border rounded-xl shadow-xl p-4 animate-fade-in-up">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-secondary">
              <span className="text-lg">🌞</span>
              <span className="font-bold text-sm">Novo lead recebido!</span>
            </div>
            <button onClick={() => dismiss(n.id)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2 space-y-1 text-sm">
            <p className="font-medium">{n.nome} — {n.cidade}</p>
            <p className="text-muted-foreground">📱 {n.telefone}</p>
            <p className="text-muted-foreground">⚡ {n.consumo_kwh} kWh/mês</p>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => handleView(n.id)} className="solar-btn-primary text-xs py-1.5 px-3">Ver lead</button>
            <button onClick={() => dismiss(n.id)} className="solar-btn-outline text-xs py-1.5 px-3">Ignorar</button>
          </div>
        </div>
      ))}
    </div>
  );
}
