import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getConfigDB } from '@/data/supabaseStore';
import { toast } from 'sonner';
import { Loader2, Search, CalendarClock, CalendarDays, Save } from 'lucide-react';
import {
  type TarefaPosVenda, type TarefaTipo, TIPO_LABEL, sincronizarDiaLeitura,
} from '@/lib/posvendaTarefas';
import TarefaPosVendaItem from './TarefaPosVendaItem';
import PosVendaControles from './PosVendaControles';

interface TarefaComProjeto extends TarefaPosVenda {
  cliente_base_id: string | null;
  _nome: string;
  _telefone: string | null;
  _email: string | null;
  _marca_inversor: string | null;
  _nome_planta: string | null;
  _avaliacao: { nota: number; comentario: string | null } | null;
  _instalado_em: string | null;
  _dia_leitura: number | null;
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

function DiaLeituraEditor({ owner, valorAtual, instaladoEm, onChanged }: {
  owner: { projetoId?: string | null; clienteBaseId?: string | null };
  valorAtual: number | null;
  instaladoEm: string | null;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState<string>(valorAtual != null ? String(valorAtual) : '');
  const [busy, setBusy] = useState(false);

  const salvar = async () => {
    const n = valor ? parseInt(valor) : null;
    if (n != null && (isNaN(n) || n < 1 || n > 28)) { toast.error('Dia entre 1 e 28.'); return; }
    setBusy(true);
    try {
      const table = owner.projetoId ? 'projetos' : 'clientes_base';
      const id = owner.projetoId || owner.clienteBaseId!;
      const { error } = await supabase.from(table as any).update({ dia_leitura: n }).eq('id', id);
      if (error) throw error;
      if (n != null && instaladoEm) {
        const recalc = await sincronizarDiaLeitura({
          projetoId: owner.projetoId || null,
          clienteBaseId: owner.clienteBaseId || null,
          dataInstalacao: new Date(instaladoEm + 'T00:00:00'),
          diaLeitura: n,
        });
        toast.success(recalc > 0 ? `Dia salvo. ${recalc} lembrete(s) recalculado(s).` : 'Dia salvo.');
      } else {
        toast.success('Dia de leitura salvo.');
      }
      setOpen(false);
      onChanged();
    } catch (e: any) {
      toast.error('Erro: ' + (e?.message || e));
    } finally { setBusy(false); }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted text-foreground hover:bg-muted/70">
        <CalendarDays className="w-3.5 h-3.5" />
        {valorAtual != null ? `Leitura dia ${valorAtual}` : '⚠️ Definir dia de leitura'}
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-1">
      <input
        type="number" min={1} max={28} value={valor} onChange={e => setValor(e.target.value)}
        placeholder="1-28" className="solar-input py-1 text-xs w-20"
      />
      <button onClick={salvar} disabled={busy} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-primary text-primary-foreground disabled:opacity-50">
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
      </button>
      <button onClick={() => { setOpen(false); setValor(valorAtual != null ? String(valorAtual) : ''); }} className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">Cancelar</button>
    </div>
  );
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

  // Agrupa por dono (projeto_id ou cliente_base_id).
  const grupos = useMemo(() => {
    const map = new Map<string, { header: TarefaComProjeto; itens: TarefaComProjeto[] }>();
    for (const t of filtradas) {
      const key = t.projeto_id ? `p:${t.projeto_id}` : t.cliente_base_id ? `c:${t.cliente_base_id}` : `?:${t.id}`;
      const g = map.get(key);
      if (g) g.itens.push(t);
      else map.set(key, { header: t, itens: [t] });
    }
    // Ordena grupos pela data mais antiga de tarefa pendente (atrasadas primeiro,
    // depois hoje, depois futuras). Tarefas aguardando dia de leitura vão ao fim.
    const arr = Array.from(map.entries()).map(([key, v]) => {
      const datas = v.itens
        .filter(t => !t.concluido && !(t as any).aguardando_leitura)
        .map(t => t.data_programada)
        .sort();
      const temAguardando = v.itens.some(t => !t.concluido && (t as any).aguardando_leitura);
      const sortKey = datas[0] ?? (temAguardando ? '9999-12-31' : '9999-12-30');
      return { key, ...v, sortKey };
    });
    arr.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    return arr;
  }, [filtradas]);

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

      {grupos.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">Nenhuma tarefa encontrada.</p>}

      <div className="space-y-4">
        {grupos.map(g => {
          const owner = g.header.projeto_id
            ? { projetoId: g.header.projeto_id }
            : { clienteBaseId: g.header.cliente_base_id! };
          return (
            <div key={g.key} className="rounded-xl border border-border bg-card/40 p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pb-2 border-b border-border/50">
                <span className="text-sm font-semibold text-foreground">{g.header._nome}</span>
                {g.header._marca_inversor && <span className="text-[11px] text-muted-foreground">{g.header._marca_inversor}</span>}
                {g.header._nome_planta && <span className="text-[11px] text-muted-foreground">• {g.header._nome_planta}</span>}
                {g.header._email && <span className="text-[11px] text-muted-foreground">✉️ {g.header._email}</span>}
                {g.header._avaliacao && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-yellow-600" title={g.header._avaliacao.comentario || ''}>
                    <span className="text-yellow-500">{estrelas(g.header._avaliacao.nota)}</span> {g.header._avaliacao.nota}/5
                  </span>
                )}
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <DiaLeituraEditor
                    owner={owner}
                    valorAtual={g.header._dia_leitura}
                    instaladoEm={g.header._instalado_em}
                    onChanged={load}
                  />
                  <PosVendaControles
                    owner={owner}
                    dataInstalacao={g.header._instalado_em}
                    diaLeitura={g.header._dia_leitura}
                    onChanged={load}
                    compact
                  />
                </div>
              </div>
              <div className="space-y-2">
                {g.itens.map(t => (
                  <TarefaPosVendaItem
                    key={t.id}
                    tarefa={t}
                    nome={t._nome}
                    telefone={t._telefone}
                    templateText={templates[t.template_key || ''] || ''}
                    googleLink={googleLink}
                    instaladoEm={t._instalado_em}
                    diaLeitura={t._dia_leitura}
                    onChanged={load}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
