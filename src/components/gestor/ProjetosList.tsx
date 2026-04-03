import React, { useState, useMemo } from 'react';
import type { Projeto } from '@/pages/GestorPage';
import { Edit2, FileText, AlertTriangle, Snowflake, Image as ImageIcon, CheckCircle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import WhatsAppLink from './WhatsAppLink';
import InstaladorSelect from './InstaladorSelect';
import CongelarModal from './CongelarModal';
import ObraConcluidaModal from './ObraConcluidaModal';
import LayoutUploadModal from './LayoutUploadModal';

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
  const [tempoSort, setTempoSort] = useState<'asc' | 'desc' | null>(null);

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

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 px-2">Cliente</th>
              <th className="py-2 px-2">Telefone</th>
              <th className="py-2 px-2 cursor-pointer select-none" onClick={toggleTempoSort}>
                <div className="flex items-center gap-1">
                  Tempo
                  {tempoSort === 'desc' ? <ArrowDown className="w-3 h-3" /> : tempoSort === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                </div>
              </th>
              <th className="py-2 px-2">Concessionária</th>
              <th className="py-2 px-2">Marca Inv.</th>
              <th className="py-2 px-2">Pot. Inv.</th>
              <th className="py-2 px-2">Qtd Placas</th>
              <th className="py-2 px-2">Marca Placa</th>
              <th className="py-2 px-2">Pot. Placa</th>
              <th className="py-2 px-2">KWp</th>
              <th className="py-2 px-2">Instalador</th>
              <th className="py-2 px-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const days = daysSince(p.data_fechamento);
              const clientName = p.nome_completo || p.razao_social || '—';
              return (
                <tr key={p.id} className={`border-b border-border/50 hover:bg-muted/30 ${p.congelado ? 'opacity-60' : ''}`}>
                  <td className="py-2 px-2 font-medium max-w-[180px] truncate">
                    {p.congelado && <span className="mr-1" title="Congelada">❄️</span>}
                    {clientName}
                  </td>
                  <td className="py-2 px-2 text-xs"><WhatsAppLink phone={p.telefone} /></td>
                  <td className={`py-2 px-2 text-xs font-medium ${days > 60 ? 'text-destructive' : ''}`}>
                    {p.data_fechamento ? `${days}d` : '—'}
                  </td>
                  <td className="py-2 px-2 text-xs">{p.concessionaria}</td>
                  <td className="py-2 px-2 text-xs">{p.marca_inversor || '—'}</td>
                  <td className="py-2 px-2 text-xs">{p.potencia_inversor || '—'}</td>
                  <td className="py-2 px-2 text-xs">{p.qtd_placas || '—'}</td>
                  <td className="py-2 px-2 text-xs">{p.marca_placa || '—'}</td>
                  <td className="py-2 px-2 text-xs">{p.potencia_placa || '—'}</td>
                  <td className="py-2 px-2 text-xs font-medium">{calcKwp(p.qtd_placas, p.potencia_placa)}</td>
                  <td className="py-2 px-2">
                    <InstaladorSelect projetoId={p.id} currentValue={p.instalador} onDone={onRefresh} />
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex gap-1 items-center">
                      <button onClick={() => onEdit(p.id)} className="text-primary hover:text-primary/80" title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => onDocumentos(p)} className="text-blue-600 hover:text-blue-500" title="Documentos">
                        <FileText className="w-4 h-4" />
                      </button>
                      <button onClick={() => setCongelarId(p.congelado ? null : p.id)} className="text-blue-400 hover:text-blue-600" title={p.congelado ? 'Já congelada' : 'Congelar'}>
                        <Snowflake className="w-4 h-4" />
                      </button>
                      <button onClick={() => setLayoutProjeto(p)} className={`${p.layout_url ? 'text-green-600' : 'text-muted-foreground'} hover:text-primary`} title="Layout">
                        <ImageIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => setConcluidaProjeto(p)} className="text-green-600 hover:text-green-500" title="Obra Concluída">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={12} className="py-8 text-center text-muted-foreground">Nenhum projeto encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {congelarId && <CongelarModal projetoId={congelarId} onClose={() => setCongelarId(null)} onDone={onRefresh} />}
      {layoutProjeto && <LayoutUploadModal projetoId={layoutProjeto.id} currentUrl={layoutProjeto.layout_url} onClose={() => setLayoutProjeto(null)} onDone={onRefresh} />}
      {concluidaProjeto && <ObraConcluidaModal projetoId={concluidaProjeto.id} currentInstalador={concluidaProjeto.instalador} onClose={() => setConcluidaProjeto(null)} onDone={onRefresh} />}
    </div>
  );
}
