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
  _email: string | null;
  _marca_inversor: string | null;
  _nome_planta: string | null;
  _avaliacao: { nota: number; comentario: string | null } | null;
  _instalado_em: string | null;
  _dia_leitura: number | null;
}

function montarRotulo(t: TarefaComProjeto): string {
  return [t._nome, t._marca_inversor, t._nome_planta].filter(Boolean).join(' — ');
}

function estrelas(n: number): string {
  const v = Math.max(0, Math.min(5, Math.round(n)));
  return '★'.repeat(v) + '☆'.repeat(5 - v);
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
      .select('*, projetos!tarefas_posvenda_projeto_id_fkey(nome_completo, razao_social, telefone, email, marca_inversor, nome_planta, data_instalacao, dia_leitura), clientes_base!tarefas_posvenda_cliente_base_id_fkey(nome_completo, telefone, email, marca_inversor, nome_planta, instalado_em, dia_leitura)')
      .order('data_programada', { ascending: true });

    // Avaliações por projeto
    const projIds = [...new Set(((data || []) as any[]).map((t: any) => t.projeto_id).filter(Boolean))];
    const avMap: Record<string, { nota: number; comentario: string | null }> = {};
    if (projIds.length) {
      const { data: avs } = await supabase
        .from('avaliacoes_clientes' as any)
        .select('projeto_id, nota, comentario, criado_em')
        .in('projeto_id', projIds)
        .order('criado_em', { ascending: false });
      for (const a of (avs || []) as any[]) {
        if (!avMap[a.projeto_id]) avMap[a.projeto_id] = { nota: a.nota, comentario: a.comentario };
      }
    }

    const list: TarefaComProjeto[] = (data || []).map((t: any) => {
      const p = t.projetos;
      const c = t.clientes_base;
      return {
        ...t,
        _nome: p?.nome_completo || p?.razao_social || c?.nome_completo || 'Cliente',
        _telefone: p?.telefone || c?.telefone || null,
        _email: p?.email || c?.email || null,
        _marca_inversor: p?.marca_inversor || c?.marca_inversor || null,
        _nome_planta: p?.nome_planta || c?.nome_planta || null,
        _avaliacao: t.projeto_id ? (avMap[t.projeto_id] || null) : null,
        _instalado_em: p?.data_instalacao || c?.instalado_em || null,
        _dia_leitura: p?.dia_leitura ?? c?.dia_leitura ?? null,
      };
    });
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
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1">
              <span className="text-xs font-medium text-muted-foreground">{montarRotulo(t)}</span>
              {t._email && <span className="text-[11px] text-muted-foreground">✉️ {t._email}</span>}
              {t._avaliacao && (
                <span className="inline-flex items-center gap-1 text-[11px] text-yellow-600" title={t._avaliacao.comentario || ''}>
                  <span className="text-yellow-500">{estrelas(t._avaliacao.nota)}</span> {t._avaliacao.nota}/5
                </span>
              )}
            </div>
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
