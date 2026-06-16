import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Projeto } from '@/pages/GestorPage';
import type { ClienteBase } from './ClientesList';
import { Edit2, FileText, Snowflake, Image as ImageIcon, CheckCircle, Trash2, ClipboardList, Package, FileDown, Eye, Search, ArrowUpRight, GripVertical, Link2, Zap, Loader2, CheckCircle2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ativarPosVendaCliente, ativarPosVendaProjeto } from '@/lib/posvendaTarefas';
import WhatsAppLink from './WhatsAppLink';
import { generateFichaInstalacao } from '@/lib/generateFichaInstalacao';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import InstaladorSelect from './InstaladorSelect';
import CongelarModal from './CongelarModal';
import ObraConcluidaModal from './ObraConcluidaModal';
import LayoutUploadModal from './LayoutUploadModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import ListaMateriaisObraModal from './materiais/ListaMateriaisObraModal';
import RetirarMaterialModal from './materiais/RetirarMaterialModal';
import ClienteDadosModal from './ClienteDadosModal';
import { fmtDateBR } from '@/lib/dateUtils';
import ClienteEditModal from './ClienteEditModal';
import LinkRastreamentoModal from './acompanhamento/LinkRastreamentoModal';
import { useDraggableColumns, type ColumnDef } from '@/hooks/useDraggableColumns';

function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top"><p>{label}</p></TooltipContent>
    </Tooltip>
  );
}

