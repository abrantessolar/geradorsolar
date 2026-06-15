import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Search, Zap, CheckCircle2, Clock, Flag, Users, X } from 'lucide-react';
import { ativarPosVendaCliente } from '@/lib/posvendaTarefas';

interface ClienteRow {
  id: string;
  nome: string;
  instalado_em: string;
  dia_leitura: number | null;
  marca_inversor: string | null;
  nome_planta: string | null;
  temTarefas: boolean;
}

function parseDate(s: string): Date {
  return new Date(s + 'T00:00:00');
}

function formatDate(s: string): string {
  const d = parseDate(s);
  return d.toLocaleDateString('pt-BR');
}

function tempoDecorrido(s: string): string {
  const inicio = parseDate(s);
  const agora = new Date();
  let meses = (agora.getFullYear() - inicio.getFullYear()) * 12 + (agora.getMonth() - inicio.getMonth());
  if (agora.getDate() < inicio.getDate()) meses -= 1;
  if (meses < 0) meses = 0;
  const anos = Math.floor(meses / 12);
  const rem = meses % 12;
  if (anos === 0) return meses <= 1 ? `${meses} mês` : `${meses} meses`;
  const parteAno = anos === 1 ? '1 ano' : `${anos} anos`;
  if (rem === 0) return parteAno;
  return `${parteAno} e ${rem} ${rem === 1 ? 'mês' : 'meses'}`;
}

const TRES_ANOS_MS = 3 * 365.25 * 24 * 60 * 60 * 1000;

type DiaFiltro = 'todos' | 'com' | 'sem';

