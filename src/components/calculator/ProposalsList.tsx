import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Edit2, Eye, FileText, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/data/calculations';
import { getPropostasDB } from '@/data/supabaseStore';
import { LINE_NAMES } from '@/data/types';
import { propostaToProjetoPrefill } from '@/lib/propostaToProjeto';
import { Button } from '@/components/ui/button';

export default function ProposalsList() {
  const [proposals, setProposals] = useState<any[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(true);
  const navigate = useNavigate();
  const { profile, session } = useAuth();

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterLine, setFilterLine] = useState('');
  const [filterSeller, setFilterSeller] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadProposals = useCallback(async () => {
    setLoadingProposals(true);
    const data = await getPropostasDB();
    let list = data;
    // Vendedor: only own proposals
    if (profile?.role === 'vendedor' && profile?.nome) {
      list = list.filter(p => p.clientData?.seller === profile.nome);
    }
    setProposals(list);
    setLoadingProposals(false);
  }, [profile]);

  useEffect(() => { loadProposals(); }, [loadProposals]);

  const STATUS_LABELS: Record<string, string> = {
    enviada: 'Enviada', visualizada: 'Visualizada', aprovada: 'Aprovada',
    financiamento: 'Financiamento', fechada: 'Fechada', arquivada: 'Arquivada',
    em_negociacao: 'Em negociação',
  };
  const STATUS_COLORS: Record<string, string> = {
    enviada: 'bg-blue-100 text-blue-800', visualizada: 'bg-amber-100 text-amber-800',
    aprovada: 'bg-green-100 text-green-800', financiamento: 'bg-purple-100 text-purple-800',
    fechada: 'bg-primary/10 text-primary', arquivada: 'bg-muted text-muted-foreground',
    em_negociacao: 'bg-orange-100 text-orange-800',
  };

  const filtered = useMemo(() => {
    return proposals.filter(p => {
      if (filterStatus && p.status !== filterStatus) return false;
      const line = p.selectedLine || p.dados_completos?.selectedLine;
      if (filterLine && line !== filterLine) return false;
      if (filterSeller && p.clientData?.seller !== filterSeller) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const name = (p.clientData?.name || '').toLowerCase();
        const num = (p.numero_proposta || '').toLowerCase();
        if (!name.includes(q) && !num.includes(q)) return false;
      }
      if (p.status === 'arquivada' && !filterStatus) return false;
      return true;
    });
  }, [proposals, filterStatus, filterLine, filterSeller, searchQuery]);

  const uniqueSellers = useMemo(() => {
    const sellers = new Set<string>();
    proposals.forEach(p => { if (p.clientData?.seller) sellers.add(p.clientData.seller); });
    return Array.from(sellers);
  }, [proposals]);

  const handleDuplicate = async (id: string) => {
    const { duplicatePropostaDB } = await import('@/data/supabaseStore');
    const newId = await duplicatePropostaDB(id, session?.user?.id || null);
    if (newId) {
      toast.success('Proposta duplicada!');
      loadProposals();
    }
  };

  const handleArchive = async (id: string) => {
    const { updatePropostaStatusDB } = await import('@/data/supabaseStore');
    await updatePropostaStatusDB(id, 'arquivada');
    toast.success('Proposta arquivada');
    loadProposals();
  };

  const handleEditProposal = (p: any) => {
    navigate('/orcamentos', { state: { editProposal: p } });
  };

  const handleCriarObra = (p: any) => {
    navigate('/clientes', { state: { tab: 'projetos', prefillProjeto: propostaToProjetoPrefill(p), propostaId: p.id } });
  };


  return (
    <div className="solar-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-primary">Propostas Geradas</h2>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input className="solar-input text-sm py-1.5 w-48" placeholder="Buscar cliente ou nº..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        <select className="solar-input text-sm py-1.5 w-36" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Todos status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="solar-input text-sm py-1.5 w-36" value={filterLine} onChange={e => setFilterLine(e.target.value)}>
          <option value="">Todos os tipos</option>
          {Object.entries(LINE_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="solar-input text-sm py-1.5 w-36" value={filterSeller} onChange={e => setFilterSeller(e.target.value)}>
          <option value="">Todos vendedores</option>
          {uniqueSellers.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loadingProposals ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma proposta encontrada.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 px-2">Nº</th><th className="py-2 px-2">Cliente</th><th className="py-2 px-2">Vendedor</th>
              <th className="py-2 px-2">Data</th><th className="py-2 px-2">Tipo</th><th className="py-2 px-2">Valor</th>
              <th className="py-2 px-2">CET</th><th className="py-2 px-2">Status</th><th className="py-2 px-2">Atualização</th><th className="py-2 px-2">Ações</th>
            </tr></thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-2 px-2 font-mono text-xs text-primary">{p.numero_proposta || '—'}</td>
                  <td className="py-2 px-2 font-medium">{p.clientData?.name || 'Sem nome'}</td>
                  <td className="py-2 px-2 text-xs">{p.clientData?.seller || '—'}</td>
                  <td className="py-2 px-2 text-xs">{new Date(p.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td className="py-2 px-2">
                    <span className="solar-badge bg-primary/10 text-primary text-xs">
                      {LINE_NAMES[p.selectedLine || p.dados_completos?.selectedLine] || p.selectedLine || '—'}
                    </span>
                    {(p.customKit || p.dados_completos?.customKit) && (
                      <span className="solar-badge bg-secondary/20 text-secondary-foreground text-xs ml-1">Pers.</span>
                    )}
                  </td>
                  <td className="py-2 px-2 font-medium text-xs">{formatCurrency(p.totalPrice)}</td>
                  
                  <td className="py-2 px-2"><span className={`solar-badge text-xs ${STATUS_COLORS[p.status] || 'bg-muted text-muted-foreground'}`}>{STATUS_LABELS[p.status] || p.status}</span></td>
                  <td className="py-2 px-2 text-xs text-muted-foreground">{p.dados_completos?.updatedAt ? new Date(p.dados_completos.updatedAt).toLocaleDateString('pt-BR') : '—'}</td>
                  <td className="py-2 px-2">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/proposta/${p.id}`)} className="h-8 w-8 text-primary" title="Visualizar">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEditProposal(p)} className="h-8 w-8 text-primary" title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDuplicate(p.id)} className="h-8 w-8 text-primary" title="Duplicar">
                        <FileText className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleCriarObra(p)} className="h-8 w-8 text-primary" title="Criar obra a partir da proposta">
                        <Building2 className="w-4 h-4" />
                      </Button>

                      <Button variant="ghost" size="icon" onClick={() => handleArchive(p.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Arquivar">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}

