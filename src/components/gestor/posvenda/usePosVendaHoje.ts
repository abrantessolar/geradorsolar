import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/** Conta tarefas de pós-venda pendentes para hoje (ou atrasadas). */
export function usePosVendaHojeCount(): number {
  const [count, setCount] = useState(0);
  const { permissions } = useAuth();
  const podeVer = permissions.posvenda;

  useEffect(() => {
    if (!podeVer) { setCount(0); return; }
    let active = true;
    const fetchCount = async () => {
      const hoje = new Date().toISOString().slice(0, 10);
      const { count: c } = await supabase
        .from('tarefas_posvenda' as any)
        .select('id', { count: 'exact', head: true })
        .eq('concluido', false)
        .eq('aguardando_leitura', false)
        .lte('data_programada', hoje);
      if (active) setCount(c || 0);
    };
    fetchCount();
    const interval = setInterval(fetchCount, 5 * 60 * 1000);
    return () => { active = false; clearInterval(interval); };
  }, [podeVer]);

  return count;
}
