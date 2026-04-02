import React, { useState, useMemo } from 'react';
import type { Projeto } from '@/pages/GestorPage';
import { Edit2, FileText, AlertTriangle, Snowflake, Image as ImageIcon, CheckCircle } from 'lucide-react';
import WhatsAppLink from './WhatsAppLink';
import InstaladorSelect from './InstaladorSelect';
import CongelarModal from './CongelarModal';
import ObraConcluidaModal from './ObraConcluidaModal';
import LayoutUploadModal from './LayoutUploadModal';

const STATUS_LIST = ['Vendido', 'Equipamento Comprado', 'Entregue', 'Em Instalação', 'Instalado', 'Projeto Submetido', 'Homologado'];
const STATUS_COLORS: Record<string, string> = {
  'Vendido': 'bg-amber-100 text-amber-800',
  'Equipamento Comprado': 'bg-blue-100 text-blue-800',
  'Entregue': 'bg-cyan-100 text-cyan-800',
  'Em Instalação': 'bg-orange-100 text-orange-800',
  'Instalado': 'bg-green-100 text-green-800',
  'Projeto Submetido': 'bg-purple-100 text-purple-800',
  'Homologado': 'bg-emerald-100 text-emerald-800',
};

function daysSince(dateStr?: string): number {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

export default function ProjetosList({ projetos, loading, onEdit, onDocumentos, onRefresh }: {
  projetos: Projeto[];
  loading: boolean;
  onEdit: (id: string) => void;
  onDocumentos: (p: Projeto) => void;
  onRefresh: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState('');
  const [concFilter, setConcFilter] = useState('');
  const [search, setSearch] = useState('');
  const [congelarId, setCongelarId] = useState<string | null>(null);
  const [layoutProjeto, setLayoutProjeto] = useState<Projeto | null>(null);
  const [concluidaProjeto, setConcluidaProjeto] = useState<Projeto | null>(null);

  const filtered = useMemo(() => {
    return projetos.filter(p => {
      if (statusFilter && p.status !== statusFilter) return false;
      if (concFilter && p.concessionaria !== concFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = (p.nome_completo || p.razao_social || '').toLowerCase();
        if (!name.includes(q)) return false;
      }
      return true;
    });
  }, [projetos, statusFilter, concFilter, search]);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="solar-card p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input className="solar-input max-w-xs" placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="solar-input max-w-[180px]" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Todos os status</option>
          {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="solar-input max-w-[180px]" value={concFilter} onChange={e => setConcFilter(e.target.value)}>
          <option value="">Todas concessionárias</option>
          {['ELEKTRO', 'ENERGISA', 'COPEL', 'OUTRA'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} projeto(s)</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 px-2">Cliente</th>
              <th className="py-2 px-2">Telefone</th>
              <th className="py-2 px-2">Tempo</th>
              <th className="py-2 px-2">Concessionária</th>
              <th className="py-2 px-2">Status</th>
              <th className="py-2 px-2">Instalador</th>
              <th className="py-2 px-2">Entrega</th>
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
                  <td className="py-2 px-2">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status] || 'bg-muted text-muted-foreground'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <InstaladorSelect projetoId={p.id} currentValue={p.instalador} onDone={onRefresh} />
                  </td>
                  <td className="py-2 px-2 text-xs">
                    {['Entregue', 'Em Instalação', 'Instalado', 'Projeto Submetido', 'Homologado'].includes(p.status)
                      ? `Sim (${p.local_entrega || '—'})` : 'Não'}
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
                      {p.objecoes && p.objecoes.trim() && (
                        <span title={p.objecoes}><AlertTriangle className="w-4 h-4 text-amber-500" /></span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">Nenhum projeto encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {congelarId && <CongelarModal projetoId={congelarId} onClose={() => setCongelarId(null)} onDone={onRefresh} />}
      {layoutProjeto && <LayoutUploadModal projetoId={layoutProjeto.id} currentUrl={layoutProjeto.layout_url} onClose={() => setLayoutProjeto(null)} onDone={onRefresh} />}
    </div>
  );
}
