import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Cake, Phone } from 'lucide-react';
import { fmtDateBR, getBirthdayParts, daysUntilBirthday, calcAge } from '@/lib/dateUtils';
import WhatsAppLink from './WhatsAppLink';

type Pessoa = {
  id: string;
  nome: string;
  data_nascimento: string;
  telefone?: string | null;
  origem: 'cliente' | 'obra';
};

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export default function AniversariantesTab() {
  const [loading, setLoading] = useState(true);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [mes, setMes] = useState<number>(new Date().getMonth() + 1);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: clientes }, { data: projetos }] = await Promise.all([
        supabase.from('clientes_base' as any)
          .select('id, nome_completo, data_nascimento, telefone')
          .not('data_nascimento', 'is', null),
        supabase.from('projetos' as any)
          .select('id, nome_completo, data_nascimento, telefone')
          .not('data_nascimento', 'is', null),
      ]);

      const all: Pessoa[] = [];
      const seen = new Set<string>();

      const push = (rows: any[] | null, origem: 'cliente' | 'obra') => {
        (rows || []).forEach((r: any) => {
          if (!r.data_nascimento || !r.nome_completo) return;
          const parts = getBirthdayParts(r.data_nascimento);
          if (!parts) return;
          const key = `${r.nome_completo.trim().toLowerCase()}-${parts.day}-${parts.month}`;
          if (seen.has(key)) return;
          seen.add(key);
          all.push({
            id: r.id,
            nome: r.nome_completo,
            data_nascimento: r.data_nascimento,
            telefone: r.telefone,
            origem,
          });
        });
      };

      push(clientes as any[], 'cliente');
      push(projetos as any[], 'obra');

      setPessoas(all);
      setLoading(false);
    })();
  }, []);

  const aniversariantesDoMes = useMemo(() => {
    return pessoas
      .filter(p => {
        const parts = getBirthdayParts(p.data_nascimento);
        return parts && parts.month === mes;
      })
      .sort((a, b) => {
        const pa = getBirthdayParts(a.data_nascimento)!;
        const pb = getBirthdayParts(b.data_nascimento)!;
        return pa.day - pb.day;
      });
  }, [pessoas, mes]);

  const hoje = new Date();
  const todayDay = hoje.getDate();
  const todayMonth = hoje.getMonth() + 1;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-primary flex items-center gap-2">
          <Cake className="w-5 h-5" /> Aniversariantes
        </h2>
        <select
          className="solar-input text-sm py-1.5 px-2 w-auto"
          value={mes}
          onChange={e => setMes(Number(e.target.value))}
        >
          {MESES.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
      </div>

      <div className="solar-card p-4">
        <p className="text-sm text-muted-foreground mb-3">
          {aniversariantesDoMes.length} aniversariante(s) em {MESES[mes - 1]}
        </p>

        {aniversariantesDoMes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nenhum aniversariante neste mês.
          </p>
        ) : (
          <div className="space-y-2">
            {aniversariantesDoMes.map(p => {
              const parts = getBirthdayParts(p.data_nascimento)!;
              const isToday = parts.day === todayDay && parts.month === todayMonth;
              const days = daysUntilBirthday(p.data_nascimento);
              const idade = calcAge(p.data_nascimento);
              const completaIdade = idade !== null ? idade + (days === 0 ? 0 : 1) : null;
              return (
                <div
                  key={`${p.origem}-${p.id}`}
                  className={`flex items-center justify-between gap-2 p-3 rounded-lg border ${
                    isToday
                      ? 'bg-accent/20 border-accent'
                      : 'bg-muted/30 border-border'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      isToday ? 'bg-accent text-accent-foreground' : 'bg-primary/10 text-primary'
                    }`}>
                      <Cake className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{p.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtDateBR(p.data_nascimento)}
                        {completaIdade !== null && ` • completa ${completaIdade} anos`}
                        {isToday && ' • 🎉 Hoje!'}
                        {!isToday && days > 0 && days <= 30 && ` • em ${days} dia(s)`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.telefone && <WhatsAppLink phone={p.telefone} />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