export default function AtivarPosVendaTab() {
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [totalClientes, setTotalClientes] = useState(0);
  const [subTab, setSubTab] = useState<'fila' | 'encerrado'>('fila');

  const [busca, setBusca] = useState('');
  const [mesAno, setMesAno] = useState('todos');
  const [diaFiltro, setDiaFiltro] = useState<DiaFiltro>('todos');

  const [promptCliente, setPromptCliente] = useState<ClienteRow | null>(null);
  const [promptDia, setPromptDia] = useState('');
  const [ativando, setAtivando] = useState<string | null>(null);
  const [massa, setMassa] = useState<{ done: number; total: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: cli, count }, { data: tar }] = await Promise.all([
      supabase
        .from('clientes_base' as any)
        .select('id, nome_completo, instalado_em, dia_leitura, marca_inversor, nome_planta', { count: 'exact' })
        .not('instalado_em', 'is', null)
        .order('instalado_em', { ascending: false }),
      supabase
        .from('tarefas_posvenda' as any)
        .select('cliente_base_id')
        .not('cliente_base_id', 'is', null),
    ]);

    setTotalClientes(count || 0);
    const comTarefas = new Set((tar || []).map((t: any) => t.cliente_base_id));
    const rows: ClienteRow[] = (cli || []).map((c: any) => ({
      id: c.id,
      nome: c.nome_completo || 'Cliente',
      instalado_em: c.instalado_em,
      dia_leitura: c.dia_leitura ?? null,
      marca_inversor: c.marca_inversor ?? null,
      nome_planta: c.nome_planta ?? null,
      temTarefas: comTarefas.has(c.id),
    }));
    setClientes(rows);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const agora = Date.now();
  const categorias = useMemo(() => {
    const ativo: ClienteRow[] = [];
    const aguardando: ClienteRow[] = [];
    const encerrado: ClienteRow[] = [];
    for (const c of clientes) {
      const foraPeriodo = agora - parseDate(c.instalado_em).getTime() > TRES_ANOS_MS;
      if (foraPeriodo) encerrado.push(c);
      else if (c.temTarefas) ativo.push(c);
      else aguardando.push(c);
    }
    return { ativo, aguardando, encerrado };
  }, [clientes, agora]);

  const mesesDisponiveis = useMemo(() => {
    const set = new Set<string>();
    for (const c of categorias.aguardando) set.add(c.instalado_em.slice(0, 7));
    return Array.from(set).sort().reverse();
  }, [categorias.aguardando]);

  const fila = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return categorias.aguardando.filter((c) => {
      if (termo && !c.nome.toLowerCase().includes(termo)) return false;
      if (mesAno !== 'todos' && c.instalado_em.slice(0, 7) !== mesAno) return false;
      if (diaFiltro === 'com' && c.dia_leitura == null) return false;
      if (diaFiltro === 'sem' && c.dia_leitura != null) return false;
      return true;
    });
  }, [categorias.aguardando, busca, mesAno, diaFiltro]);

  const saveDiaLeitura = async (id: string, valor: number | null) => {
    setClientes((prev) => prev.map((c) => (c.id === id ? { ...c, dia_leitura: valor } : c)));
    const { error } = await supabase.from('clientes_base' as any).update({ dia_leitura: valor }).eq('id', id);
    if (error) toast.error('Erro ao salvar dia de leitura: ' + error.message);
  };

  const ativar = async (cliente: ClienteRow, diaLeitura: number | null) => {
    setAtivando(cliente.id);
    try {
      const res = await ativarPosVendaCliente({
        clienteBaseId: cliente.id,
        dataInstalacao: parseDate(cliente.instalado_em),
        diaLeitura,
      });
      if (res.created === 0) {
        toast.info('Nenhum lembrete futuro a criar para este cliente.');
      } else {
        const prox = res.proximo
          ? `\nPróximo lembrete: ${formatDate(res.proximo.data)} — ${res.proximo.descricao}`
          : '';
        toast.success(`✅ Pós-venda ativado! ${res.created} lembretes futuros criados para ${cliente.nome}.${prox}`);
      }
      setClientes((prev) => prev.map((c) => (c.id === cliente.id ? { ...c, temTarefas: true } : c)));
    } catch (e: any) {
      toast.error('Erro ao ativar pós-venda: ' + (e?.message || e));
    } finally {
      setAtivando(null);
    }
  };

  const handleAtivarClick = (cliente: ClienteRow) => {
    if (cliente.dia_leitura == null) {
      setPromptCliente(cliente);
      setPromptDia('');
    } else {
      ativar(cliente, cliente.dia_leitura);
    }
  };

  const confirmarPrompt = async () => {
    if (!promptCliente) return;
    const dia = parseInt(promptDia, 10);
    if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
      toast.error('Informe um dia válido (1 a 31).');
      return;
    }
    await saveDiaLeitura(promptCliente.id, dia);
    const cli = promptCliente;
    setPromptCliente(null);
    await ativar(cli, dia);
  };

  const ativarTodos = async () => {
    const alvos = categorias.aguardando.filter((c) => c.dia_leitura != null);
    if (alvos.length === 0) {
      toast.info('Nenhum cliente com dia de leitura preenchido para ativar.');
      return;
    }
    setMassa({ done: 0, total: alvos.length });
    let totalLembretes = 0;
    let ativados = 0;
    for (let i = 0; i < alvos.length; i++) {
      const c = alvos[i];
      try {
        const res = await ativarPosVendaCliente({
          clienteBaseId: c.id,
          dataInstalacao: parseDate(c.instalado_em),
          diaLeitura: c.dia_leitura,
        });
        if (res.created > 0) { ativados++; totalLembretes += res.created; }
        setClientes((prev) => prev.map((x) => (x.id === c.id ? { ...x, temTarefas: true } : x)));
      } catch { /* continua */ }
      setMassa({ done: i + 1, total: alvos.length });
    }
    setMassa(null);
    toast.success(`✅ ${ativados} clientes ativados com sucesso! ${totalLembretes} lembretes futuros criados.`);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const resumo = [
    { icon: CheckCircle2, label: 'Com pós-venda ativo', value: categorias.ativo.length, color: 'text-green-600' },
    { icon: Clock, label: 'Aguardando ativação', value: categorias.aguardando.length, color: 'text-yellow-600' },
    { icon: Flag, label: 'Monitoramento encerrado', value: categorias.encerrado.length, color: 'text-muted-foreground' },
    { icon: Users, label: 'Total de clientes', value: totalClientes, color: 'text-primary' },
  ];

  return (
    <div className="solar-card p-6 space-y-5">
      <h2 className="text-lg font-bold text-primary flex items-center gap-2">
        <Zap className="w-5 h-5" /> Ativar Pós-venda
      </h2>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {resumo.map((r) => (
          <div key={r.label} className="rounded-lg border border-border bg-muted/30 p-3">
            <div className={`flex items-center gap-2 ${r.color}`}>
              <r.icon className="w-4 h-4" />
              <span className="text-2xl font-bold">{r.value}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{r.label}</p>
          </div>
        ))}
      </div>

      {/* Sub-abas */}
      <div className="flex gap-2">
        <button onClick={() => setSubTab('fila')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium ${subTab === 'fila' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
          Fila de ativação ({categorias.aguardando.length})
        </button>
        <button onClick={() => setSubTab('encerrado')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium ${subTab === 'encerrado' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
          Monitoramento encerrado ({categorias.encerrado.length})
        </button>
      </div>

      {subTab === 'fila' && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente" className="solar-input pl-9 w-full" />
            </div>
            <select value={mesAno} onChange={(e) => setMesAno(e.target.value)} className="solar-input py-2 text-sm">
              <option value="todos">Todos os meses</option>
              {mesesDisponiveis.map((m) => {
                const [y, mo] = m.split('-');
                return <option key={m} value={m}>{mo}/{y}</option>;
              })}
            </select>
            <select value={diaFiltro} onChange={(e) => setDiaFiltro(e.target.value as DiaFiltro)} className="solar-input py-2 text-sm">
              <option value="todos">Dia de leitura: todos</option>
              <option value="com">Com dia definido</option>
              <option value="sem">Sem dia definido</option>
            </select>
            <button onClick={ativarTodos} disabled={!!massa}
              className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-yellow-500 text-black hover:bg-yellow-400 disabled:opacity-50">
              <Zap className="w-4 h-4" />
              {massa ? `Ativando... ${massa.done}/${massa.total}` : 'Ativar todos com dia de leitura'}
            </button>
          </div>

          {fila.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Nenhum cliente aguardando ativação.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border">
                    <th className="py-2 pr-3">Cliente</th>
                    <th className="py-2 pr-3">Instalação</th>
                    <th className="py-2 pr-3">Tempo</th>
                    <th className="py-2 pr-3">Dia leitura</th>
                    <th className="py-2 pr-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {fila.map((c) => (
                    <tr key={c.id} className="border-b border-border/50">
                      <td className="py-2 pr-3 font-medium">{c.nome}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{formatDate(c.instalado_em)}</td>
                      <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">{tempoDecorrido(c.instalado_em)}</td>
                      <td className="py-2 pr-3">
                        <input
                          type="number" min={1} max={31}
                          value={c.dia_leitura ?? ''}
                          placeholder="—"
                          onChange={(e) => {
                            const v = e.target.value === '' ? null : Math.max(1, Math.min(31, parseInt(e.target.value, 10) || 0));
                            setClientes((prev) => prev.map((x) => (x.id === c.id ? { ...x, dia_leitura: v } : x)));
                          }}
                          onBlur={(e) => {
                            const v = e.target.value === '' ? null : Math.max(1, Math.min(31, parseInt(e.target.value, 10) || 0));
                            saveDiaLeitura(c.id, v);
                          }}
                          className="solar-input w-16 py-1 text-center"
                        />
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <button onClick={() => handleAtivarClick(c)} disabled={ativando === c.id || !!massa}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
                          {ativando === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                          Ativar pós-venda
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {subTab === 'encerrado' && (
        categorias.encerrado.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">Nenhum cliente com monitoramento encerrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3">Cliente</th>
                  <th className="py-2 pr-3">Instalação</th>
                  <th className="py-2 pr-3">Tempo</th>
                  <th className="py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {categorias.encerrado.map((c) => (
                  <tr key={c.id} className="border-b border-border/50">
                    <td className="py-2 pr-3 font-medium">{c.nome}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{formatDate(c.instalado_em)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">{tempoDecorrido(c.instalado_em)}</td>
                    <td className="py-2 pr-3"><span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Flag className="w-3.5 h-3.5" /> Pós-venda concluído</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Prompt dia de leitura */}
      {promptCliente && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPromptCliente(null)}>
          <div className="bg-background rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Dia de leitura da conta</h3>
              <button onClick={() => setPromptCliente(null)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <p className="text-sm text-muted-foreground">
              Qual o dia aproximado de leitura da conta de luz de <strong>{promptCliente.nome}</strong>? (1 a 31)
            </p>
            <input
              type="number" min={1} max={31} autoFocus
              value={promptDia}
              onChange={(e) => setPromptDia(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') confirmarPrompt(); }}
              className="solar-input w-full"
              placeholder="Ex.: 15"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setPromptCliente(null)} className="px-4 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground">Cancelar</button>
              <button onClick={confirmarPrompt} className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
