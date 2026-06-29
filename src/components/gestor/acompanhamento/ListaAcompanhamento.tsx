import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, Search, AlertTriangle, ChevronDown, ChevronUp, Check, HardHat, Link2 } from 'lucide-react';
import { FLUXOS, colunaAtual, type RastreamentoRow, type EtapaDef } from '@/lib/rastreamentoEtapas';
import { getConfigDB } from '@/data/supabaseStore';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import LinkRastreamentoModal from './LinkRastreamentoModal';
import KitPrecoModal from './KitPrecoModal';
import { gerarTarefasPosVenda, type TarefaPosVenda } from '@/lib/posvendaTarefas';
import { loadTemplatesMap } from '@/components/gestor/posvenda/PosVendaAgenda';
import TarefaPosVendaItem from '@/components/gestor/posvenda/TarefaPosVendaItem';

interface ProjetoLista {
  id: string;
  nome: string;
  telefone: string | null;
  instalador: string | null;
  numero_proposta: string | null;
  codigo_rastreamento: string | null;
  dia_leitura: number | null;
  nome_planta: string | null;
  data_nascimento: string | null;
  distribuidor: string | null;
  wifi_nome: string | null;
  wifi_senha: string | null;
  status: string | null;
  criado_em: string;
}

type FiltroRapido = 'todas' | 'atrasadas' | 'homologacao' | 'equipamentos' | 'instalacao' | 'concluidas';
type Ordenacao = 'antigas' | 'recentes' | 'progresso' | 'nome';

