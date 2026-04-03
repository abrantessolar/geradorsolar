import React, { useState, useMemo } from 'react';
import type { Projeto } from '@/pages/GestorPage';
import { Edit2, FileText, Snowflake, Image as ImageIcon, CheckCircle, ArrowUpDown, ArrowUp, ArrowDown, GripVertical, Trash2, ClipboardList, Package } from 'lucide-react';
import WhatsAppLink from './WhatsAppLink';
import InstaladorSelect from './InstaladorSelect';
import CongelarModal from './CongelarModal';
import ObraConcluidaModal from './ObraConcluidaModal';
import LayoutUploadModal from './LayoutUploadModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import ListaMateriaisObraModal from './materiais/ListaMateriaisObraModal';
import RetirarMaterialModal from './materiais/RetirarMaterialModal';
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
            <button onClick={() => onEdit(p.id)} className="text-primary hover:text-primary/80" title="Editar"><Edit2 className="w-4 h-4" /></button>
            <button onClick={() => onDocumentos(p)} className="text-primary hover:text-primary/80" title="Documentos"><FileText className="w-4 h-4" /></button>
            <button onClick={() => setMateriaisProjeto(p)} className="text-primary hover:text-primary/80" title="Lista de Materiais"><ClipboardList className="w-4 h-4" /></button>
            <button onClick={() => setCongelarId(p.congelado ? null : p.id)} className="text-primary hover:text-primary/80" title={p.congelado ? 'Já congelada' : 'Congelar'}><Snowflake className="w-4 h-4" /></button>
            <button onClick={() => setLayoutProjeto(p)} className={`${p.layout_url ? 'text-accent-foreground' : 'text-muted-foreground'} hover:text-primary`} title="Layout"><ImageIcon className="w-4 h-4" /></button>
            <button onClick={() => setConcluidaProjeto(p)} className="text-primary hover:text-primary/80" title="Obra Concluída"><CheckCircle className="w-4 h-4" /></button>
            <button onClick={() => setDeleteProjeto(p)} className="text-destructive hover:text-destructive/80" title="Excluir"><Trash2 className="w-4 h-4" /></button>
          </div>
        </td>
      );
      default: return <td key={key} className="py-2 px-2">—</td>;
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="solar-card p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input className="solar-input max-w-xs" placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="solar-input max-w-[180px]" value={marcaInversorFilter} onChange={e => setMarcaInversorFilter(e.target.value)}>
          <option value="">Todas marcas inversor</option>
          {marcasInversor.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className="solar-input max-w-[180px]" value={marcaPlacaFilter} onChange={e => setMarcaPlacaFilter(e.target.value)}>
          <option value="">Todas marcas placa</option>
          {marcasPlaca.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} projeto(s)</span>
      </div>

      <p className="text-[11px] text-muted-foreground flex items-center gap-1"><GripVertical className="w-3 h-3" /> Arraste os cabeçalhos para reordenar colunas</p>

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
    </div>
  );
}