function daysSince(dateStr?: string | null): number {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function calcKwp(qtd?: number | null, potW?: string | null): string {
  if (!qtd || !potW) return '—';
  const pot = parseFloat(potW);
  if (isNaN(pot)) return '—';
  return ((qtd * pot) / 1000).toFixed(2);
}

function displayClienteName(c: ClienteBase): string {
  if (c.nome_completo && c.nome_completo.trim()) return c.nome_completo;
  if (c.razao_social && String(c.razao_social).trim()) return String(c.razao_social);
  const outros = Array.isArray(c.outros_nomes) ? c.outros_nomes : [];
  const firstOutro = outros.find((o: any) => o && (o.nome || '').trim());
  if (firstOutro) return firstOutro.nome;
  if (c.cpf) return `CPF ${c.cpf}`;
  return '—';
}

type FilterMode = 'todos' | 'aguardando' | 'instalados';

export default function ProjetosUnificados({
  projetos, clientes, loading, onEdit, onDocumentos, onPromover, onRefresh,
}: {
  projetos: Projeto[];
  clientes: ClienteBase[];
  loading: boolean;
  onEdit: (id: string) => void;
  onDocumentos: (p: Projeto) => void;
  onPromover: (c: ClienteBase) => void;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('todos');

  // Modals for obras
  const [congelarId, setCongelarId] = useState<string | null>(null);
  const [layoutProjeto, setLayoutProjeto] = useState<Projeto | null>(null);
  const [concluidaProjeto, setConcluidaProjeto] = useState<Projeto | null>(null);
  const [deleteProjeto, setDeleteProjeto] = useState<Projeto | null>(null);
  const [materiaisProjeto, setMateriaisProjeto] = useState<Projeto | null>(null);
  const [retirarProjeto, setRetirarProjeto] = useState<Projeto | null>(null);
  const [dadosProjeto, setDadosProjeto] = useState<Projeto | null>(null);
  const [linkProjeto, setLinkProjeto] = useState<Projeto | null>(null);
  // Modals for clientes
  const [dadosCliente, setDadosCliente] = useState<ClienteBase | null>(null);
  const [editCliente, setEditCliente] = useState<ClienteBase | null>(null);
  const [deleteCliente, setDeleteCliente] = useState<ClienteBase | null>(null);
  const [promoverCliente, setPromoverCliente] = useState<ClienteBase | null>(null);

  // Pós-venda (Instalados)
  const [posvendaAtivos, setPosvendaAtivos] = useState<Set<string>>(new Set());
  const [diasLeitura, setDiasLeitura] = useState<Record<string, number | null>>({});
  const [ativandoPosVenda, setAtivandoPosVenda] = useState<string | null>(null);
  const [promptPosVenda, setPromptPosVenda] = useState<ClienteBase | null>(null);
  const [promptDia, setPromptDia] = useState('');

  const loadPosVendaStatus = useCallback(async () => {
    const [{ data: porCliente }, { data: porProjeto }] = await Promise.all([
      supabase.from('tarefas_posvenda' as any).select('cliente_base_id').not('cliente_base_id', 'is', null),
      supabase.from('tarefas_posvenda' as any).select('projeto_id').not('projeto_id', 'is', null),
    ]);
    const set = new Set<string>();
    (porCliente || []).forEach((t: any) => set.add(`cb:${t.cliente_base_id}`));
    (porProjeto || []).forEach((t: any) => set.add(`pj:${t.projeto_id}`));
    setPosvendaAtivos(set);
  }, []);

  useEffect(() => { loadPosVendaStatus(); }, [loadPosVendaStatus]);

  // Chave de status de pós-venda + id real para um cliente da lista Instalados
  const posvendaKey = (c: ClienteBase): string =>
    c.id.startsWith('proj-') ? `pj:${c.id.replace('proj-', '')}` : `cb:${c.id}`;
  const isPosVendaAtivo = (c: ClienteBase): boolean => posvendaAtivos.has(posvendaKey(c));
  const getDiaLeitura = (c: ClienteBase): number | null =>
    c.id in diasLeitura ? diasLeitura[c.id] : (c.dia_leitura ?? null);

  const salvarDiaLeitura = async (c: ClienteBase, valor: number | null) => {
    setDiasLeitura(prev => ({ ...prev, [c.id]: valor }));
    const ehProjeto = c.id.startsWith('proj-');
    const realId = ehProjeto ? c.id.replace('proj-', '') : c.id;
    const { error } = await supabase
      .from((ehProjeto ? 'projetos' : 'clientes_base') as any)
      .update({ dia_leitura: valor })
      .eq('id', realId);
    if (error) toast.error('Erro ao salvar dia de leitura: ' + error.message);
  };

  const executarAtivacao = async (c: ClienteBase, diaLeitura: number | null) => {
    if (!c.instalado_em) { toast.error('Cliente sem data de instalação.'); return; }
    setAtivandoPosVenda(c.id);
    try {
      const dataInstalacao = new Date(c.instalado_em + 'T00:00:00');
      const ehProjeto = c.id.startsWith('proj-');
      const res = ehProjeto
        ? await ativarPosVendaProjeto({ projetoId: c.id.replace('proj-', ''), dataInstalacao, diaLeitura })
        : await ativarPosVendaCliente({ clienteBaseId: c.id, dataInstalacao, diaLeitura });
      if (res.created === 0) {
        toast.info('Nenhum lembrete futuro a criar para este cliente.');
      } else {
        const prox = res.proximo ? `\nPróximo lembrete: ${fmtDateBR(res.proximo.data)} — ${res.proximo.descricao}` : '';
        toast.success(`✅ Pós-venda ativado! ${res.created} lembretes futuros criados.${prox}`);
      }
      setPosvendaAtivos(prev => new Set(prev).add(posvendaKey(c)));
    } catch (e: any) {
      toast.error('Erro ao ativar pós-venda: ' + (e?.message || e));
    } finally {
      setAtivandoPosVenda(null);
    }
  };

  const handleAtivarPosVenda = (c: ClienteBase) => {
    const dia = getDiaLeitura(c);
    if (dia == null) {
      setPromptPosVenda(c);
      setPromptDia('');
    } else {
      executarAtivacao(c, dia);
    }
  };

  const confirmarPromptPosVenda = async () => {
    if (!promptPosVenda) return;
    const dia = parseInt(promptDia, 10);
    if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
      toast.error('Informe um dia válido (1 a 31).');
      return;
    }
    await salvarDiaLeitura(promptPosVenda, dia);
    const c = promptPosVenda;
    setPromptPosVenda(null);
    await executarAtivacao(c, dia);
  };

  const renderPosVendaAcao = (c: ClienteBase) => {
    if (isPosVendaAtivo(c)) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-[10px] font-medium whitespace-nowrap">
          <CheckCircle2 className="w-3 h-3" /> Ativo
        </span>
      );
    }
    const dia = getDiaLeitura(c);
    return (
      <span className="inline-flex items-center gap-1">
        <input
          type="number" min={1} max={31}
          value={dia ?? ''}
          placeholder="dia"
          title="Dia de leitura da conta"
          onChange={(e) => {
            const v = e.target.value === '' ? null : Math.max(1, Math.min(31, parseInt(e.target.value, 10) || 0));
            setDiasLeitura(prev => ({ ...prev, [c.id]: v }));
          }}
          onBlur={(e) => {
            const v = e.target.value === '' ? null : Math.max(1, Math.min(31, parseInt(e.target.value, 10) || 0));
            salvarDiaLeitura(c, v);
          }}
          className="solar-input w-12 py-0.5 px-1 text-center text-xs"
        />
        <Tip label="Ativar pós-venda">
          <button onClick={() => handleAtivarPosVenda(c)} disabled={ativandoPosVenda === c.id}
            className="text-green-600 hover:text-green-700 disabled:opacity-50">
            {ativandoPosVenda === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          </button>
        </Tip>
      </span>
    );
  };

  const q = search.toLowerCase();

  const filteredProjetos = useMemo(() => {
    if (filter === 'instalados') return [];
    return projetos.filter(p => {
      if (!q) return true;
      const searchFields = [
        p.nome_completo, p.razao_social, p.cpf, p.cnpj,
        p.unidade_geradora_codigo_uc, p.telefone,
        p.endereco_completo, p.logradouro,
        p.marca_inversor, p.marca_placa, p.data_instalacao,
      ].map(v => (v || '').toLowerCase());
      // Search in outros_nomes
      const outrosNomes = Array.isArray(p.outros_nomes) ? (p.outros_nomes as any[]).map(o => (o.nome || '').toLowerCase()).join(' ') : '';
      return searchFields.some(f => f.includes(q)) || outrosNomes.includes(q);
    }).sort((a, b) => daysSince(b.data_fechamento) - daysSince(a.data_fechamento));
  }, [projetos, q, filter]);

  const filteredClientes = useMemo(() => {
    if (filter === 'aguardando') return [];
    return clientes.filter(c => {
      if (!q) return true;
      const searchFields = [
        c.nome_completo, c.cpf, c.uc, c.telefone,
        c.endereco, c.marca_inversor, c.marca_placa, c.instalado_em,
      ].map(v => (v || '').toLowerCase());
      return searchFields.some(f => f.includes(q));
    }).sort((a, b) => {
      const da = a.instalado_em ? new Date(a.instalado_em).getTime() : 0;
      const db = b.instalado_em ? new Date(b.instalado_em).getTime() : 0;
      return db - da;
    });
  }, [clientes, q, filter]);

  // Draggable columns for aguardando
  const aguardandoDefaultOrder = ['cliente', 'telefone', 'instalador', 'qtd_placas', 'marca', 'potencia', 'tempo', 'status', 'acoes'];
  const aguardandoDrag = useDraggableColumns('cols_aguardando', aguardandoDefaultOrder);

  // Draggable columns for instalados
  const instaladosDefaultOrder = ['cliente', 'telefone', 'data_instalacao', 'instalador', 'qtd_placas', 'kwp', 'marca_inv', 'pot_inv', 'acoes'];
  const instaladosDrag = useDraggableColumns('cols_instalados', instaladosDefaultOrder);

  const mapProjetoToDados = (p: Projeto) => ({
    id: p.id,
    criado_em: p.criado_em,
    tipo_pessoa: (p as any).tipo_pessoa || 'PF',
    nome_completo: p.nome_completo || p.razao_social || null,
    razao_social: p.razao_social || null,
    cnpj: (p as any).cnpj || null,
    nome_representante: (p as any).nome_representante || null,
    cpf_representante: (p as any).cpf_representante || null,
    cpf: p.cpf || null,
    data_nascimento: p.data_nascimento || null,
    telefone: p.telefone || null,
    telefone_2: null, telefone_3: null, email: (p as any).email || null,
    endereco: p.endereco_completo || null,
    logradouro: p.logradouro || null,
    complemento: p.complemento || null,
    numero: null,
    bairro: p.bairro || null,
    cidade: p.cidade || null,
    estado: p.estado || null,
    cep: p.cep || null,
    concessionaria: p.concessionaria || null,
    uc: p.unidade_geradora_codigo_uc || null,
    nome_planta: p.nome_planta || null,
    dia_leitura: (p as any).dia_leitura ?? null,
    wifi_nome: (p as any).wifi_nome || null,
    wifi_senha: (p as any).wifi_senha || null,
    estrutura: (p as any).estrutura || null,
    instalado_em: p.data_instalacao || null,
    instalador: p.instalador || null,
    vistoriado_em: p.vistoriado_em || null,
    qtd_placas: p.qtd_placas || null,
    marca_placa: p.marca_placa || null,
    potencia_placa: p.potencia_placa || null,
    marca_inversor: p.marca_inversor || null,
    potencia_inversor: p.potencia_inversor || null,
    qtd_inversores: p.qtd_inversores || null,
    geracao_estimada_kwh: (p as any).geracao_estimada_kwh ?? null,
    kwp: null,
    sistema: p.sistema || null,
    valor: p.preco_venda || null,
    forma_pagamento: p.forma_pagamento || null,
    distribuidor: (p as any).distribuidor || null,
    pagamento_status: (p as any).pagamento_status || null,
    observacoes: p.objecoes || null,
    origem: 'projeto',
    dados_paineis: null, dados_inversor: null, tipo_inversor: null,
    fornecedor: null, projeto_enviado_em: null, projeto_aprovado: null,
    satisfacao: null, projeto_id: null,
    data_fechamento: p.data_fechamento || null,
    outros_nomes: p.outros_nomes || [],
    observacoes_historico: p.observacoes_historico || [],
  } as any);

  // Column definitions for aguardando
  const aguardandoColDefs: Record<string, { label: string; render: (p: Projeto) => React.ReactNode; className?: string }> = {
    cliente: { label: 'Cliente', render: p => <span className="font-medium max-w-[180px] truncate block">{p.congelado && '❄️ '}{p.nome_completo || p.razao_social || '—'}</span> },
    telefone: { label: 'Telefone', render: p => <WhatsAppLink phone={p.telefone} />, className: 'text-xs' },
    instalador: { label: 'Instalador', render: p => <InstaladorSelect projetoId={p.id} currentValue={p.instalador} onDone={onRefresh} /> },
    qtd_placas: { label: 'Qtd Placas', render: p => <>{p.qtd_placas || '—'}</>, className: 'text-xs' },
    marca: { label: 'Marca', render: p => <>{p.marca_placa || '—'}</>, className: 'text-xs' },
    potencia: { label: 'Pot. (Wp)', render: p => <>{p.potencia_placa || '—'}</>, className: 'text-xs' },
    tempo: { label: 'Tempo', render: p => { const days = daysSince(p.data_fechamento); return <span className={`font-medium ${days > 30 ? 'text-destructive' : ''}`}>{p.data_fechamento ? `${days}d` : '—'}</span>; }, className: 'text-xs' },
    status: { label: 'Status', render: p => <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-[10px] font-medium">{p.status}</span>, className: 'text-xs' },
    acoes: { label: 'Ações', render: p => (
      <div className="flex gap-1 items-center">
        <TooltipProvider>
          <Tip label="Ver dados"><button onClick={() => setDadosProjeto(p)} className="text-primary hover:text-primary/80"><Eye className="w-4 h-4" /></button></Tip>
          <Tip label="Editar"><button onClick={() => onEdit(p.id)} className="text-primary hover:text-primary/80"><Edit2 className="w-4 h-4" /></button></Tip>
          <Tip label="Documentos"><button onClick={() => onDocumentos(p)} className="text-primary hover:text-primary/80"><FileText className="w-4 h-4" /></button></Tip>
          <Tip label="Materiais"><button onClick={() => setMateriaisProjeto(p)} className="text-primary hover:text-primary/80"><ClipboardList className="w-4 h-4" /></button></Tip>
          <Tip label="Ficha"><button onClick={() => generateFichaInstalacao(p)} className="text-primary hover:text-primary/80"><FileDown className="w-4 h-4" /></button></Tip>
          <Tip label="Retirar material"><button onClick={() => setRetirarProjeto(p)} className="text-primary hover:text-primary/80"><Package className="w-4 h-4" /></button></Tip>
          <Tip label="Link de rastreamento"><button onClick={() => setLinkProjeto(p)} className={`${p.codigo_rastreamento ? 'text-accent-foreground' : 'text-primary'} hover:text-primary/80`}><Link2 className="w-4 h-4" /></button></Tip>
          <Tip label={p.congelado ? 'Congelada' : 'Congelar'}><button onClick={() => setCongelarId(p.congelado ? null : p.id)} className="text-primary hover:text-primary/80"><Snowflake className="w-4 h-4" /></button></Tip>
          <Tip label="Layout"><button onClick={() => setLayoutProjeto(p)} className={`${p.layout_url ? 'text-accent-foreground' : 'text-muted-foreground'} hover:text-primary`}><ImageIcon className="w-4 h-4" /></button></Tip>
          <Tip label="Concluída"><button onClick={() => setConcluidaProjeto(p)} className="text-primary hover:text-primary/80"><CheckCircle className="w-4 h-4" /></button></Tip>
          <Tip label="Excluir"><button onClick={() => setDeleteProjeto(p)} className="text-destructive hover:text-destructive/80"><Trash2 className="w-4 h-4" /></button></Tip>
        </TooltipProvider>
      </div>
    )},
  };

  // Column definitions for instalados
  const instaladosColDefs: Record<string, { label: string; render: (c: ClienteBase) => React.ReactNode; className?: string }> = {
    cliente: { label: 'Cliente', render: c => <span className="font-medium max-w-[180px] truncate block">{displayClienteName(c)}</span> },
    telefone: { label: 'Telefone', render: c => <WhatsAppLink phone={c.telefone} />, className: 'text-xs' },
    data_instalacao: { label: 'Data Instalação', render: c => <>{c.instalado_em ? fmtDateBR(c.instalado_em) : '—'}</>, className: 'text-xs' },
    instalador: { label: 'Instalador', render: c => c.instalador ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-medium">{c.instalador}</span> : <span className="text-muted-foreground text-xs">—</span>, className: 'text-xs' },
    qtd_placas: { label: 'Qtd Placas', render: c => <>{c.qtd_placas || '—'}</>, className: 'text-xs' },
    kwp: { label: 'kWp', render: c => <span className="font-medium">{c.kwp ? Number(c.kwp).toFixed(2) : calcKwp(c.qtd_placas, c.potencia_placa)}</span>, className: 'text-xs' },
    marca_inv: { label: 'Marca Inv.', render: c => <>{c.marca_inversor || '—'}</>, className: 'text-xs' },
    pot_inv: { label: 'Pot. Inv.', render: c => <>{c.potencia_inversor ? `${c.potencia_inversor} kW` : '—'}</>, className: 'text-xs' },
    
    acoes: { label: 'Ações', render: c => (
      <div className="flex gap-1 items-center">
        <TooltipProvider>
          <Tip label="Ver dados"><button onClick={() => setDadosCliente(c)} className="text-primary hover:text-primary/80"><Eye className="w-4 h-4" /></button></Tip>
          <Tip label="Editar"><button onClick={() => setEditCliente(c)} className="text-primary hover:text-primary/80"><Edit2 className="w-4 h-4" /></button></Tip>
          <Tip label="Promover para obra"><button onClick={() => setPromoverCliente(c)} className="text-primary hover:text-primary/80"><ArrowUpRight className="w-4 h-4" /></button></Tip>
          <Tip label="Excluir"><button onClick={() => setDeleteCliente(c)} className="text-destructive hover:text-destructive/80"><Trash2 className="w-4 h-4" /></button></Tip>
        </TooltipProvider>
      </div>
    )},
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-4">
      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="solar-input pl-9 w-full text-sm"
            placeholder="Buscar nome, CPF, UC, telefone, endereço, marca..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5">
          {(['todos', 'aguardando', 'instalados'] as FilterMode[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              {f === 'todos' ? 'Todos' : f === 'aguardando' ? 'Aguardando' : 'Instalados'}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION: Aguardando Instalação */}
      {filter !== 'instalados' && (
        <div className="rounded-xl border border-amber-200 bg-[#FFFBEA] dark:bg-amber-950/20 dark:border-amber-800">
          <div className="px-4 py-3 border-b border-amber-200 dark:border-amber-800">
            <h2 className="text-sm font-semibold">⏳ Aguardando Instalação ({filteredProjetos.length})</h2>
          </div>
          <div className="p-2 sm:p-4">
            {/* Mobile */}
            <div className="block sm:hidden space-y-2">
              {filteredProjetos.map(p => {
                const days = daysSince(p.data_fechamento);
                return (
                  <div key={p.id} className={`border border-border rounded-lg p-3 space-y-2 bg-background ${p.congelado ? 'opacity-60' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{p.congelado && '❄️ '}{p.nome_completo || p.razao_social || '—'}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <WhatsAppLink phone={p.telefone} />
                          {p.data_fechamento && <span className={`text-xs font-medium ${days > 30 ? 'text-destructive' : 'text-muted-foreground'}`}>{days}d</span>}
                        </div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 font-medium">{p.status}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      <div><span className="text-muted-foreground">Placas:</span> {p.qtd_placas || '—'}x {p.marca_placa || ''} {p.potencia_placa || ''}W</div>
                      <div><span className="text-muted-foreground">Instalador:</span> {p.instalador || '—'}</div>
                    </div>
                    <div className="flex gap-1.5 items-center pt-1 border-t border-border/50 flex-wrap">
                      <button onClick={() => setDadosProjeto(p)} className="text-primary hover:text-primary/80 p-1"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => onEdit(p.id)} className="text-primary hover:text-primary/80 p-1"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => onDocumentos(p)} className="text-primary hover:text-primary/80 p-1"><FileText className="w-4 h-4" /></button>
                      <button onClick={() => setMateriaisProjeto(p)} className="text-primary hover:text-primary/80 p-1"><ClipboardList className="w-4 h-4" /></button>
                      <button onClick={() => generateFichaInstalacao(p)} className="text-primary hover:text-primary/80 p-1"><FileDown className="w-4 h-4" /></button>
                      <button onClick={() => setRetirarProjeto(p)} className="text-primary hover:text-primary/80 p-1"><Package className="w-4 h-4" /></button>
                      <button onClick={() => setLinkProjeto(p)} className={`${p.codigo_rastreamento ? 'text-accent-foreground' : 'text-primary'} hover:text-primary/80 p-1`}><Link2 className="w-4 h-4" /></button>
                      <button onClick={() => setConcluidaProjeto(p)} className="text-primary hover:text-primary/80 p-1"><CheckCircle className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteProjeto(p)} className="text-destructive hover:text-destructive/80 p-1 ml-auto"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                );
              })}
              {filteredProjetos.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">Nenhum projeto aguardando.</p>}
            </div>

            {/* Desktop with draggable columns */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-amber-200 dark:border-amber-800 text-left text-muted-foreground text-xs">
                    {aguardandoDrag.order.map((key, idx) => {
                      const col = aguardandoColDefs[key];
                      if (!col) return null;
                      return (
                        <th key={key} className="py-2 px-2 select-none"
                          draggable
                          onDragStart={() => aguardandoDrag.onDragStart(idx)}
                          onDragOver={e => aguardandoDrag.onDragOver(e, idx)}
                          onDragEnd={aguardandoDrag.onDragEnd}
                        >
                          <span className="inline-flex items-center gap-1 cursor-grab active:cursor-grabbing">
                            <GripVertical className="w-3 h-3 text-muted-foreground/50" />
                            {col.label}
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filteredProjetos.map(p => (
                    <tr key={p.id} className={`border-b border-amber-100 dark:border-amber-900/50 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 ${p.congelado ? 'opacity-60' : ''}`}>
                      {aguardandoDrag.order.map(key => {
                        const col = aguardandoColDefs[key];
                        if (!col) return null;
                        return <td key={key} className={`py-2 px-2 ${col.className || ''}`}>{col.render(p)}</td>;
                      })}
                    </tr>
                  ))}
                  {filteredProjetos.length === 0 && (
                    <tr><td colSpan={aguardandoDrag.order.length} className="py-6 text-center text-muted-foreground text-xs">Nenhum projeto aguardando.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: Instalados */}
      {filter !== 'aguardando' && (
        <div className="solar-card">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold">✅ Instalados ({filteredClientes.length})</h2>
          </div>
          <div className="p-2 sm:p-4">
            {/* Mobile */}
            <div className="block sm:hidden space-y-2">
              {filteredClientes.map(c => (
                <div key={c.id} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{displayClienteName(c)}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <WhatsAppLink phone={c.telefone} />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <div><span className="text-muted-foreground">Instalação:</span> {c.instalado_em ? fmtDateBR(c.instalado_em) : '—'}</div>
                    <div><span className="text-muted-foreground">KWp:</span> {c.kwp ? Number(c.kwp).toFixed(2) : calcKwp(c.qtd_placas, c.potencia_placa)}</div>
                    <div><span className="text-muted-foreground">Placas:</span> {c.qtd_placas || '—'}</div>
                    <div><span className="text-muted-foreground">Inversor:</span> {c.marca_inversor || '—'}</div>
                    <div className="col-span-2"><span className="text-muted-foreground">Instalador:</span> {c.instalador || '—'}</div>
                  </div>
                   <div className="flex gap-1.5 items-center pt-1 border-t border-border/50">
                     <button onClick={() => setDadosCliente(c)} className="text-primary hover:text-primary/80 p-1"><Eye className="w-4 h-4" /></button>
                     <button onClick={() => setEditCliente(c)} className="text-primary hover:text-primary/80 p-1"><Edit2 className="w-4 h-4" /></button>
                     <button onClick={() => setPromoverCliente(c)} className="text-primary hover:text-primary/80 p-1"><ArrowUpRight className="w-4 h-4" /></button>
                     <button onClick={() => setDeleteCliente(c)} className="text-destructive hover:text-destructive/80 p-1 ml-auto"><Trash2 className="w-4 h-4" /></button>
                   </div>
                </div>
              ))}
              {filteredClientes.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">Nenhum cliente instalado.</p>}
            </div>

            {/* Desktop with draggable columns */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground text-xs">
                    {instaladosDrag.order.map((key, idx) => {
                      const col = instaladosColDefs[key];
                      if (!col) return null;
                      return (
                        <th key={key} className="py-2 px-2 select-none"
                          draggable
                          onDragStart={() => instaladosDrag.onDragStart(idx)}
                          onDragOver={e => instaladosDrag.onDragOver(e, idx)}
                          onDragEnd={instaladosDrag.onDragEnd}
                        >
                          <span className="inline-flex items-center gap-1 cursor-grab active:cursor-grabbing">
                            <GripVertical className="w-3 h-3 text-muted-foreground/50" />
                            {col.label}
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filteredClientes.map(c => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30">
                      {instaladosDrag.order.map(key => {
                        const col = instaladosColDefs[key];
                        if (!col) return null;
                        return <td key={key} className={`py-2 px-2 ${col.className || ''}`}>{col.render(c)}</td>;
                      })}
                    </tr>
                  ))}
                  {filteredClientes.length === 0 && (
                    <tr><td colSpan={instaladosDrag.order.length} className="py-6 text-center text-muted-foreground text-xs">Nenhum cliente instalado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modals - Obras */}
      {congelarId && <CongelarModal projetoId={congelarId} onClose={() => setCongelarId(null)} onDone={onRefresh} />}
      {layoutProjeto && <LayoutUploadModal projetoId={layoutProjeto.id} currentUrl={layoutProjeto.layout_url} onClose={() => setLayoutProjeto(null)} onDone={onRefresh} />}
      {concluidaProjeto && <ObraConcluidaModal projetoId={concluidaProjeto.id} currentInstalador={concluidaProjeto.instalador} onClose={() => setConcluidaProjeto(null)} onDone={onRefresh} />}
      {deleteProjeto && (
        <DeleteConfirmModal
          nome={deleteProjeto.nome_completo || deleteProjeto.razao_social || 'Projeto'}
          id={deleteProjeto.id}
          tabela="projetos"
          onClose={() => setDeleteProjeto(null)}
          onDeleted={() => { setDeleteProjeto(null); onRefresh(); }}
        />
      )}
      {materiaisProjeto && <ListaMateriaisObraModal projeto={materiaisProjeto} onClose={() => setMateriaisProjeto(null)} />}
      {retirarProjeto && <RetirarMaterialModal projeto={retirarProjeto} onClose={() => setRetirarProjeto(null)} onDone={onRefresh} />}
      {linkProjeto && (
        <LinkRastreamentoModal
          projeto={{ id: linkProjeto.id, nome: linkProjeto.nome_completo || linkProjeto.razao_social || 'Cliente', telefone: linkProjeto.telefone, codigo_rastreamento: linkProjeto.codigo_rastreamento }}
          onClose={() => setLinkProjeto(null)}
          onGenerated={onRefresh}
        />
      )}
      {dadosProjeto && (
        <ClienteDadosModal
          cliente={mapProjetoToDados(dadosProjeto)}
          onClose={() => setDadosProjeto(null)}
        />
      )}

      {/* Modals - Clientes */}
      {dadosCliente && <ClienteDadosModal cliente={dadosCliente} onClose={() => setDadosCliente(null)} />}
      {editCliente && <ClienteEditModal cliente={editCliente} onClose={() => setEditCliente(null)} onSaved={() => { onRefresh(); setEditCliente(null); }} />}
      {deleteCliente && (
        <DeleteConfirmModal
          nome={displayClienteName(deleteCliente)}
          id={deleteCliente.id.startsWith('proj-') ? deleteCliente.id.replace('proj-', '') : deleteCliente.id}
          tabela={deleteCliente.id.startsWith('proj-') ? 'projetos' : 'clientes_base'}
          onClose={() => setDeleteCliente(null)}
          onDeleted={() => { setDeleteCliente(null); onRefresh(); }}
        />
      )}

      {/* Modal de confirmação para promover */}
      {promoverCliente && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPromoverCliente(null)}>
          <div className="bg-background rounded-xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <ArrowUpRight className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Promover para Obra</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Deseja criar um novo projeto (obra) a partir dos dados de <strong className="text-foreground">{promoverCliente.nome_completo || 'este cliente'}</strong>?
            </p>
            <p className="text-xs text-muted-foreground">
              Os dados do cliente serão copiados para um novo projeto com status "Vendido".
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setPromoverCliente(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/70 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => { onPromover(promoverCliente); setPromoverCliente(null); }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Sim, promover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
