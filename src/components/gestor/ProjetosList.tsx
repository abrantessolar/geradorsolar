import React, { useState, useMemo } from 'react';
import type { Projeto } from '@/pages/GestorPage';
import { Edit2, FileText, Snowflake, Image as ImageIcon, CheckCircle, ArrowUpDown, ArrowUp, ArrowDown, GripVertical, Trash2, ClipboardList, Package, FileDown, Eye } from 'lucide-react';
import WhatsAppLink from './WhatsAppLink';
import { generateFichaInstalacao } from '@/lib/generateFichaInstalacao';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top"><p>{label}</p></TooltipContent>
    </Tooltip>
  );
}
import InstaladorSelect from './InstaladorSelect';
import CongelarModal from './CongelarModal';
import ObraConcluidaModal from './ObraConcluidaModal';
import LayoutUploadModal from './LayoutUploadModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import ListaMateriaisObraModal from './materiais/ListaMateriaisObraModal';
import RetirarMaterialModal from './materiais/RetirarMaterialModal';
import ClienteDadosModal from './ClienteDadosModal';
import { useDraggableColumns } from '@/hooks/useDraggableColumns';

function daysSince(dateStr?: string): number {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function calcKwp(qtd?: number, potW?: string): string {
  if (!qtd || !potW) return '—';
  const pot = parseFloat(potW);
  if (isNaN(pot)) return '—';
  return ((qtd * pot) / 1000).toFixed(2);
}

const COL_KEYS = ['cliente', 'telefone', 'tempo', 'concessionaria', 'marca_inv', 'pot_inv', 'qtd_placas', 'marca_placa', 'pot_placa', 'kwp', 'instalador', 'acoes'];

export default function ProjetosList({ projetos, loading, onEdit, onDocumentos, onRefresh }: {
  projetos: Projeto[];
  loading: boolean;
  onEdit: (id: string) => void;
  onDocumentos: (p: Projeto) => void;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState('');
  const [marcaInversorFilter, setMarcaInversorFilter] = useState('');
  const [marcaPlacaFilter, setMarcaPlacaFilter] = useState('');
  const [congelarId, setCongelarId] = useState<string | null>(null);
  const [layoutProjeto, setLayoutProjeto] = useState<Projeto | null>(null);
  const [concluidaProjeto, setConcluidaProjeto] = useState<Projeto | null>(null);
  const [deleteProjeto, setDeleteProjeto] = useState<Projeto | null>(null);
  const [materiaisProjeto, setMateriaisProjeto] = useState<Projeto | null>(null);
  const [retirarProjeto, setRetirarProjeto] = useState<Projeto | null>(null);
  const [dadosProjeto, setDadosProjeto] = useState<Projeto | null>(null);
  const [tempoSort, setTempoSort] = useState<'asc' | 'desc' | null>(null);

  const { order, onDragStart, onDragOver, onDragEnd, dragIdx } = useDraggableColumns('gestor-obras-cols', COL_KEYS);

  const marcasInversor = useMemo(() => {
    const set = new Set<string>();
    projetos.forEach(p => { if (p.marca_inversor) set.add(p.marca_inversor); });
    return Array.from(set).sort();
  }, [projetos]);

  const marcasPlaca = useMemo(() => {
    const set = new Set<string>();
    projetos.forEach(p => { if (p.marca_placa) set.add(p.marca_placa); });
    return Array.from(set).sort();
  }, [projetos]);

  const filtered = useMemo(() => {
    let result = projetos.filter(p => {
      if (marcaInversorFilter && p.marca_inversor !== marcaInversorFilter) return false;
      if (marcaPlacaFilter && p.marca_placa !== marcaPlacaFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = (p.nome_completo || p.razao_social || '').toLowerCase();
        if (!name.includes(q)) return false;
      }
      return true;
    });
    if (tempoSort) {
      result = [...result].sort((a, b) => {
        const da = daysSince(a.data_fechamento);
        const db = daysSince(b.data_fechamento);
        return tempoSort === 'asc' ? da - db : db - da;
      });
    }
    return result;
  }, [projetos, marcaInversorFilter, marcaPlacaFilter, search, tempoSort]);

  const toggleTempoSort = () => {
    setTempoSort(prev => prev === null ? 'desc' : prev === 'desc' ? 'asc' : null);
  };

  const colHeaders: Record<string, React.ReactNode> = {
    cliente: 'Cliente',
    telefone: 'Telefone',
    tempo: (
      <div className="flex items-center gap-1 cursor-pointer select-none" onClick={toggleTempoSort}>
        Tempo
        {tempoSort === 'desc' ? <ArrowDown className="w-3 h-3" /> : tempoSort === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowUpDown className="w-3 h-3 opacity-40" />}
      </div>
    ),
    concessionaria: 'Concessionária',
    marca_inv: 'Marca Inv.',
    pot_inv: 'Pot. Inv.',
    qtd_placas: 'Qtd Placas',
    marca_placa: 'Marca Placa',
    pot_placa: 'Pot. Placa',
    kwp: 'KWp',
    instalador: 'Instalador',
    acoes: 'Ações',
  };

  const renderCell = (key: string, p: Projeto) => {
    const days = daysSince(p.data_fechamento);
    const clientName = p.nome_completo || p.razao_social || '—';
    switch (key) {
      case 'cliente': return (
        <td key={key} className="py-2 px-2 font-medium max-w-[180px] truncate">
          {p.congelado && <span className="mr-1" title="Congelada">❄️</span>}
          {clientName}
        </td>
      );
      case 'telefone': return <td key={key} className="py-2 px-2 text-xs"><WhatsAppLink phone={p.telefone} /></td>;
      case 'tempo': return <td key={key} className={`py-2 px-2 text-xs font-medium ${days > 60 ? 'text-destructive' : ''}`}>{p.data_fechamento ? `${days}d` : '—'}</td>;
      case 'concessionaria': return <td key={key} className="py-2 px-2 text-xs">{p.concessionaria}</td>;
      case 'marca_inv': return (
        <td key={key} className="py-2 px-2 text-xs">
          {p.marca_inversor || p.inversor?.marca || '—'}
          {p.inversor?.tipo?.toUpperCase() === 'MICRO' && (
            <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-accent text-accent-foreground">MICRO</span>
          )}
        </td>
      );
      case 'pot_inv': return (
        <td key={key} className="py-2 px-2 text-xs">
          {p.inversor?.tipo?.toUpperCase() === 'MICRO'
            ? `${p.qtd_inversores || 1}x ${p.inversor?.potencia_kw || p.potencia_inversor || '—'}kW`
            : (p.potencia_inversor || p.inversor?.potencia_kw || '—')
          }
        </td>
      );
      case 'qtd_placas': return <td key={key} className="py-2 px-2 text-xs">{p.qtd_placas || '—'}</td>;
      case 'marca_placa': return <td key={key} className="py-2 px-2 text-xs">{p.marca_placa || '—'}</td>;
      case 'pot_placa': return <td key={key} className="py-2 px-2 text-xs">{p.potencia_placa || '—'}</td>;
      case 'kwp': return <td key={key} className="py-2 px-2 text-xs font-medium">{calcKwp(p.qtd_placas, p.potencia_placa)}</td>;
      case 'instalador': return <td key={key} className="py-2 px-2"><InstaladorSelect projetoId={p.id} currentValue={p.instalador} onDone={onRefresh} /></td>;
      case 'acoes': return (
        <td key={key} className="py-2 px-2">
          <div className="flex gap-1 items-center">
             <TooltipProvider>
              <Tip label="Ver dados"><button onClick={() => setDadosProjeto(p)} className="text-primary hover:text-primary/80"><Eye className="w-4 h-4" /></button></Tip>
               <Tip label="Editar projeto"><button onClick={() => onEdit(p.id)} className="text-primary hover:text-primary/80"><Edit2 className="w-4 h-4" /></button></Tip>
               <Tip label="Gerar documentos"><button onClick={() => onDocumentos(p)} className="text-primary hover:text-primary/80"><FileText className="w-4 h-4" /></button></Tip>
               <Tip label="Lista de materiais"><button onClick={() => setMateriaisProjeto(p)} className="text-primary hover:text-primary/80"><ClipboardList className="w-4 h-4" /></button></Tip>
               <Tip label="Ficha de instalação"><button onClick={() => generateFichaInstalacao(p)} className="text-primary hover:text-primary/80"><FileDown className="w-4 h-4" /></button></Tip>
               <Tip label="Retirar material"><button onClick={() => setRetirarProjeto(p)} className="text-primary hover:text-primary/80"><Package className="w-4 h-4" /></button></Tip>
               <Tip label={p.congelado ? 'Obra congelada' : 'Congelar obra'}><button onClick={() => setCongelarId(p.congelado ? null : p.id)} className="text-primary hover:text-primary/80"><Snowflake className="w-4 h-4" /></button></Tip>
               <Tip label="Layout da obra"><button onClick={() => setLayoutProjeto(p)} className={`${p.layout_url ? 'text-accent-foreground' : 'text-muted-foreground'} hover:text-primary`}><ImageIcon className="w-4 h-4" /></button></Tip>
               <Tip label="Obra concluída"><button onClick={() => setConcluidaProjeto(p)} className="text-primary hover:text-primary/80"><CheckCircle className="w-4 h-4" /></button></Tip>
               <Tip label="Excluir"><button onClick={() => setDeleteProjeto(p)} className="text-destructive hover:text-destructive/80"><Trash2 className="w-4 h-4" /></button></Tip>
             </TooltipProvider>
          </div>
        </td>
      );
      default: return <td key={key} className="py-2 px-2">—</td>;
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="solar-card p-3 sm:p-6 space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3">
        <input className="solar-input w-full sm:max-w-xs text-sm" placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className="flex gap-2 w-full sm:w-auto">
          <select className="solar-input flex-1 sm:max-w-[180px] text-xs sm:text-sm" value={marcaInversorFilter} onChange={e => setMarcaInversorFilter(e.target.value)}>
            <option value="">Todas inv.</option>
            {marcasInversor.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select className="solar-input flex-1 sm:max-w-[180px] text-xs sm:text-sm" value={marcaPlacaFilter} onChange={e => setMarcaPlacaFilter(e.target.value)}>
            <option value="">Todas placas</option>
            {marcasPlaca.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <span className="text-xs text-muted-foreground sm:ml-auto">{filtered.length} projeto(s)</span>
      </div>

      {/* Mobile card view */}
      <div className="block sm:hidden space-y-3">
        {filtered.map(p => {
          const days = daysSince(p.data_fechamento);
          const clientName = p.nome_completo || p.razao_social || '—';
          return (
            <div key={p.id} className={`border border-border rounded-lg p-3 space-y-2 ${p.congelado ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {p.congelado && <span className="mr-1">❄️</span>}
                    {clientName}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <WhatsAppLink phone={p.telefone} />
                    {p.data_fechamento && (
                      <span className={`text-xs font-medium ${days > 60 ? 'text-destructive' : 'text-muted-foreground'}`}>{days}d</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <div><span className="text-muted-foreground">Placas:</span> {p.qtd_placas || '—'} {p.marca_placa || ''}</div>
                <div><span className="text-muted-foreground">KWp:</span> {calcKwp(p.qtd_placas, p.potencia_placa)}</div>
                <div><span className="text-muted-foreground">Inversor:</span> {p.marca_inversor || p.inversor?.marca || '—'}</div>
                <div><span className="text-muted-foreground">Pot.:</span> {p.potencia_inversor || p.inversor?.potencia_kw || '—'}</div>
              </div>
              <div className="flex gap-1.5 items-center pt-1 border-t border-border/50">
                <button onClick={() => setDadosProjeto(p)} className="text-primary hover:text-primary/80 p-1" title="Ver Dados"><Eye className="w-4 h-4" /></button>
                <button onClick={() => onEdit(p.id)} className="text-primary hover:text-primary/80 p-1" title="Editar"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => onDocumentos(p)} className="text-primary hover:text-primary/80 p-1" title="Documentos"><FileText className="w-4 h-4" /></button>
                <button onClick={() => setMateriaisProjeto(p)} className="text-primary hover:text-primary/80 p-1" title="Lista de Materiais"><ClipboardList className="w-4 h-4" /></button>
                <button onClick={() => generateFichaInstalacao(p)} className="text-primary hover:text-primary/80 p-1" title="Ficha de Instalação"><FileDown className="w-4 h-4" /></button>
                <button onClick={() => setRetirarProjeto(p)} className="text-primary hover:text-primary/80 p-1" title="Retirar Material"><Package className="w-4 h-4" /></button>
                <button onClick={() => setCongelarId(p.congelado ? null : p.id)} className="text-primary hover:text-primary/80 p-1"><Snowflake className="w-4 h-4" /></button>
                <button onClick={() => setLayoutProjeto(p)} className={`${p.layout_url ? 'text-accent-foreground' : 'text-muted-foreground'} hover:text-primary p-1`}><ImageIcon className="w-4 h-4" /></button>
                <button onClick={() => setConcluidaProjeto(p)} className="text-primary hover:text-primary/80 p-1"><CheckCircle className="w-4 h-4" /></button>
                <button onClick={() => setDeleteProjeto(p)} className="text-destructive hover:text-destructive/80 p-1 ml-auto"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Nenhum projeto encontrado.</p>}
      </div>

      {/* Desktop table view */}
      <div className="hidden sm:block">
        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mb-2"><GripVertical className="w-3 h-3" /> Arraste os cabeçalhos para reordenar colunas</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                {order.map((key, idx) => (
                  <th
                    key={key}
                    className={`py-2 px-2 cursor-grab select-none ${dragIdx === idx ? 'opacity-50' : ''}`}
                    draggable
                    onDragStart={() => onDragStart(idx)}
                    onDragOver={e => onDragOver(e, idx)}
                    onDragEnd={onDragEnd}
                  >
                    {colHeaders[key] || key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className={`border-b border-border/50 hover:bg-muted/30 ${p.congelado ? 'opacity-60' : ''}`}>
                  {order.map(key => renderCell(key, p))}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={order.length} className="py-8 text-center text-muted-foreground">Nenhum projeto encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
      {materiaisProjeto && (
        <ListaMateriaisObraModal projeto={materiaisProjeto} onClose={() => setMateriaisProjeto(null)} />
      )}
      {retirarProjeto && (
        <RetirarMaterialModal projeto={retirarProjeto} onClose={() => setRetirarProjeto(null)} onDone={onRefresh} />
      )}
      {dadosProjeto && (
        <ClienteDadosModal
          cliente={{
            id: dadosProjeto.id,
            criado_em: dadosProjeto.criado_em,
            nome_completo: dadosProjeto.nome_completo || dadosProjeto.razao_social || null,
            cpf: dadosProjeto.cpf || null,
            data_nascimento: dadosProjeto.data_nascimento || null,
            telefone: dadosProjeto.telefone || null,
            telefone_2: null,
            telefone_3: null,
            email: null,
            endereco: dadosProjeto.endereco_completo || null,
            logradouro: dadosProjeto.logradouro || null,
            complemento: dadosProjeto.complemento || null,
            numero: null,
            bairro: dadosProjeto.bairro || null,
            cidade: dadosProjeto.cidade || null,
            estado: dadosProjeto.estado || null,
            cep: dadosProjeto.cep || null,
            concessionaria: dadosProjeto.concessionaria || null,
            uc: dadosProjeto.unidade_geradora_codigo_uc || null,
            nome_planta: null,
            instalado_em: dadosProjeto.data_instalacao || null,
            vistoriado_em: dadosProjeto.vistoriado_em || null,
            qtd_placas: dadosProjeto.qtd_placas || null,
            marca_placa: dadosProjeto.marca_placa || null,
            potencia_placa: dadosProjeto.potencia_placa || null,
            marca_inversor: dadosProjeto.marca_inversor || null,
            potencia_inversor: dadosProjeto.potencia_inversor || null,
            qtd_inversores: dadosProjeto.qtd_inversores || null,
            kwp: null,
            sistema: dadosProjeto.sistema || null,
            valor: dadosProjeto.preco_venda || null,
            forma_pagamento: dadosProjeto.forma_pagamento || null,
            observacoes: dadosProjeto.objecoes || null,
            origem: 'projeto',
          } as any}
          onClose={() => setDadosProjeto(null)}
        />
      )}
    </div>
  );
}
