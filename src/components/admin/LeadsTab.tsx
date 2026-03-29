import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Phone, Edit2, UserPlus, Trash2, FileText, Search, X, MessageSquare, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/data/calculations';

interface Lead {
  id: string;
  nome: string;
  telefone: string;
  cidade: string;
  uf: string;
  consumo_kwh: number;
  resultado_placas: number;
  resultado_potencia_kwp: number;
  status: string;
  observacoes: string | null;
  atribuido_para: string | null;
  criado_em: string;
  atualizado_em: string;
}

const STATUS_LABELS: Record<string, string> = {
  novo: 'Novo',
  em_atendimento: 'Em atendimento',
  convertido: 'Convertido',
  descartado: 'Descartado',
};

const STATUS_COLORS: Record<string, string> = {
  novo: 'bg-blue-100 text-blue-800',
  em_atendimento: 'bg-amber-100 text-amber-800',
  convertido: 'bg-green-100 text-green-800',
  descartado: 'bg-muted text-muted-foreground',
};

export default function LeadsTab() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<{ user_id: string; nome: string }[]>([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterSeller, setFilterSeller] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editObs, setEditObs] = useState('');
  const [editAtribuido, setEditAtribuido] = useState('');
  const navigate = useNavigate();

  const loadLeads = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('leads').select('*').order('criado_em', { ascending: false });
    setLeads((data || []) as Lead[]);
    setLoading(false);
  }, []);

  const loadUsers = useCallback(async () => {
    const { data } = await supabase.from('user_profiles').select('user_id, nome').eq('ativo', true).order('nome');
    setUsers(data || []);
  }, []);

  useEffect(() => { loadLeads(); loadUsers(); }, [loadLeads, loadUsers]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('leads-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        loadLeads();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadLeads]);

  const filtered = useMemo(() => {
    return leads.filter(l => {
      if (filterStatus && l.status !== filterStatus) return false;
      if (filterCity && l.cidade !== filterCity) return false;
      if (filterSeller && l.atribuido_para !== filterSeller) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!l.nome.toLowerCase().includes(q) && !l.telefone.includes(q)) return false;
      }
      return true;
    });
  }, [leads, filterStatus, filterCity, filterSeller, searchQuery]);

  const stats = useMemo(() => {
    const total = leads.length;
    const novos = leads.filter(l => l.status === 'novo').length;
    const atendimento = leads.filter(l => l.status === 'em_atendimento').length;
    const convertidos = leads.filter(l => l.status === 'convertido').length;
    const taxa = total > 0 ? ((convertidos / total) * 100).toFixed(1) : '0';
    return { total, novos, atendimento, convertidos, taxa };
  }, [leads]);

  const uniqueCities = useMemo(() => [...new Set(leads.map(l => l.cidade))].sort(), [leads]);

  const handleWhatsApp = (telefone: string, nome: string) => {
    const phone = telefone.replace(/\D/g, '');
    const fullPhone = phone.length <= 11 ? `55${phone}` : phone;
    window.open(`https://wa.me/${fullPhone}?text=Olá ${nome}, tudo bem? Vi que você fez uma simulação solar no nosso site!`, '_blank');
  };

  const handleUpdateLead = async () => {
    if (!editLead) return;
    await supabase.from('leads').update({
      status: editStatus,
      observacoes: editObs || null,
      atribuido_para: editAtribuido || null,
    }).eq('id', editLead.id);
    toast.success('Lead atualizado!');
    setEditLead(null);
    loadLeads();
  };

  const handleDiscard = async (id: string) => {
    if (!confirm('Descartar este lead?')) return;
    await supabase.from('leads').update({ status: 'descartado' }).eq('id', id);
    toast.success('Lead descartado');
    loadLeads();
  };

  const handleConvert = (lead: Lead) => {
    navigate('/orcamentos', {
      state: {
        prefillLead: {
          name: lead.nome,
          city: lead.cidade,
          state: lead.uf,
          avgKwh: lead.consumo_kwh,
        },
      },
    });
  };

  const handleAssign = async (leadId: string, userId: string) => {
    await supabase.from('leads').update({
      atribuido_para: userId || null,
      status: userId ? 'em_atendimento' : 'novo',
    }).eq('id', leadId);
    toast.success('Lead atribuído!');
    loadLeads();
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return '—';
    return users.find(u => u.user_id === userId)?.nome || '—';
  };

  return (
    <div className="solar-card p-6 space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total" value={stats.total} color="text-foreground" />
        <StatCard label="Novos" value={stats.novos} color="text-blue-600" highlight />
        <StatCard label="Em atendimento" value={stats.atendimento} color="text-amber-600" />
        <StatCard label="Convertidos" value={stats.convertidos} color="text-green-600" />
        <StatCard label="Taxa conversão" value={`${stats.taxa}%`} color="text-primary" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input className="solar-input text-sm py-1.5 pl-9 w-full" placeholder="Buscar nome ou telefone..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <select className="solar-input text-sm py-1.5 w-36" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Todos status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="solar-input text-sm py-1.5 w-36" value={filterCity} onChange={e => setFilterCity(e.target.value)}>
          <option value="">Todas cidades</option>
          {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="solar-input text-sm py-1.5 w-40" value={filterSeller} onChange={e => setFilterSeller(e.target.value)}>
          <option value="">Todos vendedores</option>
          {users.map(u => <option key={u.user_id} value={u.user_id}>{u.nome}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Nenhum lead encontrado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 px-2">Data/hora</th>
                <th className="py-2 px-2">Nome</th>
                <th className="py-2 px-2">Telefone</th>
                <th className="py-2 px-2">Cidade</th>
                <th className="py-2 px-2">Consumo</th>
                <th className="py-2 px-2">Placas</th>
                <th className="py-2 px-2">Status</th>
                <th className="py-2 px-2">Atribuído</th>
                <th className="py-2 px-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id} className={`border-b border-border/50 hover:bg-muted/30 ${l.status === 'novo' ? 'bg-blue-50/50' : ''}`}>
                  <td className="py-2 px-2 text-xs">{new Date(l.criado_em).toLocaleString('pt-BR')}</td>
                  <td className="py-2 px-2 font-medium">{l.nome}</td>
                  <td className="py-2 px-2">
                    <button onClick={() => handleWhatsApp(l.telefone, l.nome)} className="text-green-600 hover:underline flex items-center gap-1">
                      <Phone className="w-3 h-3" />{l.telefone}
                    </button>
                  </td>
                  <td className="py-2 px-2 text-xs">{l.cidade}/{l.uf}</td>
                  <td className="py-2 px-2 text-xs">{l.consumo_kwh} kWh</td>
                  <td className="py-2 px-2 text-xs">{l.resultado_placas} placas</td>
                  <td className="py-2 px-2">
                    <span className={`solar-badge text-xs ${STATUS_COLORS[l.status] || 'bg-muted text-muted-foreground'}`}>
                      {STATUS_LABELS[l.status] || l.status}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-xs">{getUserName(l.atribuido_para)}</td>
                  <td className="py-2 px-2">
                    <div className="flex gap-1">
                      <button onClick={() => handleWhatsApp(l.telefone, l.nome)} className="text-green-600 hover:text-green-500" title="WhatsApp">
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setEditLead(l); setEditStatus(l.status); setEditObs(l.observacoes || ''); setEditAtribuido(l.atribuido_para || ''); }}
                        className="text-primary hover:text-primary/80" title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleConvert(l)} className="text-blue-600 hover:text-blue-500" title="Converter em proposta">
                        <FileText className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDiscard(l.id)} className="text-muted-foreground hover:text-destructive" title="Descartar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editLead && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setEditLead(null)}>
          <div className="bg-card rounded-xl p-6 max-w-md w-full mx-4 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-primary">Editar Lead</h3>
              <button onClick={() => setEditLead(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="text-sm space-y-1 p-3 rounded-lg bg-muted">
              <p><strong>{editLead.nome}</strong></p>
              <p>{editLead.telefone} — {editLead.cidade}/{editLead.uf}</p>
              <p>{editLead.consumo_kwh} kWh/mês — {editLead.resultado_placas} placas</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select className="solar-input" value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Atribuir para</label>
                <select className="solar-input" value={editAtribuido} onChange={e => setEditAtribuido(e.target.value)}>
                  <option value="">Nenhum</option>
                  {users.map(u => <option key={u.user_id} value={u.user_id}>{u.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Observações</label>
                <textarea className="solar-input" rows={3} value={editObs} onChange={e => setEditObs(e.target.value)} />
              </div>
              <button className="w-full solar-btn-primary" onClick={handleUpdateLead}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, highlight }: { label: string; value: number | string; color: string; highlight?: boolean }) {
  return (
    <div className={`p-3 rounded-xl text-center ${highlight ? 'bg-blue-50 border border-blue-200' : 'bg-muted'}`}>
      <div className={`text-2xl font-black ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
