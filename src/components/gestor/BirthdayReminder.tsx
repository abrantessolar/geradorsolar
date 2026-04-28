import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Cake } from 'lucide-react';
import { daysUntilBirthday, getBirthdayParts } from '@/lib/dateUtils';

type Aniversariante = {
  nome: string;
  data_nascimento: string;
  telefone?: string | null;
  daysUntil: number;
};

/**
 * Loads clients and projects, finds birthdays for today and the next 7 days,
 * and shows a single toast on first mount of each browser session.
 */
export default function BirthdayReminder() {
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;
    if (sessionStorage.getItem('birthday_reminder_shown') === '1') return;
    shown.current = true;

    (async () => {
      try {
        const [{ data: clientes }, { data: projetos }] = await Promise.all([
          supabase
            .from('clientes_base' as any)
            .select('nome_completo, data_nascimento, telefone')
            .not('data_nascimento', 'is', null),
          supabase
            .from('projetos' as any)
            .select('nome_completo, data_nascimento, telefone')
            .not('data_nascimento', 'is', null),
        ]);

        const all: Aniversariante[] = [];
        const seen = new Set<string>();

        const push = (rows: any[] | null) => {
          (rows || []).forEach((r: any) => {
            if (!r.data_nascimento || !r.nome_completo) return;
            const parts = getBirthdayParts(r.data_nascimento);
            if (!parts) return;
            const key = `${r.nome_completo.trim().toLowerCase()}-${parts.day}-${parts.month}`;
            if (seen.has(key)) return;
            seen.add(key);
            const days = daysUntilBirthday(r.data_nascimento);
            if (days >= 0 && days <= 7) {
              all.push({
                nome: r.nome_completo,
                data_nascimento: r.data_nascimento,
                telefone: r.telefone,
                daysUntil: days,
              });
            }
          });
        };

        push(clientes as any[]);
        push(projetos as any[]);

        if (all.length === 0) return;

        all.sort((a, b) => a.daysUntil - b.daysUntil);

        sessionStorage.setItem('birthday_reminder_shown', '1');

        const hoje = all.filter(a => a.daysUntil === 0);
        const proximos = all.filter(a => a.daysUntil > 0);

        const lines: string[] = [];
        if (hoje.length > 0) {
          lines.push(`🎂 Hoje: ${hoje.map(a => a.nome).join(', ')}`);
        }
        if (proximos.length > 0) {
          lines.push(
            `Próximos 7 dias: ${proximos
              .map(a => `${a.nome} (em ${a.daysUntil}d)`)
              .join(', ')}`
          );
        }

        toast(
          hoje.length > 0
            ? `🎉 ${hoje.length} aniversariante(s) hoje!`
            : `🎂 ${proximos.length} aniversariante(s) próximos`,
          {
            description: lines.join('\n'),
            duration: 12000,
            icon: <Cake className="w-5 h-5" />,
          }
        );
      } catch (err) {
        console.error('BirthdayReminder error:', err);
      }
    })();
  }, []);

  return null;
}