function daysSince(dateStr?: string | null): number {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function fmtDataHora(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} às ${hh}:${mi}`;
}

/** Etapas visíveis de um fluxo (trata a etapa condicional de troca do fluxo 1) */
function etapasVisiveis(fluxo: number, rows: RastreamentoRow[]): EtapaDef[] {
  const def = FLUXOS.find(f => f.fluxo === fluxo)!;
  if (fluxo === 1) {
    const troca = rows.find(r => r.fluxo === 1 && r.etapa === 4);
    const trocaAtiva = !!troca?.campo_extra?.ativada;
    return def.etapas.filter(e => {
      if (e.etapa === 3) return !trocaAtiva; // "Aprovado" some quando troca ativa
      if (e.etapa === 4) return trocaAtiva;  // "Aprovado com troca" só aparece ativado
      return true;
    });
  }
  return def.etapas.filter(e => !e.condicional);
}

function progresso(rows: RastreamentoRow[]): { done: number; total: number; pct: number } {
  let done = 0, total = 0;
  for (const f of FLUXOS) {
    for (const e of etapasVisiveis(f.fluxo, rows)) {
      total++;
      if (rows.some(r => r.fluxo === f.fluxo && r.etapa === e.etapa && r.concluido)) done++;
    }
  }
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

function ultimaDataCheck(rows: RastreamentoRow[], criadoEm: string): string {
  const datas = rows.filter(r => r.concluido && r.data_conclusao).map(r => r.data_conclusao!);
  return datas.length ? datas.sort().slice(-1)[0] : criadoEm;
}

export default function ListaAcompanhamento() {
  const { session } = useAuth();
  const [projetos, setProjetos] = useState<ProjetoLista[]>([]);
  const [rowsByProjeto, setRowsByProjeto] = useState<Record<string, RastreamentoRow[]>>({});
  const [nomesUsuarios, setNomesUsuarios] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [prazoDias, setPrazoDias] = useState(7);
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});

  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<FiltroRapido>('todas');
  const [ordenacao, setOrdenacao] = useState<Ordenacao>('antigas');
  const [linkProjeto, setLinkProjeto] = useState<ProjetoLista | null>(null);
  const [kitProjeto, setKitProjeto] = useState<ProjetoLista | null>(null);
  const [tarefasByProjeto, setTarefasByProjeto] = useState<Record<string, TarefaPosVenda[]>>({});
  const [templates, setTemplates] = useState<Record<string, string>>({});
  const [googleLink, setGoogleLink] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data: projs } = await supabase
      .from('projetos' as any)
      .select('id, nome_completo, razao_social, telefone, instalador, proposta_id, codigo_rastreamento, dia_leitura, nome_planta, data_nascimento, distribuidor, wifi_nome, wifi_senha, status, criado_em')
      .order('criado_em', { ascending: false });

    const propIds = (projs || []).map((p: any) => p.proposta_id).filter(Boolean);
    const numeros: Record<string, string> = {};
    if (propIds.length) {
      const { data: props } = await supabase.from('propostas' as any).select('id, numero_proposta').in('id', propIds);
      for (const pr of props || []) numeros[(pr as any).id] = (pr as any).numero_proposta;
    }

    const list: ProjetoLista[] = (projs || []).map((p: any) => ({
      id: p.id,
      nome: p.nome_completo || p.razao_social || '—',
      telefone: p.telefone || null,
      instalador: p.instalador || null,
      numero_proposta: p.proposta_id ? (numeros[p.proposta_id] || null) : null,
      codigo_rastreamento: p.codigo_rastreamento || null,
      dia_leitura: p.dia_leitura ?? null,
      nome_planta: p.nome_planta || null,
      data_nascimento: p.data_nascimento || null,
      distribuidor: p.distribuidor || null,
      wifi_nome: p.wifi_nome || null,
      wifi_senha: p.wifi_senha || null,
      status: p.status || null,
      criado_em: p.criado_em,
    }));

    const { data: allRows } = await supabase.from('rastreamento_obras' as any).select('*');
    const byProj: Record<string, RastreamentoRow[]> = {};
    for (const r of (allRows || []) as any[]) {
      (byProj[r.projeto_id] ||= []).push(r);
    }

    const projIds = list.map(p => p.id);
    const tByProj: Record<string, TarefaPosVenda[]> = {};
    if (projIds.length) {
      const { data: tarefas } = await supabase.from('tarefas_posvenda' as any)
        .select('*').in('projeto_id', projIds).order('data_programada', { ascending: true });
      for (const t of (tarefas || []) as any[]) (tByProj[t.projeto_id] ||= []).push(t);
    }

    const { data: usuarios } = await supabase.from('user_profiles' as any).select('user_id, nome');
    const nomes: Record<string, string> = {};
    for (const u of (usuarios || []) as any[]) nomes[u.user_id] = u.nome;

    const cfg = await getConfigDB('rastreamento_prazo_dias');
    if (cfg) setPrazoDias(Number(cfg) || 7);
    const g = await getConfigDB('rastreamento_google_link');
    if (g) setGoogleLink(String(g));
    setTemplates(await loadTemplatesMap());

    setProjetos(list);
    setRowsByProjeto(byProj);
    setTarefasByProjeto(tByProj);
    setNomesUsuarios(nomes);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const refetchProjeto = useCallback(async (projetoId: string) => {
    const { data } = await supabase.from('rastreamento_obras' as any).select('*').eq('projeto_id', projetoId);
    setRowsByProjeto(prev => ({ ...prev, [projetoId]: (data || []) as any }));
    return (data || []) as unknown as RastreamentoRow[];
  }, []);

  const getRow = (projetoId: string, fluxo: number, etapa: number) =>
    (rowsByProjeto[projetoId] || []).find(r => r.fluxo === fluxo && r.etapa === etapa);

  // Marca/atualiza uma etapa
  const commitCheck = async (projetoId: string, fluxo: number, etapa: number, concluido: boolean, extra?: Record<string, any>) => {
    const row = getRow(projetoId, fluxo, etapa);
    const now = new Date().toISOString();
    const patch: any = {
      concluido,
      data_conclusao: concluido ? (row?.data_conclusao || now) : null,
      usuario_id: concluido ? (session?.user?.id || null) : null,
    };
    if (extra) patch.campo_extra = { ...(row?.campo_extra || {}), ...extra };

    if (row) {
      const { error } = await supabase.from('rastreamento_obras' as any).update(patch).eq('id', row.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from('rastreamento_obras' as any)
        .insert({ projeto_id: projetoId, fluxo, etapa, visivel_cliente: true, ...patch });
      if (error) { toast.error(error.message); return; }
    }

    await supabase.from('rastreamento_historico' as any).insert({
      projeto_id: projetoId, fluxo, etapa,
      acao: concluido ? 'concluido' : 'desfeito',
      usuario_id: session?.user?.id || null,
    });

    const novasRows = await refetchProjeto(projetoId);

    // "Equipamento pago" (fluxo 2, etapa 2) → pede o preço do kit para ir aos Custos
    if (concluido && fluxo === 2 && etapa === 2) {
      const proj = projetos.find(p => p.id === projetoId);
      if (proj) setKitProjeto(proj);
    }

    // "Instalação finalizada" (fluxo 3, etapa 3) → grava data_instalacao e gera o pós-venda
    if (concluido && fluxo === 3 && etapa === 3) {
      const proj = projetos.find(p => p.id === projetoId);
      const hoje = new Date();
      await supabase.from('projetos' as any).update({ data_instalacao: hoje.toISOString().slice(0, 10) }).eq('id', projetoId);
      try {
        const criadas = await gerarTarefasPosVenda({
          projetoId,
          dataInstalacao: hoje,
          diaLeitura: proj?.dia_leitura ?? null,
          dataNascimento: proj?.data_nascimento ? new Date(proj.data_nascimento + 'T00:00:00') : null,
          usuarioId: session?.user?.id,
        });
        if (criadas > 0) {
          toast.success(`Pós-venda iniciado! ${criadas} lembretes criados para 3 anos.`);
          const { data: tarefas } = await supabase.from('tarefas_posvenda' as any)
            .select('*').eq('projeto_id', projetoId).order('data_programada', { ascending: true });
          setTarefasByProjeto(prev => ({ ...prev, [projetoId]: (tarefas || []) as any }));
        }
      } catch (e: any) {
        toast.error('Erro ao gerar pós-venda: ' + (e.message || e));
      }
    }

    if (concluido) await verificarConclusao(projetoId, novasRows);
  };

  const refetchTarefas = useCallback(async (projetoId: string) => {
    const { data } = await supabase.from('tarefas_posvenda' as any)
      .select('*').eq('projeto_id', projetoId).order('data_programada', { ascending: true });
    setTarefasByProjeto(prev => ({ ...prev, [projetoId]: (data || []) as any }));
  }, []);

  // Atualiza apenas campo_extra (sem mexer no concluido) — para campos editáveis
  const updateExtra = async (projetoId: string, fluxo: number, etapa: number, extra: Record<string, any>) => {
    const row = getRow(projetoId, fluxo, etapa);
    if (!row) return;
    const campo_extra = { ...(row.campo_extra || {}), ...extra };
    const { error } = await supabase.from('rastreamento_obras' as any).update({ campo_extra }).eq('id', row.id);
    if (error) { toast.error(error.message); return; }
    setRowsByProjeto(prev => ({
      ...prev,
      [projetoId]: (prev[projetoId] || []).map(r => r.id === row.id ? { ...r, campo_extra } : r),
    }));
  };

  // Atualiza o nome da planta no projeto (sincroniza com o Novo Projeto)
  const updateNomePlanta = async (projetoId: string, nome: string) => {
    const valor = nome.trim() || null;
    const { error } = await supabase.from('projetos' as any).update({ nome_planta: valor }).eq('id', projetoId);
    if (error) { toast.error(error.message); return; }
    setProjetos(prev => prev.map(p => p.id === projetoId ? { ...p, nome_planta: valor } : p));
  };

  // Atualiza o fornecedor/distribuidor no projeto
  const updateFornecedor = async (projetoId: string, fornecedor: string) => {
    const valor = fornecedor.trim() || null;
    const { error } = await supabase.from('projetos' as any).update({ distribuidor: valor }).eq('id', projetoId);
    if (error) { toast.error(error.message); return; }
    setProjetos(prev => prev.map(p => p.id === projetoId ? { ...p, distribuidor: valor } : p));
  };

  // Atualiza os dados de WiFi no projeto
  const updateWifi = async (projetoId: string, nome: string, senha: string) => {
    const wifi_nome = nome.trim() || null;
    const wifi_senha = senha.trim() || null;
    const { error } = await supabase.from('projetos' as any).update({ wifi_nome, wifi_senha }).eq('id', projetoId);
    if (error) { toast.error(error.message); return; }
    setProjetos(prev => prev.map(p => p.id === projetoId ? { ...p, wifi_nome, wifi_senha } : p));
  };

  const verificarConclusao = async (projetoId: string, rows: RastreamentoRow[]) => {
    const { done, total } = progresso(rows);
    if (total > 0 && done === total) {
      await supabase.from('projetos' as any).update({
        status: 'Instalado',
        data_instalacao: new Date().toISOString().slice(0, 10),
      }).eq('id', projetoId);
      toast.success('Obra concluída! Disponível no filtro "Concluídas".');
      setProjetos(prev => prev.map(p => p.id === projetoId ? { ...p, status: 'Instalado' } : p));
    }
  };

  const toggleTroca = async (projetoId: string) => {
    const row = getRow(projetoId, 1, 4);
    const ativa = !!row?.campo_extra?.ativada;
    if (!ativa) {
      // ativar troca: desmarca "Aprovado" (etapa 3) se estiver marcado
      const aprovado = getRow(projetoId, 1, 3);
      if (aprovado?.concluido) {
        await supabase.from('rastreamento_obras' as any)
          .update({ concluido: false, data_conclusao: null, usuario_id: null }).eq('id', aprovado.id);
      }
    }
    await updateExtra(projetoId, 1, 4, { ativada: !ativa });
  };

  const projetosFiltrados = useMemo(() => {
    let arr = projetos.filter(p => {
      const rows = rowsByProjeto[p.id] || [];
      const termo = busca.trim().toLowerCase();
      if (termo && !(p.nome.toLowerCase().includes(termo) || (p.numero_proposta || '').toLowerCase().includes(termo))) return false;

      const concluida = p.status === 'Instalado' || p.status === 'Homologado';
      if (filtro === 'concluidas') return concluida;
      // Nos demais filtros, ocultar as obras já concluídas
      if (concluida) return false;

      if (filtro === 'atrasadas') {
        return daysSince(ultimaDataCheck(rows, p.criado_em)) > prazoDias;
      }
      if (filtro !== 'todas') {
        const col = rows.length ? colunaAtual(rows) : 'homologacao';
        return col === filtro;
      }
      return true;
    });

    arr = [...arr].sort((a, b) => {
      const ra = rowsByProjeto[a.id] || [], rb = rowsByProjeto[b.id] || [];
      switch (ordenacao) {
        case 'recentes': return new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime();
        case 'progresso': return progresso(rb).pct - progresso(ra).pct;
        case 'nome': return a.nome.localeCompare(b.nome);
        case 'antigas':
        default: return new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime();
      }
    });
    return arr;
  }, [projetos, rowsByProjeto, busca, filtro, ordenacao, prazoDias]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const filtros: { key: FiltroRapido; label: string }[] = [
    { key: 'todas', label: 'Todas' },
    { key: 'atrasadas', label: 'Atrasadas' },
    { key: 'homologacao', label: 'Homologação' },
    { key: 'equipamentos', label: 'Equipamentos' },
    { key: 'instalacao', label: 'Instalação' },
    { key: 'concluidas', label: 'Concluídas' },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        {/* Filtros e busca */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nome ou nº da proposta"
              className="solar-input pl-9 w-full"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {filtros.map(f => (
              <button
                key={f.key}
                onClick={() => setFiltro(f.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filtro === f.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
              >
                {f.label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Ordenar:</span>
              <select
                value={ordenacao}
                onChange={e => setOrdenacao(e.target.value as Ordenacao)}
                className="solar-input py-1.5 text-xs"
              >
                <option value="antigas">Mais antigas primeiro</option>
                <option value="recentes">Mais recentes primeiro</option>
                <option value="progresso">% de progresso</option>
                <option value="nome">Nome do cliente</option>
              </select>
            </div>
          </div>
        </div>

        {projetosFiltrados.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-10">Nenhuma obra em andamento encontrada.</p>
        )}

        <div className="space-y-3">
          {projetosFiltrados.map(p => {
            const rows = rowsByProjeto[p.id] || [];
            const prog = progresso(rows);
            const diasUltimo = daysSince(ultimaDataCheck(rows, p.criado_em));
            const atrasada = diasUltimo > prazoDias;
            const aberto = expandidos[p.id] ?? true;

            return (
              <div
                key={p.id}
                className={`rounded-xl border bg-card overflow-hidden ${atrasada ? 'border-destructive' : 'border-border'}`}
              >
                {/* Cabeçalho */}
                <div className="w-full px-4 py-3 flex items-center gap-2 hover:bg-muted/40 transition-colors">
                  <button
                    onClick={() => setExpandidos(prev => ({ ...prev, [p.id]: !aberto }))}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground truncate">{p.nome}</span>
                      {p.numero_proposta && <span className="text-xs text-muted-foreground">— {p.numero_proposta}</span>}
                      {atrasada && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive font-medium">
                          <AlertTriangle className="w-3 h-3" /> Atrasada
                        </span>
                      )}
                      {p.instalador && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300">
                          <HardHat className="w-3 h-3" /> {p.instalador}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="h-2 flex-1 max-w-[260px] rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary transition-all" style={{ width: `${prog.pct}%` }} />
                      </div>
                      <span className="text-xs font-medium text-foreground">{prog.pct}%</span>
                      <span className="text-xs text-muted-foreground">• há {diasUltimo} dia{diasUltimo === 1 ? '' : 's'}</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setLinkProjeto(p)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors ${p.codigo_rastreamento ? 'bg-muted text-foreground hover:bg-muted/70' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{p.codigo_rastreamento ? 'Link' : 'Gerar link'}</span>
                  </button>
                  <button
                    onClick={() => setExpandidos(prev => ({ ...prev, [p.id]: !aberto }))}
                    className="shrink-0 text-muted-foreground"
                  >
                    {aberto ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Fluxos */}
                {aberto && (
                  <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border">
                    {FLUXOS.map(f => {
                      const vis = etapasVisiveis(f.fluxo, rows);
                      const trocaRow = getRow(p.id, 1, 4);
                      const trocaAtiva = !!trocaRow?.campo_extra?.ativada;
                      return (
                        <div key={f.fluxo} className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{f.icone} {f.titulo}:</span>
                            {f.fluxo === 1 && (
                              <button
                                onClick={() => toggleTroca(p.id)}
                                className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${trocaAtiva ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
                              >
                                {trocaAtiva ? '✓ Troca ativada' : '⚠ Ativar troca'}
                              </button>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                            {vis.map(e => (
                              <EtapaCheck
                                key={e.etapa}
                                projetoId={p.id}
                                fluxo={f.fluxo}
                                etapaDef={e}
                                rows={rows}
                                nomesUsuarios={nomesUsuarios}
                                getRow={getRow}
                                commitCheck={commitCheck}
                                updateExtra={updateExtra}
                                nomePlanta={p.nome_planta}
                                updateNomePlanta={updateNomePlanta}
                                fornecedor={p.distribuidor}
                                updateFornecedor={updateFornecedor}
                                wifiNome={p.wifi_nome}
                                wifiSenha={p.wifi_senha}
                                updateWifi={updateWifi}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {/* Fluxo 4 — Pós-venda */}
                    {(() => {
                      const tarefas = tarefasByProjeto[p.id] || [];
                      const feitas = tarefas.filter(t => t.concluido).length;
                      return (
                        <div className="space-y-1.5 border-t border-border pt-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">🌟 Pós-venda (3 anos):</span>
                            {tarefas.length > 0 && (
                              <span className="text-[10px] text-muted-foreground">{feitas}/{tarefas.length} concluídas</span>
                            )}
                          </div>
                          {tarefas.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                              Os lembretes de pós-venda serão criados automaticamente ao marcar "Instalação finalizada".
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {tarefas
                                .filter(t => !t.concluido)
                                .slice(0, 4)
                                .map(t => (
                                  <TarefaPosVendaItem
                                    key={t.id}
                                    tarefa={t}
                                    nome={p.nome}
                                    telefone={p.telefone}
                                    templateText={templates[t.template_key || ''] || ''}
                                    googleLink={googleLink}
                                    onChanged={() => refetchTarefas(p.id)}
                                  />
                                ))}
                              <p className="text-[11px] text-muted-foreground">
                                Veja todos os lembretes na aba <strong>Pós-venda</strong>.
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {linkProjeto && (
          <LinkRastreamentoModal
            projeto={linkProjeto}
            onClose={() => setLinkProjeto(null)}
            onGenerated={load}
          />
        )}

        {kitProjeto && (
          <KitPrecoModal
            projetoId={kitProjeto.id}
            nomeCliente={kitProjeto.nome}
            onClose={() => setKitProjeto(null)}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

// ============ Checkbox individual de uma etapa ============
function EtapaCheck({
  projetoId, fluxo, etapaDef, rows, nomesUsuarios, getRow, commitCheck, updateExtra, nomePlanta, updateNomePlanta,
  fornecedor, updateFornecedor, wifiNome, wifiSenha, updateWifi,
}: {
  projetoId: string;
  fluxo: number;
  etapaDef: EtapaDef;
  rows: RastreamentoRow[];
  nomesUsuarios: Record<string, string>;
  getRow: (p: string, f: number, e: number) => RastreamentoRow | undefined;
  commitCheck: (p: string, f: number, e: number, concluido: boolean, extra?: Record<string, any>) => Promise<void>;
  updateExtra: (p: string, f: number, e: number, extra: Record<string, any>) => Promise<void>;
  nomePlanta: string | null;
  updateNomePlanta: (p: string, nome: string) => Promise<void>;
  fornecedor: string | null;
  updateFornecedor: (p: string, fornecedor: string) => Promise<void>;
  wifiNome: string | null;
  wifiSenha: string | null;
  updateWifi: (p: string, nome: string, senha: string) => Promise<void>;
}) {
  const [pedindoEntrega, setPedindoEntrega] = useState(false);
  const [pedindoPlanta, setPedindoPlanta] = useState(false);
  const [plantaInput, setPlantaInput] = useState('');
  const [pedindoFornecedor, setPedindoFornecedor] = useState(false);
  const [fornecedorInput, setFornecedorInput] = useState('');
  const [pedindoWifi, setPedindoWifi] = useState(false);
  const [wifiNomeInput, setWifiNomeInput] = useState('');
  const [wifiSenhaInput, setWifiSenhaInput] = useState('');
  const row = getRow(projetoId, fluxo, etapaDef.etapa);
  const concluido = !!row?.concluido;
  const ce = row?.campo_extra || {};

  const visiveis = etapasVisiveis(fluxo, rows);
  const idx = visiveis.findIndex(e => e.etapa === etapaDef.etapa);
  const anterior = idx > 0 ? visiveis[idx - 1] : null;
  const anteriorOk = !anterior || rows.some(r => r.fluxo === fluxo && r.etapa === anterior.etapa && r.concluido);
  const posterior = idx < visiveis.length - 1 ? visiveis[idx + 1] : null;
  const posteriorOk = posterior && rows.some(r => r.fluxo === fluxo && r.etapa === posterior.etapa && r.concluido);

  const handleClick = async () => {
    if (concluido) {
      if (posteriorOk) { toast.error('Desmarque a etapa seguinte primeiro.'); return; }
      if (!window.confirm('Tem certeza? A data registrada será apagada.')) return;
      await commitCheck(projetoId, fluxo, etapaDef.etapa, false);
      return;
    }
    if (!anteriorOk) { toast.error('Conclua a etapa anterior primeiro.'); return; }

    // Fornecedor obrigatório (fluxo 2, etapa 1) → mini modal inline
    if (fluxo === 2 && etapaDef.etapa === 1) {
      setFornecedorInput(fornecedor || ce.fornecedor || '');
      setPedindoFornecedor(true);
      return;
    }
    // Campo de entrega (fluxo 2, etapa 4) → mini modal inline
    if (fluxo === 2 && etapaDef.etapa === 4) { setPedindoEntrega(true); return; }
    // Agendamento (fluxo 3, etapa 2) → grava data de hoje como padrão
    if (fluxo === 3 && etapaDef.etapa === 2) {
      await commitCheck(projetoId, fluxo, etapaDef.etapa, true, { data_agendamento: new Date().toISOString().slice(0, 10) });
      return;
    }
    // WiFi do logger (fluxo 3, etapa 5) → mini modal inline
    if (fluxo === 3 && etapaDef.etapa === 5) {
      setWifiNomeInput(wifiNome || '');
      setWifiSenhaInput(wifiSenha || '');
      setPedindoWifi(true);
      return;
    }
    // Nome da planta (fluxo 3, etapa 6) → mini modal inline
    if (fluxo === 3 && etapaDef.etapa === 6) {
      setPlantaInput(nomePlanta || ce.nome_planta || '');
      setPedindoPlanta(true);
      return;
    }
    await commitCheck(projetoId, fluxo, etapaDef.etapa, true);
  };

  const confirmarPlanta = async () => {
    setPedindoPlanta(false);
    await updateNomePlanta(projetoId, plantaInput);
    await commitCheck(projetoId, fluxo, etapaDef.etapa, true, { nome_planta: plantaInput.trim() || null });
  };

  const confirmarFornecedor = async () => {
    if (!fornecedorInput.trim()) { toast.error('Informe o fornecedor.'); return; }
    setPedindoFornecedor(false);
    await updateFornecedor(projetoId, fornecedorInput);
    await commitCheck(projetoId, fluxo, etapaDef.etapa, true, { fornecedor: fornecedorInput.trim() });
  };

  const confirmarWifi = async () => {
    if (!wifiNomeInput.trim()) { toast.error('Informe o nome da rede WiFi.'); return; }
    setPedindoWifi(false);
    await updateWifi(projetoId, wifiNomeInput, wifiSenhaInput);
    await commitCheck(projetoId, fluxo, etapaDef.etapa, true, { wifi_nome: wifiNomeInput.trim(), wifi_senha: wifiSenhaInput.trim() || null });
  };


  const tooltipTxt = concluido
    ? `✅ Concluído em ${fmtDataHora(row?.data_conclusao)}${row?.usuario_id && nomesUsuarios[row.usuario_id] ? ` por ${nomesUsuarios[row.usuario_id]}` : ''}`
    : null;

  const checkbox = (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 text-sm transition-colors ${concluido ? 'text-foreground' : anteriorOk ? 'text-muted-foreground hover:text-foreground' : 'text-muted-foreground/50'}`}
    >
      <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${concluido ? 'bg-primary border-primary text-primary-foreground' : 'border-input'}`}>
        {concluido && <Check className="w-3 h-3" />}
      </span>
      {etapaDef.titulo}
    </button>
  );

  return (
    <span className="inline-flex flex-col gap-1">
      <span className="inline-flex items-center gap-1.5">
        {tooltipTxt ? (
          <Tooltip>
            <TooltipTrigger asChild>{checkbox}</TooltipTrigger>
            <TooltipContent>{tooltipTxt}</TooltipContent>
          </Tooltip>
        ) : checkbox}

        {/* Campo nº fila (fluxo 3, etapa 1) */}
        {fluxo === 3 && etapaDef.etapa === 1 && concluido && (
          <span className="inline-flex items-center gap-1 text-xs">
            <span className="text-muted-foreground">Nº:</span>
            <input
              type="number"
              className="solar-input py-0.5 w-16 text-xs"
              defaultValue={ce.numero_fila ?? ''}
              onBlur={ev => updateExtra(projetoId, fluxo, etapaDef.etapa, { numero_fila: ev.target.value ? Number(ev.target.value) : null })}
            />
          </span>
        )}
        {/* Data agendamento (fluxo 3, etapa 2) */}
        {fluxo === 3 && etapaDef.etapa === 2 && concluido && (
          <input
            type="date"
            className="solar-input py-0.5 text-xs"
            value={ce.data_agendamento ?? ''}
            onChange={ev => updateExtra(projetoId, fluxo, etapaDef.etapa, { data_agendamento: ev.target.value || null })}
          />
        )}
        {/* Data agendada exibida também no resumo (fluxo 3, etapa 2) */}

        {/* Local de entrega marcado (fluxo 2, etapa 4) */}
        {fluxo === 2 && etapaDef.etapa === 4 && concluido && ce.local_entrega && (
          <span className="text-[11px] text-muted-foreground">({ce.local_entrega === 'empresa' ? 'TLS Solar' : 'Cliente'})</span>
        )}
        {/* Fornecedor marcado (fluxo 2, etapa 1) */}
        {fluxo === 2 && etapaDef.etapa === 1 && concluido && (fornecedor || ce.fornecedor) && (
          <span className="text-[11px] text-muted-foreground">🏭 {fornecedor || ce.fornecedor}</span>
        )}
        {/* WiFi marcado (fluxo 3, etapa 5) */}
        {fluxo === 3 && etapaDef.etapa === 5 && concluido && (wifiNome || ce.wifi_nome) && (
          <span className="text-[11px] text-muted-foreground">📶 {wifiNome || ce.wifi_nome}</span>
        )}
        {/* Nome da planta marcado (fluxo 3, etapa 6) */}
        {fluxo === 3 && etapaDef.etapa === 6 && concluido && (nomePlanta || ce.nome_planta) && (
          <span className="text-[11px] text-muted-foreground">🌱 {nomePlanta || ce.nome_planta}</span>
        )}
      </span>

      {/* Mini modal inline de fornecedor */}
      {pedindoFornecedor && (
        <span className="flex flex-col gap-1 bg-muted/50 rounded-lg p-2 text-xs">
          <span className="font-medium text-foreground">Fornecedor / distribuidor (obrigatório):</span>
          <input
            autoFocus
            value={fornecedorInput}
            onChange={e => setFornecedorInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') confirmarFornecedor(); }}
            placeholder="Ex.: Aldo Solar, Edeltec…"
            className="solar-input py-1 text-xs"
          />
          <span className="flex items-center gap-1">
            <button onClick={confirmarFornecedor} className="px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90">Salvar</button>
            <button onClick={() => setPedindoFornecedor(false)} className="px-2 py-1 text-muted-foreground hover:text-foreground">Cancelar</button>
          </span>
        </span>
      )}

      {/* Mini modal inline de WiFi */}
      {pedindoWifi && (
        <span className="flex flex-col gap-1 bg-muted/50 rounded-lg p-2 text-xs">
          <span className="font-medium text-foreground">Dados do WiFi do logger:</span>
          <input
            autoFocus
            value={wifiNomeInput}
            onChange={e => setWifiNomeInput(e.target.value)}
            placeholder="Nome da rede WiFi"
            className="solar-input py-1 text-xs"
          />
          <input
            value={wifiSenhaInput}
            onChange={e => setWifiSenhaInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') confirmarWifi(); }}
            placeholder="Senha do WiFi"
            className="solar-input py-1 text-xs"
          />
          <span className="flex items-center gap-1">
            <button onClick={confirmarWifi} className="px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90">Salvar</button>
            <button onClick={() => setPedindoWifi(false)} className="px-2 py-1 text-muted-foreground hover:text-foreground">Cancelar</button>
          </span>
        </span>
      )}

      {/* Mini modal inline de nome da planta */}
      {pedindoPlanta && (
        <span className="flex flex-col gap-1 bg-muted/50 rounded-lg p-2 text-xs">
          <span className="font-medium text-foreground">Nome da planta de monitoramento:</span>
          <input
            autoFocus
            value={plantaInput}
            onChange={e => setPlantaInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') confirmarPlanta(); }}
            placeholder="Ex.: Cleiton Silva - TLS"
            className="solar-input py-1 text-xs"
          />
          <span className="flex items-center gap-1">
            <button onClick={confirmarPlanta} className="px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90">Salvar</button>
            <button onClick={() => setPedindoPlanta(false)} className="px-2 py-1 text-muted-foreground hover:text-foreground">Cancelar</button>
          </span>
        </span>
      )}

      {/* Mini modal inline de entrega */}
      {pedindoEntrega && (
        <span className="flex flex-col gap-1 bg-muted/50 rounded-lg p-2 text-xs">
          <span className="font-medium text-foreground">Entregue em:</span>
          {[['empresa', 'Na empresa TLS Solar'], ['cliente', 'No endereço do cliente']].map(([val, label]) => (
            <button
              key={val}
              onClick={async () => { setPedindoEntrega(false); await commitCheck(projetoId, fluxo, etapaDef.etapa, true, { local_entrega: val }); }}
              className="text-left px-2 py-1 rounded hover:bg-background"
            >
              {label}
            </button>
          ))}
          <button onClick={() => setPedindoEntrega(false)} className="text-left px-2 py-1 text-muted-foreground hover:text-foreground">Cancelar</button>
        </span>
      )}
    </span>
  );
}
