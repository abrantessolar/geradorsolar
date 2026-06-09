import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getConfigDB } from '@/data/supabaseStore';
import { Loader2, Search, CalendarClock } from 'lucide-react';
import {
  type TarefaPosVenda, type TarefaTipo, TIPO_LABEL,
} from '@/lib/posvendaTarefas';
import TarefaPosVendaItem from './TarefaPosVendaItem';

interface TarefaComProjeto extends TarefaPosVenda {
  _nome: string;
  _telefone: string | null;
  _marca_inversor: string | null;
  _nome_planta: string | null;
}

function montarRotulo(t: TarefaComProjeto): string {
  return [t._nome, t._marca_inversor, t._nome_planta].filter(Boolean).join(' — ');
}

type FiltroData = 'pendentes' | 'hoje' | 'atrasadas' | 'futuras' | 'concluidas' | 'todas';

export async function loadTemplatesMap(): Promise<Record<string, string>> {
  const { data } = await supabase.from('whatsapp_templates' as any).select('tipo, texto');
  const map: Record<string, string> = {};
  for (const t of (data || []) as any[]) map[t.tipo] = t.texto;
  return map;
}

export default function PosVendaAgenda() {
  const [tarefas, setTarefas] = useState<TarefaComProjeto[]>([]);
  const [templates, setTemplates] = useState<Record<string, string>>({});
  const [googleLink, setGoogleLink] = useState('');
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroData, setFiltroData] = useState<FiltroData>('pendentes');
  const [filtroTipo, setFiltroTipo] = useState<TarefaTipo | 'todos'>('todos');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('tarefas_posvenda' as any)
      .select('*, projetos!tarefas_posvenda_projeto_id_fkey(nome_completo, razao_social, telefone, marca_inversor, nome_planta)')
      .order('data_programada', { ascending: true });

    const list: TarefaComProjeto[] = (data || []).map((t: any) => ({
      ...t,
      _nome: t.projetos?.nome_completo || t.projetos?.razao_social || 'Cliente',
      _telefone: t.projetos?.telefone || null,
      _marca_inversor: t.projetos?.marca_inversor || null,
      _nome_planta: t.projetos?.nome_planta || null,
    }));
    setTarefas(list);

    setTemplates(await loadTemplatesMap());
    const g = await getConfigDB('rastreamento_google_link');
    if (g) setGoogleLink(String(g));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtradas = useMemo(() => {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const termo = busca.trim().toLowerCase();
    return tarefas.filter(t => {
      if (termo && !t._nome.toLowerCase().includes(termo)) return false;
      if (filtroTipo !== 'todos' && t.tipo !== filtroTipo) return false;
      const dt = new Date(t.data_programada + 'T00:00:00');
      const diff = Math.round((dt.getTime() - hoje.getTime()) / 86400000);
      switch (filtroData) {
        case 'pendentes': return !t.concluido;
        case 'hoje': return !t.concluido && diff === 0;
        case 'atrasadas': return !t.concluido && diff < 0;
        case 'futuras': return !t.concluido && diff > 0;
        case 'concluidas': return t.concluido;
        case 'todas': default: return true;
      }
    });
  }, [tarefas, busca, filtroData, filtroTipo]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const filtrosData: { key: FiltroData; label: string }[] = [
    { key: 'pendentes', label: 'Pendentes' },
    { key: 'hoje', label: 'Hoje' },
    { key: 'atrasadas', label: 'Atrasadas' },
    { key: 'futuras', label: 'Futuras' },
    { key: 'concluidas', label: 'Concluídas' },
    { key: 'todas', label: 'Todas' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-primary">
        <CalendarClock className="w-5 h-5" />
        <h2 className="text-base font-bold">Agenda de Pós-venda</h2>
        <span className="text-xs text-muted-foreground">({filtradas.length})</span>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por cliente" className="solar-input pl-9 w-full" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filtrosData.map(f => (
            <button key={f.key} onClick={() => setFiltroData(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filtroData === f.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
              {f.label}
            </button>
          ))}
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value as any)} className="solar-input py-1.5 text-xs ml-auto">
            <option value="todos">Todos os tipos</option>
            {(Object.keys(TIPO_LABEL) as TarefaTipo[]).map(t => (
              <option key={t} value={t}>{TIPO_LABEL[t]}</option>
            ))}
          </select>
        </div>
      </div>

      {filtradas.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">Nenhuma tarefa encontrada.</p>}

      <div className="space-y-2">
        {filtradas.map(t => (
          <div key={t.id}>
            <div className="text-xs font-medium text-muted-foreground mb-1">{t._nome}</div>
            <TarefaPosVendaItem
              tarefa={t}
              nome={t._nome}
              telefone={t._telefone}
              templateText={templates[t.template_key || ''] || ''}
              googleLink={googleLink}
              onChanged={load}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
