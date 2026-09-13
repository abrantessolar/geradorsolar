import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getConfigDB } from '@/data/supabaseStore';
import { toast } from 'sonner';
import { Loader2, Search, CalendarClock, CalendarDays, Save, List, Users, ChevronDown, ChevronRight, PlayCircle } from 'lucide-react';
import {
  type TarefaPosVenda, type TarefaTipo, TIPO_LABEL, sincronizarDiaLeitura,
  ativarPosVendaProjeto, ativarPosVendaCliente,
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
  const [visao, setVisao] = useState<'lista' | 'cliente'>('lista');
  const [clienteAberto, setClienteAberto] = useState<string | null>(null);

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

  // Resumo por cliente (visão "Por cliente") — usa TODAS as tarefas (não só as filtradas
  // por data/tipo), respeitando apenas a busca por nome.
  const resumoClientes = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const base = termo ? tarefas.filter(t => t._nome.toLowerCase().includes(termo)) : tarefas;

    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const map = new Map<string, TarefaComProjeto[]>();
    for (const t of base) {
      const key = t.projeto_id ? `p:${t.projeto_id}` : t.cliente_base_id ? `c:${t.cliente_base_id}` : `?:${t.id}`;
      const arr = map.get(key) || [];
      arr.push(t);
      map.set(key, arr);
    }

    const linhas = Array.from(map.entries()).map(([key, itens]) => {
      const header = itens[0];
      const total = itens.length;
      const done = itens.filter(t => t.concluido).length;
      const pendentesOrdenadas = itens
        .filter(t => !t.concluido && !(t as any).aguardando_leitura)
        .sort((a, b) => a.data_programada.localeCompare(b.data_programada));
      const aguardandoLeitura = itens.some(t => !t.concluido && (t as any).aguardando_leitura);
      const proxima = pendentesOrdenadas[0] || null;
      const fase = proxima ? proxima.fase : Math.max(...itens.map(t => t.fase));

      let diffDias: number | null = null;
      if (proxima) {
        const dt = new Date(proxima.data_programada + 'T00:00:00');
        diffDias = Math.round((dt.getTime() - hoje.getTime()) / 86400000);
      }

      // Ordenação: atrasadas primeiro (mais negativas primeiro), depois hoje/futuras,
      // aguardando leitura no fim, tudo concluído por último.
      let sortKey: string;
      if (proxima) sortKey = `0_${proxima.data_programada}`;
      else if (aguardandoLeitura) sortKey = '1_aguardando';
      else sortKey = '2_concluido';

      return { key, header, total, done, fase, proxima, diffDias, aguardandoLeitura, itens, sortKey };
    });

    linhas.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    return linhas;
  }, [tarefas, busca]);

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
        <span className="text-xs text-muted-foreground">({visao === 'lista' ? filtradas.length : resumoClientes.length})</span>
        <div className="ml-auto flex items-center gap-1 bg-muted rounded-lg p-0.5">
          <button
            onClick={() => setVisao('lista')}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${visao === 'lista' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <List className="w-3.5 h-3.5" /> Lista de tarefas
          </button>
          <button
            onClick={() => setVisao('cliente')}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${visao === 'cliente' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Users className="w-3.5 h-3.5" /> Por cliente
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por cliente" className="solar-input pl-9 w-full" />
      </div>

      {visao === 'cliente' ? (
        <div className="space-y-2">
          {resumoClientes.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">Nenhum cliente encontrado.</p>}
          {resumoClientes.map(r => {
            const owner = r.header.projeto_id ? { projetoId: r.header.projeto_id } : { clienteBaseId: r.header.cliente_base_id! };
            const aberto = clienteAberto === r.key;
            const atrasada = r.diffDias != null && r.diffDias < 0;
            const hojeFlag = r.diffDias === 0;
            return (
              <div key={r.key} className="rounded-xl border border-border bg-card/40 overflow-hidden">
                <button
                  onClick={() => setClienteAberto(aberto ? null : r.key)}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/30"
                >
                  {aberto ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{r.header._nome}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      Fase {r.fase} · {r.done}/{r.total} concluídas
                      {r.proxima && <> · Próxima: {r.proxima.descricao}</>}
                      {!r.proxima && r.aguardandoLeitura && <> · Aguardando dia de leitura</>}
                      {!r.proxima && !r.aguardandoLeitura && <> · Tudo concluído</>}
                    </p>
                  </div>
                  {r.proxima && (
                    <span className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${
                      atrasada ? 'bg-destructive/10 text-destructive'
                      : hojeFlag ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                      : 'bg-green-600/10 text-green-700 dark:text-green-400'
                    }`}>
                      {atrasada ? `atrasada ${Math.abs(r.diffDias!)}d` : hojeFlag ? 'hoje' : `em ${r.diffDias}d`}
                    </span>
                  )}
                  {!r.proxima && r.aguardandoLeitura && (
                    <span className="shrink-0 text-xs font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground">⏳</span>
                  )}
                </button>
                {aberto && (
                  <div className="p-3 pt-0 space-y-2 border-t border-border/50">
                    <div className="flex flex-wrap items-center gap-2 pt-3">
                      <DiaLeituraEditor
                        owner={owner}
                        valorAtual={r.header._dia_leitura}
                        instaladoEm={r.header._instalado_em}
                        onChanged={load}
                      />
                      <PosVendaControles
                        owner={owner}
                        dataInstalacao={r.header._instalado_em}
                        diaLeitura={r.header._dia_leitura}
                        onChanged={load}
                        compact
                      />
                    </div>
                    {r.itens.map(t => (
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
                )}
              </div>
            );
          })}
        </div>
      ) : (
      <>
      <div className="space-y-3">
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

      {filtroData === 'pendentes' ? (
        <div className="space-y-2">
          {[...filtradas]
            .sort((a, b) => {
              const aAg = (a as any).aguardando_leitura ? 1 : 0;
              const bAg = (b as any).aguardando_leitura ? 1 : 0;
              if (aAg !== bAg) return aAg - bAg;
              return a.data_programada.localeCompare(b.data_programada);
            })
            .map(t => (
              <div key={t.id} className="rounded-xl border border-border bg-card/40 p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                  <span className="text-sm font-semibold text-foreground">{t._nome}</span>
                  {t._marca_inversor && <span>• {t._marca_inversor}</span>}
                  {t._nome_planta && <span>• {t._nome_planta}</span>}
                  <div className="ml-auto">
                    <DiaLeituraEditor
                      owner={t.projeto_id ? { projetoId: t.projeto_id } : { clienteBaseId: t.cliente_base_id! }}
                      valorAtual={t._dia_leitura}
                      instaladoEm={t._instalado_em}
                      onChanged={load}
                    />
                  </div>
                </div>
                <TarefaPosVendaItem
                  tarefa={t}
                  nome={t._nome}
                  telefone={t._telefone}
                  templateText={templates[t.template_key || ''] || ''}
                  googleLink={googleLink}
                  instaladoEm={t._instalado_em}
                  diaLeitura={t._dia_leitura}
                  onChanged={load}
                />
              </div>
            ))}
        </div>
      ) : (
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
      )}
      </>
      )}

      <PosVendaNaoIniciados />
    </div>
  );
}

/* ─── CLIENTES SEM PÓS-VENDA INICIADO ─── */
const OPCOES_INICIO: { valor: number | undefined; label: string }[] = [
  { valor: undefined, label: 'Desde o início (mês 1)' },
  { valor: 6, label: 'A partir do mês 6' },
  { valor: 12, label: 'A partir do mês 12 (1 ano)' },
  { valor: 15, label: 'A partir do mês 15' },
  { valor: 18, label: 'A partir do mês 18' },
  { valor: 24, label: 'A partir do mês 24 (2 anos)' },
];

interface NaoIniciadoItem {
  key: string;
  nome: string;
  dataInstalacao: string;
  diaLeitura: number | null;
  dataNascimento: string | null;
  owner: { projetoId?: string; clienteBaseId?: string };
}

function LinhaNaoIniciado({ item, onAtivado }: { item: NaoIniciadoItem; onAtivado: () => void }) {
  const [apartirDoMes, setApartirDoMes] = useState<number | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const dias = Math.round((Date.now() - new Date(item.dataInstalacao + 'T00:00:00').getTime()) / 86400000);

  const ativar = async () => {
    if (!confirm(`Iniciar pós-venda de ${item.nome}${apartirDoMes ? ` a partir do mês ${apartirDoMes}` : ''}?`)) return;
    setBusy(true);
    try {
      const fn = item.owner.projetoId ? ativarPosVendaProjeto : ativarPosVendaCliente;
      const res = await fn({
        ...(item.owner.projetoId ? { projetoId: item.owner.projetoId } : { clienteBaseId: item.owner.clienteBaseId! }),
        dataInstalacao: new Date(item.dataInstalacao + 'T00:00:00'),
        diaLeitura: item.diaLeitura,
        dataNascimento: item.dataNascimento ? new Date(item.dataNascimento + 'T00:00:00') : null,
        apartirDoMes,
      } as any);
      if (res.created > 0) toast.success(`Pós-venda iniciado! ${res.created} lembrete(s) criado(s).`);
      else toast.info('Nenhum lembrete a criar (todos os itens escolhidos já ficaram no passado).');
      onAtivado();
    } catch (e: any) {
      toast.error('Erro ao ativar: ' + (e?.message || e));
    } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-border bg-card/40">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground truncate">{item.nome}</p>
        <p className="text-xs text-muted-foreground">
          Instalado em {fmtDateBR2(item.dataInstalacao)} · {dias} dia{dias === 1 ? '' : 's'} atrás
        </p>
      </div>
      <select
        value={apartirDoMes ?? ''}
        onChange={e => setApartirDoMes(e.target.value ? Number(e.target.value) : undefined)}
        className="solar-input py-1.5 text-xs"
      >
        {OPCOES_INICIO.map(o => <option key={o.label} value={o.valor ?? ''}>{o.label}</option>)}
      </select>
      <button onClick={ativar} disabled={busy} className="solar-btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-50">
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5" />}
        Iniciar pós-venda
      </button>
    </div>
  );
}

function fmtDateBR2(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function PosVendaNaoIniciados() {
  const [itens, setItens] = useState<NaoIniciadoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: projs }, { data: clis }, { data: tarefasP }, { data: tarefasC }] = await Promise.all([
      supabase.from('projetos' as any).select('id, nome_completo, razao_social, data_instalacao, dia_leitura, data_nascimento').not('data_instalacao', 'is', null),
      supabase.from('clientes_base' as any).select('id, nome_completo, instalado_em, dia_leitura, data_nascimento').not('instalado_em', 'is', null),
      supabase.from('tarefas_posvenda' as any).select('projeto_id').not('projeto_id', 'is', null),
      supabase.from('tarefas_posvenda' as any).select('cliente_base_id').not('cliente_base_id', 'is', null),
    ]);

    const projComTarefa = new Set(((tarefasP || []) as any[]).map(t => t.projeto_id));
    const cliComTarefa = new Set(((tarefasC || []) as any[]).map(t => t.cliente_base_id));

    const lista: NaoIniciadoItem[] = [
      ...((projs || []) as any[])
        .filter(p => !projComTarefa.has(p.id))
        .map(p => ({
          key: `p:${p.id}`,
          nome: p.nome_completo || p.razao_social || 'Cliente',
          dataInstalacao: p.data_instalacao,
          diaLeitura: p.dia_leitura ?? null,
          dataNascimento: p.data_nascimento || null,
          owner: { projetoId: p.id as string },
        })),
      ...((clis || []) as any[])
        .filter(c => !cliComTarefa.has(c.id))
        .map(c => ({
          key: `c:${c.id}`,
          nome: c.nome_completo || 'Cliente',
          dataInstalacao: c.instalado_em,
          diaLeitura: c.dia_leitura ?? null,
          dataNascimento: c.data_nascimento || null,
          owner: { clienteBaseId: c.id as string },
        })),
    ].sort((a, b) => a.dataInstalacao.localeCompare(b.dataInstalacao)); // mais antigos primeiro

    setItens(lista);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return termo ? itens.filter(i => i.nome.toLowerCase().includes(termo)) : itens;
  }, [itens, busca]);

  if (loading) return null;
  if (itens.length === 0) return null;

  return (
    <div className="space-y-3 pt-6 mt-6 border-t border-border">
      <div className="flex items-center gap-2 text-primary">
        <PlayCircle className="w-5 h-5" />
        <h2 className="text-base font-bold">Pós-venda não iniciado</h2>
        <span className="text-xs text-muted-foreground">({itens.length})</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Clientes com instalação registrada mas sem nenhum lembrete de pós-venda criado ainda.
      </p>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por cliente" className="solar-input pl-9 w-full" />
      </div>
      <div className="space-y-2">
        {filtrados.map(item => (
          <LinhaNaoIniciado key={item.key} item={item} onAtivado={load} />
        ))}
      </div>
    </div>
  );
}
