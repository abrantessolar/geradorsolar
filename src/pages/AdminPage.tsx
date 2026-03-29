import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  getSettings, saveSettings, getKits, saveKits, getProposals,
  getSocialProofs, saveSocialProofs,
  getPriceTable, savePriceTable,
} from '@/data/store';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  saveSettingsDB, saveVendedoresDB, savePriceTableDB, saveSocialProofsDB,
  saveDistribuidorasDB, importCidadesIrradianciaDB, getPropostasDB,
} from '@/data/supabaseStore';
import { formatCurrency } from '@/data/calculations';
import { AdminSettings, Seller, IrradiationEntry, PriceTableEntry, SocialProof, BRAZILIAN_STATES, CA_MATERIAL_TABLE_DEFAULT, LINE_NAMES } from '@/data/types';
import type { Distributor, PriceTableLineDetails } from '@/data/types';
import { Users, DollarSign, Settings, MapPin, Building2, FileText, Image, Plus, Trash2, Save, Eye, Wand2, AlertCircle, Upload, Check, ChevronDown, UserPlus, Edit2, X, Globe, CheckCircle, AlertTriangle, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import SiteContentTab from '@/components/admin/SiteContentTab';
import { useNavigate } from 'react-router-dom';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  orcamentista: 'Orçamentista',
  vendedor: 'Vendedor',
};

export default function AdminPage() {
  const { isAdmin, isOrcamentista, profile } = useAuth();

  const adminTabs = [
    { key: 'users' as const, label: 'Usuários', icon: Users, roles: ['admin'] },
    { key: 'prices' as const, label: 'Tabela de Preços', icon: DollarSign, roles: ['admin'] },
    { key: 'pricing' as const, label: 'Precificação', icon: Settings, roles: ['admin'] },
    { key: 'irradiation' as const, label: 'Irradiação', icon: MapPin, roles: ['admin', 'orcamentista'] },
    { key: 'company' as const, label: 'Empresa', icon: Building2, roles: ['admin', 'orcamentista'] },
    { key: 'proposals' as const, label: 'Propostas', icon: FileText, roles: ['admin', 'orcamentista', 'vendedor'] },
    { key: 'social' as const, label: 'Provas Sociais', icon: Image, roles: ['admin'] },
    { key: 'site_content' as const, label: 'Conteúdo do Site', icon: Globe, roles: ['admin'] },
  ];

  const visibleTabs = adminTabs.filter(t => t.roles.includes(profile?.role || ''));
  const [tab, setTab] = useState(visibleTabs[0]?.key || 'proposals');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Painel Administrativo</h1>
      </div>

      <div className="flex gap-2 flex-wrap">
        {visibleTabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'users' && isAdmin && <UsersTab />}
      {tab === 'prices' && <PriceTableTab />}
      {tab === 'pricing' && <PricingTab />}
      {tab === 'irradiation' && <IrradiationTab />}
      {tab === 'company' && <CompanyTab />}
      {tab === 'proposals' && <ProposalsTab />}
      {tab === 'social' && <SocialTab />}
      {tab === 'site_content' && <SiteContentTab />}
    </div>
  );
}

/* ─── USUÁRIOS ─── */
function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', role: 'vendedor', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const { session } = useAuth();

  const callApi = async (body: any) => {
    const res = await supabase.functions.invoke('manage-users', {
      body,
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    return res;
  };

  const loadUsers = async () => {
    setLoading(true);
    const { data } = await callApi({ action: 'list' });
    setUsers(data?.users || []);
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const handleCreate = async () => {
    setError('');
    if (!form.nome || !form.email || !form.password) { setError('Preencha todos os campos.'); return; }
    if (form.password.length < 6) { setError('Senha deve ter pelo menos 6 caracteres.'); return; }
    if (form.password !== form.confirmPassword) { setError('As senhas não coincidem.'); return; }
    setSaving(true);
    const { data, error: err } = await callApi({ action: 'create', ...form });
    if (err || data?.error) { setError(data?.error || 'Erro ao criar usuário.'); setSaving(false); return; }
    setShowCreate(false);
    setForm({ nome: '', email: '', telefone: '', role: 'vendedor', password: '', confirmPassword: '' });
    setSaving(false);
    loadUsers();
  };

  const handleUpdate = async (userId: string, updates: any) => {
    await callApi({ action: 'update', user_id: userId, ...updates });
    loadUsers();
  };

  

  return (
    <div className="solar-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-primary">Gestão de Usuários</h2>
        <button onClick={() => setShowCreate(true)} className="solar-btn-primary text-sm py-2 px-3 flex items-center gap-1">
          <UserPlus className="w-4 h-4" /> Novo usuário
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setShowCreate(false)}>
          <div className="bg-card rounded-xl p-6 max-w-md w-full mx-4 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-primary">Novo Usuário</h3>
              <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            {error && <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}
            <div className="space-y-3">
              <div><label className="block text-sm font-medium mb-1">Nome completo</label>
                <input className="solar-input" value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} /></div>
             <div><label className="block text-sm font-medium mb-1">E-mail</label>
                <input className="solar-input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
              <div><label className="block text-sm font-medium mb-1">Telefone/WhatsApp</label>
                <input className="solar-input" value={form.telefone} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))} placeholder="(XX) XXXXX-XXXX" /></div>
              <div><label className="block text-sm font-medium mb-1">Nível de permissão</label>
                <select className="solar-input" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                  <option value="vendedor">Vendedor</option>
                  <option value="orcamentista">Orçamentista</option>
                  <option value="admin">Administrador</option>
                </select></div>
              <div><label className="block text-sm font-medium mb-1">Senha</label>
                <input className="solar-input" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} /></div>
              <div><label className="block text-sm font-medium mb-1">Confirmar senha</label>
                <input className="solar-input" type="password" value={form.confirmPassword} onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))} /></div>
              <button className="w-full solar-btn-primary" onClick={handleCreate} disabled={saving}>
                {saving ? 'Criando...' : 'Criar Usuário'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 px-2">Nome</th>
                <th className="py-2 px-2">E-mail</th>
                <th className="py-2 px-2">Nível</th>
                <th className="py-2 px-2">Status</th>
                <th className="py-2 px-2">Último acesso</th>
                <th className="py-2 px-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.user_id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-2 px-2 font-medium">{u.nome}</td>
                  <td className="py-2 px-2">{u.email}</td>
                  <td className="py-2 px-2">
                    <span className={`solar-badge text-xs ${u.role === 'admin' ? 'bg-primary/10 text-primary' : u.role === 'orcamentista' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <span className={`solar-badge text-xs ${u.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-xs text-muted-foreground">
                    {u.ultimo_acesso ? new Date(u.ultimo_acesso).toLocaleString('pt-BR') : 'Nunca'}
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex gap-1">
                      <button onClick={() => setEditUser(u)} className="text-primary hover:text-primary/80" title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleUpdate(u.user_id, { ativo: !u.ativo })}
                        className={`text-xs px-2 py-1 rounded ${u.ativo ? 'text-destructive hover:bg-destructive/10' : 'text-green-700 hover:bg-green-50'}`}>
                        {u.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                      <button onClick={async () => {
                        if (confirm(`Excluir ${u.nome}? Esta ação não pode ser desfeita.`)) {
                          await callApi({ action: 'delete', user_id: u.user_id });
                          loadUsers();
                        }
                      }} className="text-destructive/60 hover:text-destructive" title="Excluir">
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

      {/* Edit modal */}
      {editUser && (
        <EditUserModal user={editUser} onClose={() => { setEditUser(null); loadUsers(); }} callApi={callApi} />
      )}
    </div>
  );
}

function EditUserModal({ user, onClose, callApi }: { user: any; onClose: () => void; callApi: (body: any) => Promise<any> }) {
  const [nome, setNome] = useState(user.nome);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    const updates: any = { nome, role };
    if (email !== user.email) updates.email = email;
    if (password) updates.password = password;
    const { data, error: err } = await callApi({ action: 'update', user_id: user.user_id, ...updates });
    if (err || data?.error) {
      setError(data?.error || 'Erro ao atualizar.');
      setSaving(false);
      return;
    }
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-card rounded-xl p-6 max-w-md w-full mx-4 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-primary">Editar Usuário</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        {error && <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}
        <div className="space-y-3">
          <div><label className="block text-sm font-medium mb-1">Nome</label>
            <input className="solar-input" value={nome} onChange={e => setNome(e.target.value)} /></div>
          <div><label className="block text-sm font-medium mb-1">E-mail</label>
            <input className="solar-input" type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div><label className="block text-sm font-medium mb-1">Nível</label>
            <select className="solar-input" value={role} onChange={e => setRole(e.target.value)}>
              <option value="vendedor">Vendedor</option>
              <option value="orcamentista">Orçamentista</option>
              <option value="admin">Administrador</option>
            </select></div>
          <div><label className="block text-sm font-medium mb-1">Nova senha (deixe vazio para manter)</label>
            <input className="solar-input" type="password" value={password} onChange={e => setPassword(e.target.value)} /></div>
          <button className="w-full solar-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── VENDEDORES ─── */
function SellersTab() {
  const [settings, setSettings] = useState(getSettings());
  const sellers = settings.sellers;

  const update = (idx: number, field: keyof Seller, value: any) => {
    const updated = [...sellers];
    updated[idx] = { ...updated[idx], [field]: value };
    setSettings(prev => ({ ...prev, sellers: updated }));
  };

  const add = () => {
    const newSeller: Seller = { id: Date.now().toString(), name: '', phone: '', email: '', active: true };
    setSettings(prev => ({ ...prev, sellers: [...prev.sellers, newSeller] }));
  };

  const remove = (idx: number) => {
    setSettings(prev => ({ ...prev, sellers: prev.sellers.filter((_, i) => i !== idx) }));
  };

  const handleSave = () => { saveSettings(settings); saveSettingsDB(settings); saveVendedoresDB(settings.sellers); };

  return (
    <div className="solar-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-primary">Vendedores</h2>
        <div className="flex gap-2">
          <button onClick={add} className="solar-btn-outline text-sm py-2 px-3 flex items-center gap-1"><Plus className="w-4 h-4" /> Novo</button>
          <button onClick={handleSave} className="solar-btn-primary text-sm py-2 px-3 flex items-center gap-1"><Save className="w-4 h-4" /> Salvar</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 px-2">Nome completo</th>
              <th className="py-2 px-2">Telefone</th>
              <th className="py-2 px-2">E-mail</th>
              <th className="py-2 px-2">Ativo</th>
              <th className="py-2 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {sellers.map((s, i) => (
              <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30">
                <td className="py-2 px-2"><input className="solar-input py-1 text-sm" value={s.name} onChange={e => update(i, 'name', e.target.value)} /></td>
                <td className="py-2 px-2"><input className="solar-input py-1 text-sm w-40" value={s.phone} onChange={e => update(i, 'phone', e.target.value)} /></td>
                <td className="py-2 px-2"><input className="solar-input py-1 text-sm w-48" value={s.email || ''} onChange={e => update(i, 'email', e.target.value)} placeholder="email@exemplo.com" /></td>
                <td className="py-2 px-2"><input type="checkbox" checked={s.active} onChange={e => update(i, 'active', e.target.checked)} className="accent-primary" /></td>
                <td className="py-2 px-2"><button onClick={() => remove(i)} className="text-destructive hover:text-destructive/80"><Trash2 className="w-4 h-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── TABELA DE PREÇOS ─── */
function PriceTableTab() {
  const stored = getPriceTable();
  const initial: PriceTableEntry[] = stored.length > 0 ? stored.map(r => ({ ...r, essencial: (r as any).essencial ?? null })) :
    Array.from({ length: 97 }, (_, i) => ({
      panels: i + 4,
      acesso: null,
      essencial: null,
      excellence: null,
      premium: null,
      estimated: {},
      details: {},
    }));
  const [table, setTable] = useState<PriceTableEntry[]>(initial);
  const [bulkFillCol, setBulkFillCol] = useState<string | null>(null);
  const [bulkFillValue, setBulkFillValue] = useState('');
  const [showSaveWarning, setShowSaveWarning] = useState(false);

  // Keyboard navigation state
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);
  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const setCellRef = useCallback((row: number, col: number, el: HTMLInputElement | null) => {
    const key = `${row}-${col}`;
    if (el) cellRefs.current.set(key, el);
    else cellRefs.current.delete(key);
  }, []);

  const LINES_ARR = [
    { key: 'essencial' as const, name: LINE_NAMES.essencial },
    { key: 'excellence' as const, name: LINE_NAMES.excellence },
    { key: 'premium' as const, name: LINE_NAMES.premium },
  ];

  const DETAIL_COLS: { key: keyof PriceTableLineDetails; label: string; short: string }[] = [
    { key: 'inverterBrand', label: 'Marca Inv.', short: 'M.Inv' },
    { key: 'inverterPower', label: 'Pot. Inv.', short: 'P.Inv' },
    { key: 'panelBrand', label: 'Marca Placa', short: 'M.Plc' },
    { key: 'panelPower', label: 'Pot. Placa', short: 'P.Plc' },
  ];

  // Total columns per line: 1 cost + 4 detail = 5; total cols = 5 * 3 = 15
  const TOTAL_COLS = LINES_ARR.length * 5;

  const focusCell = (row: number, col: number) => {
    const maxRow = table.length - 1;
    const clampedRow = Math.max(0, Math.min(row, maxRow));
    const clampedCol = Math.max(0, Math.min(col, TOTAL_COLS - 1));
    setActiveCell({ row: clampedRow, col: clampedCol });
    const el = cellRefs.current.get(`${clampedRow}-${clampedCol}`);
    if (el) { el.focus(); el.select(); }
  };

  const handleCellKeyDown = (e: React.KeyboardEvent, row: number, col: number) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); focusCell(row, col + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); focusCell(row, col - 1); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); focusCell(row + 1, col); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focusCell(row - 1, col); }
    else if (e.key === 'Enter') { e.preventDefault(); focusCell(row + 1, col); }
    else if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); focusCell(row, col + 1); }
    else if (e.key === 'Tab' && e.shiftKey) { e.preventDefault(); focusCell(row, col - 1); }
    else if (e.key === 'Escape') { e.preventDefault(); (e.target as HTMLInputElement).blur(); setActiveCell(null); }
  };

  // 1.5x validation helper
  const getValidation = (row: PriceTableEntry, lineKey: string) => {
    const details = (row.details as any)?.[lineKey] as PriceTableLineDetails | undefined;
    const inverterPowerStr = details?.inverterPower;
    const panelPowerStr = details?.panelPower;
    if (!inverterPowerStr || !panelPowerStr) return null;
    const inverterKw = parseFloat(inverterPowerStr);
    const panelWp = parseFloat(panelPowerStr);
    if (isNaN(inverterKw) || isNaN(panelWp) || inverterKw <= 0 || panelWp <= 0) return null;
    if (lineKey === 'premium') return null; // micro inverters don't apply
    const panelKwp = panelWp / 1000;
    const totalPanelKwp = row.panels * panelKwp;
    const limit = inverterKw * 1.5;
    const margin = limit - totalPanelKwp;
    return { totalPanelKwp, limit, margin, valid: totalPanelKwp <= limit, inverterKw };
  };

  const hasAnyViolation = table.some(row =>
    LINES_ARR.some(line => {
      const v = getValidation(row, line.key);
      return v && !v.valid;
    })
  );

  const updateCell = (idx: number, field: 'acesso' | 'essencial' | 'excellence' | 'premium', value: string) => {
    const num = value === '' ? null : parseFloat(value);
    setTable(prev => prev.map((row, i) => i === idx ? {
      ...row,
      [field]: num,
      estimated: { ...row.estimated, [field]: false },
    } : row));
  };

  const updateDetail = (idx: number, line: string, field: keyof PriceTableLineDetails, value: string) => {
    setTable(prev => prev.map((row, i) => i === idx ? {
      ...row,
      details: {
        ...row.details,
        [line]: { ...(row.details as any)?.[line], [field]: value },
      },
    } : row));
  };

  const applyBulkFill = () => {
    if (!bulkFillCol) return;
    const parts = bulkFillCol.split('.');
    if (parts.length === 1) {
      const line = parts[0] as 'acesso' | 'excellence' | 'premium';
      const num = parseFloat(bulkFillValue);
      if (!isNaN(num)) {
        setTable(prev => prev.map(row => ({ ...row, [line]: row[line] ?? num })));
      }
    } else {
      const [line, field] = parts;
      setTable(prev => prev.map(row => ({
        ...row,
        details: {
          ...row.details,
          [line]: { ...(row.details as any)?.[line], [field]: bulkFillValue },
        },
      })));
    }
    setBulkFillCol(null);
    setBulkFillValue('');
  };

  const generateEstimates = () => {
    const lines: ('acesso' | 'essencial' | 'excellence' | 'premium')[] = ['acesso', 'essencial', 'excellence', 'premium'];
    const newTable = [...table.map(r => ({ ...r, estimated: { ...r.estimated } }))];
    lines.forEach(line => {
      const filled = newTable.filter(r => r[line] !== null && r[line]! > 0).map(r => ({ panels: r.panels, value: r[line]! }));
      if (filled.length < 2) return;
      const increments: number[] = [];
      for (let i = 1; i < filled.length; i++) {
        increments.push((filled[i].value - filled[i - 1].value) / (filled[i].panels - filled[i - 1].panels));
      }
      const avgInc = increments.reduce((a, b) => a + b, 0) / increments.length;
      newTable.forEach((row, idx) => {
        if (row[line] !== null) return;
        const before = filled.filter(f => f.panels < row.panels).pop();
        const after = filled.find(f => f.panels > row.panels);
        let estimated: number | undefined;
        if (before && after) {
          const range = after.panels - before.panels;
          const pos = row.panels - before.panels;
          estimated = before.value + (after.value - before.value) * (pos / range);
        } else if (before) {
          if (line === 'premium') {
            const microsBefore = Math.ceil(before.panels / 4);
            const microsNow = Math.ceil(row.panels / 4);
            estimated = before.value + (row.panels - before.panels) * avgInc + (microsNow - microsBefore) * 300;
          } else {
            estimated = before.value + (row.panels - before.panels) * avgInc;
          }
        } else if (after) {
          estimated = after.value - (after.panels - row.panels) * avgInc;
        }
        if (estimated !== undefined) {
          newTable[idx] = { ...newTable[idx], [line]: Math.round(estimated), estimated: { ...newTable[idx].estimated, [line]: true } };
        }
      });
    });
    setTable(newTable);
  };

  const handleSave = () => {
    if (hasAnyViolation) {
      setShowSaveWarning(true);
    } else {
      savePriceTable(table);
      savePriceTableDB(table);
    }
  };

  const confirmSave = () => {
    savePriceTable(table);
    savePriceTableDB(table);
    setShowSaveWarning(false);
  };

  const BulkFillButton = ({ colKey }: { colKey: string }) => (
    <button onClick={() => { setBulkFillCol(colKey); setBulkFillValue(''); }}
      className="ml-1 text-xs text-primary hover:text-primary/80" title="Preencher coluna inteira">↓</button>
  );

  return (
    <TooltipProvider>
      <div className="solar-card p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-bold text-primary">Tabela de Preços dos Kits</h2>
          <div className="flex gap-2">
            <button onClick={generateEstimates} className="solar-btn-outline text-sm py-2 px-3 flex items-center gap-1">
              <Wand2 className="w-4 h-4" /> Gerar Estimativas
            </button>
            <button onClick={handleSave} className="solar-btn-primary text-sm py-2 px-3 flex items-center gap-1">
              <Save className="w-4 h-4" /> Salvar tabela
            </button>
          </div>
        </div>

        {/* Save warning modal */}
        {showSaveWarning && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setShowSaveWarning(false)}>
            <div className="bg-card rounded-xl p-6 max-w-md w-full mx-4 space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2 text-amber-500">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-lg font-bold">Atenção — Limite 1,5x ultrapassado</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Algumas combinações na tabela ultrapassam o limite técnico de 1,5x da potência do inversor.
                Deseja salvar mesmo assim?
              </p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowSaveWarning(false)} className="solar-btn-outline text-sm py-2">Cancelar</button>
                <button onClick={confirmSave} className="solar-btn-primary text-sm py-2">Salvar mesmo assim</button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk fill modal */}
        {bulkFillCol && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setBulkFillCol(null)}>
            <div className="bg-card rounded-xl p-6 max-w-sm w-full mx-4 space-y-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-primary">Preencher coluna inteira</h3>
              <p className="text-sm text-muted-foreground">
                Todas as células da coluna serão preenchidas com este valor. Células com valores existentes serão substituídas.
              </p>
              <input className="solar-input" value={bulkFillValue} onChange={e => setBulkFillValue(e.target.value)}
                placeholder="Digite o valor" autoFocus onKeyDown={e => { if (e.key === 'Enter') applyBulkFill(); }} />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setBulkFillCol(null)} className="solar-btn-outline text-sm py-2">Cancelar</button>
                <button onClick={applyBulkFill} className="solar-btn-primary text-sm py-2">Aplicar</button>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Use as setas do teclado para navegar entre células. Enter avança para baixo, Tab avança para a direita, Esc cancela.
        </p>

        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 px-1 w-14" rowSpan={2}>Nº</th>
                <th className="py-2 px-1 w-8" rowSpan={2}>✓</th>
                {LINES_ARR.map(line => (
                  <th key={line.key} className="py-1 px-1 text-center border-l border-border/50" colSpan={5}>
                    {line.name}
                  </th>
                ))}
              </tr>
              <tr className="border-b border-border text-muted-foreground text-[10px]">
                {LINES_ARR.map(line => (
                  <React.Fragment key={`head-${line.key}`}>
                    <th className="py-1 px-1 border-l border-border/50">
                      Custo <BulkFillButton colKey={line.key} />
                    </th>
                    {DETAIL_COLS.map(col => (
                      <th key={`${line.key}-${col.key}`} className="py-1 px-1">
                        {col.short} <BulkFillButton colKey={`${line.key}.${col.key}`} />
                      </th>
                    ))}
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.map((row, idx) => {
                // Check validation for each line
                const validations = LINES_ARR.map(line => ({
                  key: line.key,
                  v: getValidation(row, line.key),
                }));
                const hasViolation = validations.some(x => x.v && !x.v.valid);
                const hasValidation = validations.some(x => x.v !== null);
                const allValid = hasValidation && validations.every(x => !x.v || x.v.valid);

                return (
                  <React.Fragment key={row.panels}>
                    <tr className={`border-b border-border/50 hover:bg-muted/30 ${hasViolation ? 'bg-destructive/5' : ''}`}>
                      <td className="py-1 px-1 font-medium text-muted-foreground">{row.panels}</td>
                      <td className="py-1 px-1">
                        {hasViolation ? (
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs text-xs">
                              {validations.filter(x => x.v && !x.v.valid).map(x => (
                                <p key={x.key}>
                                  {LINE_NAMES[x.key]}: Potência das placas ({x.v!.totalPanelKwp.toFixed(2)} kWp) ultrapassa 1,5x do inversor ({x.v!.inverterKw} kW). Máximo: {x.v!.limit.toFixed(2)} kWp
                                </p>
                              ))}
                            </TooltipContent>
                          </Tooltip>
                        ) : allValid ? (
                          <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                        ) : null}
                      </td>
                      {LINES_ARR.map((line, lineIdx) => {
                        const isEstimated = row.estimated?.[line.key];
                        const details = (row.details as any)?.[line.key] as PriceTableLineDetails | undefined;
                        const colBase = lineIdx * 5;
                        return (
                          <React.Fragment key={`${line.key}-${idx}`}>
                            <td className="py-1 px-1 border-l border-border/50">
                              <input
                                ref={el => setCellRef(idx, colBase, el)}
                                className={`solar-input py-0.5 text-xs w-20 ${isEstimated ? 'italic text-muted-foreground' : ''} ${activeCell?.row === idx && activeCell?.col === colBase ? 'ring-2 ring-[#E8B84B]' : ''}`}
                                type="number" value={row[line.key] ?? ''} placeholder="—"
                                onChange={e => updateCell(idx, line.key, e.target.value)}
                                onFocus={() => setActiveCell({ row: idx, col: colBase })}
                                onKeyDown={e => handleCellKeyDown(e, idx, colBase)} />
                            </td>
                            {DETAIL_COLS.map((col, colIdx) => {
                              const c = colBase + 1 + colIdx;
                              return (
                                <td key={`${line.key}-${col.key}-${idx}`} className="py-1 px-1">
                                  <input
                                    ref={el => setCellRef(idx, c, el)}
                                    className={`solar-input py-0.5 text-xs w-20 ${activeCell?.row === idx && activeCell?.col === c ? 'ring-2 ring-[#E8B84B]' : ''}`}
                                    value={details?.[col.key] || ''} placeholder="—"
                                    onChange={e => updateDetail(idx, line.key, col.key, e.target.value)}
                                    onFocus={() => setActiveCell({ row: idx, col: c })}
                                    onKeyDown={e => handleCellKeyDown(e, idx, c)} />
                                </td>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </tr>
                    {/* Validation footer for this row */}
                    {validations.some(x => x.v !== null) && (
                      <tr className="border-b border-border/30">
                        <td colSpan={2 + TOTAL_COLS} className="py-0.5 px-2">
                          <div className="flex flex-wrap gap-4 text-[10px] text-muted-foreground">
                            {validations.filter(x => x.v !== null).map(x => (
                              <span key={x.key} className={!x.v!.valid ? 'text-destructive' : 'text-green-600'}>
                                {LINE_NAMES[x.key]}: {x.v!.totalPanelKwp.toFixed(2)} kWp | Lim: {x.v!.limit.toFixed(2)} kWp | Margem: {x.v!.margin.toFixed(2)} kWp
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </TooltipProvider>
  );
}

/* ─── PRECIFICAÇÃO ─── */
function PricingTab() {
  const [settings, setSettings] = useState(getSettings());
  const update = (field: string, value: any) => setSettings((prev: AdminSettings) => ({ ...prev, [field]: value }));

  const updateCaRow = (idx: number, field: 'maxKw' | 'cost', value: number) => {
    const table = [...settings.caMaterialTable];
    table[idx] = { ...table[idx], [field]: value };
    setSettings(prev => ({ ...prev, caMaterialTable: table }));
  };

  const updateCardRate = (idx: number, rate: number) => {
    const rates = [...settings.creditCardRates];
    rates[idx] = { ...rates[idx], rate };
    setSettings(prev => ({ ...prev, creditCardRates: rates }));
  };

  const handleSave = () => { saveSettings(settings); saveSettingsDB(settings); };
  return (
    <div className="solar-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-primary">Regras de Precificação</h2>
        <button onClick={handleSave} className="solar-btn-primary text-sm py-2 px-3 flex items-center gap-1"><Save className="w-4 h-4" /> Salvar</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-primary">Margem e Taxas</h3>
          <div><label className="block text-sm font-medium mb-1">Margem de lucro (%)</label>
            <input className="solar-input" type="number" value={settings.profitMargin} onChange={e => update('profitMargin', parseFloat(e.target.value) || 0)} /></div>
          <div><label className="block text-sm font-medium mb-1">CET estimada padrão (% a.m.)</label>
            <input className="solar-input" type="number" step="0.001" value={settings.defaultCET} onChange={e => update('defaultCET', parseFloat(e.target.value) || 0)} />
            <p className="text-xs text-muted-foreground mt-1">Padrão: 2,214% a.m.</p></div>
          <div><label className="block text-sm font-medium mb-1">Fator de sobra (%)</label>
            <input className="solar-input" type="number" value={settings.surplusFactor ?? 20} onChange={e => update('surplusFactor', parseFloat(e.target.value) || 0)} />
            <p className="text-xs text-muted-foreground mt-1">Dimensiona o sistema para cobrir {100 + (settings.surplusFactor ?? 20)}% do consumo. Padrão: 20%</p></div>
          <div><label className="block text-sm font-medium mb-1">Perda sistêmica (%)</label>
            <input className="solar-input" type="number" value={settings.systemLoss} onChange={e => update('systemLoss', parseFloat(e.target.value) || 0)} /></div>
        </div>
        <div className="space-y-4">
          <h3 className="font-semibold text-primary">Instalação e Homologação</h3>
          <div><label className="block text-sm font-medium mb-1">Valor por placa (R$)</label>
            <input className="solar-input" type="number" value={settings.installationPricePerPanel} onChange={e => update('installationPricePerPanel', parseFloat(e.target.value) || 0)} /></div>
          <div><label className="block text-sm font-medium mb-1">Homologação (R$)</label>
            <input className="solar-input" type="number" value={settings.homologationPrice} onChange={e => update('homologationPrice', parseFloat(e.target.value) || 0)} /></div>
          <div><label className="block text-sm font-medium mb-1">Cabo tronco {LINE_NAMES.premium} (R$ por micro adicional)</label>
            <input className="solar-input" type="number" value={settings.trunkCablePrice} onChange={e => update('trunkCablePrice', parseFloat(e.target.value) || 0)} /></div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-primary">Material de Instalação CA (por potência do inversor)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 px-2">Até (kW)</th><th className="py-2 px-2">Custo (R$)</th>
            </tr></thead>
            <tbody>
              {settings.caMaterialTable.map((row, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-1 px-2"><input className="solar-input py-1 text-sm w-20" type="number" value={row.maxKw} onChange={e => updateCaRow(i, 'maxKw', parseFloat(e.target.value) || 0)} /></td>
                  <td className="py-1 px-2"><input className="solar-input py-1 text-sm w-28" type="number" value={row.cost} onChange={e => updateCaRow(i, 'cost', parseFloat(e.target.value) || 0)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-primary">Taxas do Cartão de Crédito (1× a 18×)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 px-2">Parcelas</th><th className="py-2 px-2">Taxa (%)</th>
            </tr></thead>
            <tbody>
              {settings.creditCardRates.map((row, i) => (
                <tr key={row.installments} className="border-b border-border/50">
                  <td className="py-1 px-2 font-medium text-muted-foreground">{row.installments}×</td>
                  <td className="py-1 px-2"><input className="solar-input py-1 text-sm w-24" type="number" step="0.1" value={row.rate}
                    onChange={e => updateCardRate(i, parseFloat(e.target.value) || 0)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── IRRADIAÇÃO ─── */
function IrradiationTab() {
  const [importMsg, setImportMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dbCidades, setDbCidades] = useState<any[]>([]);
  const [dbTotal, setDbTotal] = useState(0);
  const [dbPage, setDbPage] = useState(0);
  const [dbSearch, setDbSearch] = useState('');
  const [loadingDb, setLoadingDb] = useState(false);
  const PAGE_SIZE = 50;

  const loadCidades = async (page: number, search: string) => {
    setLoadingDb(true);
    const { listCidadesDB } = await import('@/data/supabaseStore');
    const { data, total } = await listCidadesDB(page, PAGE_SIZE, search);
    setDbCidades(data);
    setDbTotal(total);
    setLoadingDb(false);
  };

  useEffect(() => {
    loadCidades(dbPage, dbSearch);
  }, [dbPage, dbSearch]);

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMsg('Importando...');
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!Array.isArray(data)) throw new Error('Formato inválido');
        await importCidadesIrradianciaDB(data);
        setImportMsg(`${data.length} cidades importadas no banco de dados com sucesso!`);
        loadCidades(0, dbSearch);
        setDbPage(0);
        setTimeout(() => setImportMsg(''), 4000);
      } catch {
        setImportMsg('Erro ao importar arquivo. Verifique o formato JSON.');
        setTimeout(() => setImportMsg(''), 4000);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const totalPages = Math.ceil(dbTotal / PAGE_SIZE);

  return (
    <div className="solar-card p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-primary">Irradiação por Cidade</h2>
        <div className="flex gap-2 flex-wrap">
          <input type="file" accept=".json" ref={fileInputRef} className="hidden" onChange={handleImportJSON} />
          <button onClick={() => fileInputRef.current?.click()} className="solar-btn-outline text-sm py-2 px-3 flex items-center gap-1">
            <Upload className="w-4 h-4" /> Importar base completa (JSON)
          </button>
        </div>
      </div>
      {importMsg && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${importMsg.includes('sucesso') ? 'bg-green-100 text-green-800' : importMsg.includes('Erro') ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
          {importMsg.includes('sucesso') ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {importMsg}
        </div>
      )}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-primary">{dbTotal.toLocaleString()}</span> cidades cadastradas no banco de dados.
        </p>
        <div className="relative w-64">
          <input
            className="solar-input pl-9 text-sm py-2"
            placeholder="Buscar cidade..."
            value={dbSearch}
            onChange={e => { setDbSearch(e.target.value); setDbPage(0); }}
          />
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        </div>
      </div>
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 px-2">UF</th>
              <th className="py-2 px-2">Cidade</th>
              <th className="py-2 px-2">Jan</th><th className="py-2 px-2">Fev</th><th className="py-2 px-2">Mar</th>
              <th className="py-2 px-2">Abr</th><th className="py-2 px-2">Mai</th><th className="py-2 px-2">Jun</th>
              <th className="py-2 px-2">Jul</th><th className="py-2 px-2">Ago</th><th className="py-2 px-2">Set</th>
              <th className="py-2 px-2">Out</th><th className="py-2 px-2">Nov</th><th className="py-2 px-2">Dez</th>
              <th className="py-2 px-2">Média</th>
            </tr>
          </thead>
          <tbody>
            {loadingDb ? (
              <tr><td colSpan={15} className="py-8 text-center text-muted-foreground">Carregando...</td></tr>
            ) : dbCidades.length === 0 ? (
              <tr><td colSpan={15} className="py-8 text-center text-muted-foreground">Nenhuma cidade encontrada.</td></tr>
            ) : dbCidades.map((c) => {
              const vals = [c.jan, c.fev, c.mar, c.abr, c.mai, c.jun, c.jul, c.ago, c.set_, c.out_, c.nov, c.dez].map(Number);
              const avg = (vals.reduce((a, b) => a + b, 0) / 12).toFixed(3);
              return (
                <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-1.5 px-2 font-medium">{c.uf}</td>
                  <td className="py-1.5 px-2">{c.cidade}</td>
                  {vals.map((v, i) => (
                    <td key={i} className="py-1.5 px-2 text-muted-foreground tabular-nums">{v.toFixed(2)}</td>
                  ))}
                  <td className="py-1.5 px-2 font-semibold text-primary tabular-nums">{avg}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">Página {dbPage + 1} de {totalPages}</p>
          <div className="flex gap-2">
            <button disabled={dbPage === 0} onClick={() => setDbPage(p => p - 1)} className="solar-btn-outline text-xs py-1 px-3 disabled:opacity-40">Anterior</button>
            <button disabled={dbPage >= totalPages - 1} onClick={() => setDbPage(p => p + 1)} className="solar-btn-outline text-xs py-1 px-3 disabled:opacity-40">Próxima</button>
          </div>
        </div>
      )}
    </div>
  );
}
/* ─── EMPRESA ─── */
function CompanyTab() {
  const [settings, setSettings] = useState(getSettings());
  const updateCompany = (field: string, value: string) => setSettings(prev => ({ ...prev, company: { ...prev.company, [field]: value } }));
  const update = (field: string, value: any) => setSettings((prev: AdminSettings) => ({ ...prev, [field]: value }));

  const updateDistributor = (idx: number, field: keyof Distributor, value: any) => {
    const dists = [...(settings.distributors || [])];
    dists[idx] = { ...dists[idx], [field]: field === 'kwhPrice' ? (parseFloat(value) || 0) : value };
    setSettings(prev => ({ ...prev, distributors: dists }));
  };

  const addDistributor = () => {
    setSettings(prev => ({ ...prev, distributors: [...(prev.distributors || []), { name: '', kwhPrice: 0.85 }] }));
  };

  const removeDistributor = (idx: number) => {
    setSettings(prev => ({ ...prev, distributors: (prev.distributors || []).filter((_, i) => i !== idx) }));
  };

  const handleSave = () => { saveSettings(settings); saveSettingsDB(settings); saveDistribuidorasDB(settings.distributors || [], settings.defaultDistributor || ''); };

  const COMPANY_FIELDS = [
    { key: 'name', label: 'Nome da empresa' }, { key: 'cnpj', label: 'CNPJ' },
    { key: 'phone', label: 'Telefone' }, { key: 'email', label: 'E-mail' },
    { key: 'site', label: 'Site' }, { key: 'social', label: 'Instagram / Facebook' },
  ];

  return (
    <div className="solar-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-primary">Dados da Empresa</h2>
        <button onClick={handleSave} className="solar-btn-primary text-sm py-2 px-3 flex items-center gap-1"><Save className="w-4 h-4" /> Salvar</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {COMPANY_FIELDS.map(f => (
          <div key={f.key}><label className="block text-sm font-medium mb-1">{f.label}</label>
            <input className="solar-input" value={(settings.company as any)[f.key]} onChange={e => updateCompany(f.key, e.target.value)} /></div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div><label className="block text-sm font-medium mb-1">Validade proposta (dias)</label>
          <input className="solar-input" type="number" value={settings.proposalValidity} onChange={e => update('proposalValidity', parseInt(e.target.value) || 0)} /></div>
        <div><label className="block text-sm font-medium mb-1">Prazo instalação (dias)</label>
          <input className="solar-input" type="number" value={settings.installationDays} onChange={e => update('installationDays', parseInt(e.target.value) || 0)} /></div>
        <div><label className="block text-sm font-medium mb-1">Prazo homologação (dias)</label>
          <input className="solar-input" type="number" value={settings.homologationDays} onChange={e => update('homologationDays', parseInt(e.target.value) || 0)} /></div>
      </div>

      <div className="space-y-4 border-t border-border pt-6">
        <h3 className="font-semibold text-primary">Tarifas por Distribuidora</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 px-2">Distribuidora</th><th className="py-2 px-2">Valor kWh (R$)</th>
              <th className="py-2 px-2">Padrão</th><th className="py-2 px-2"></th>
            </tr></thead>
            <tbody>
              {(settings.distributors || []).map((d, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-2 px-2"><input className="solar-input py-1 text-sm" value={d.name} onChange={e => updateDistributor(i, 'name', e.target.value)} /></td>
                  <td className="py-2 px-2"><input className="solar-input py-1 text-sm w-24" type="number" step="0.01" value={d.kwhPrice} onChange={e => updateDistributor(i, 'kwhPrice', e.target.value)} /></td>
                  <td className="py-2 px-2"><input type="radio" name="defaultDist" checked={settings.defaultDistributor === d.name} onChange={() => setSettings(prev => ({ ...prev, defaultDistributor: d.name }))} className="accent-primary" /></td>
                  <td className="py-2 px-2"><button onClick={() => removeDistributor(i)} className="text-destructive hover:text-destructive/80"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={addDistributor} className="solar-btn-outline text-sm py-2 px-3 flex items-center gap-1"><Plus className="w-4 h-4" /> Nova distribuidora</button>
      </div>
    </div>
  );
}

/* ─── PROPOSTAS ─── */
function ProposalsTab() {
  const [proposals, setProposals] = useState<any[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(true);
  const navigate = useNavigate();
  const { profile, isAdmin, isOrcamentista, session } = useAuth();

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterLine, setFilterLine] = useState('');
  const [filterSeller, setFilterSeller] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [cetModal, setCetModal] = useState<any>(null);
  const [cetValue, setCetValue] = useState('');
  const [cetParcelas, setCetParcelas] = useState(60);

  const loadProposals = useCallback(async () => {
    setLoadingProposals(true);
    const data = await getPropostasDB();
    let list = data.length > 0 ? data : getProposals();
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

  const handleCopyLink = async (id: string) => {
    const url = `${window.location.origin}/proposta/${id}`;
    await navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  const handleDuplicate = async (id: string) => {
    const { duplicatePropostaDB } = await import('@/data/supabaseStore');
    const newId = await duplicatePropostaDB(id, session?.user?.id || null);
    if (newId) {
      toast.success('Proposta duplicada!');
      loadProposals();
    }
  };

  const handleArchive = async (id: string) => {
    const { updatePropostaStatusDB, addHistoricoDB } = await import('@/data/supabaseStore');
    await updatePropostaStatusDB(id, 'arquivada');
    await addHistoricoDB(id, 'arquivada', session?.user?.id || null, {});
    toast.success('Proposta arquivada');
    loadProposals();
  };

  const handleEditProposal = (p: any) => {
    navigate('/orcamentos', { state: { editProposal: p } });
  };

  const handleApplyCet = async () => {
    if (!cetModal) return;
    const cet = parseFloat(cetValue);
    if (!cet || cet <= 0) return;
    const { savePropostaDB, addHistoricoDB } = await import('@/data/supabaseStore');
    const { calcInstallments } = await import('@/data/calculations');
    const updated = {
      ...cetModal,
      cetApplied: cet,
      installmentValues: calcInstallments(cetModal.totalPrice, cet),
    };
    await savePropostaDB(updated);
    await addHistoricoDB(cetModal.id, 'cet_atualizada', session?.user?.id || null, { cet_anterior: cetModal.cetApplied, cet_nova: cet, parcelas: cetParcelas });
    toast.success('CET atualizada!');
    setCetModal(null);
    loadProposals();
  };

  const cetParcela = useMemo(() => {
    if (!cetModal || !cetValue) return 0;
    const cet = parseFloat(cetValue) / 100;
    if (cet <= 0) return cetModal.totalPrice / cetParcelas;
    return (cetModal.totalPrice * cet * Math.pow(1 + cet, cetParcelas)) / (Math.pow(1 + cet, cetParcelas) - 1);
  }, [cetModal, cetValue, cetParcelas]);

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
          <option value="">Todas linhas</option>
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
              <th className="py-2 px-2">Data</th><th className="py-2 px-2">Linha</th><th className="py-2 px-2">Valor</th>
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
                  <td className="py-2 px-2 text-xs">{p.cetApplied ? `${p.cetApplied}%` : '—'}</td>
                  <td className="py-2 px-2"><span className={`solar-badge text-xs ${STATUS_COLORS[p.status] || 'bg-muted text-muted-foreground'}`}>{STATUS_LABELS[p.status] || p.status}</span></td>
                  <td className="py-2 px-2 text-xs text-muted-foreground">{p.dados_completos?.updatedAt ? new Date(p.dados_completos.updatedAt).toLocaleDateString('pt-BR') : '—'}</td>
                  <td className="py-2 px-2">
                    <div className="flex gap-1">
                      <button onClick={() => navigate(`/proposta/${p.id}`)} className="text-primary hover:text-primary/80" title="Visualizar">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleEditProposal(p)} className="text-blue-600 hover:text-blue-500" title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDuplicate(p.id)} className="text-purple-600 hover:text-purple-500" title="Duplicar">
                        <FileText className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleCopyLink(p.id)} className="text-green-600 hover:text-green-500" title="Copiar link">
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setCetModal(p); setCetValue(p.cetApplied ? String(p.cetApplied) : ''); }} className="text-amber-600 hover:text-amber-500" title="Atualizar CET">
                        <DollarSign className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleArchive(p.id)} className="text-muted-foreground hover:text-destructive" title="Arquivar">
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

      {/* CET Modal */}
      {cetModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setCetModal(null)}>
          <div className="bg-card rounded-xl p-6 max-w-md w-full mx-4 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-primary">Atualizar CET</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Nº Proposta:</span><p className="font-mono font-bold">{cetModal.numero_proposta || '—'}</p></div>
                <div><span className="text-muted-foreground">Cliente:</span><p className="font-medium">{cetModal.clientData?.name}</p></div>
              </div>
              <div><span className="text-xs text-muted-foreground">CET atual: {cetModal.cetApplied ? `${cetModal.cetApplied}% a.m.` : 'Padrão estimada'}</span></div>
              <div><label className="block text-sm font-medium mb-1">Nova CET (% a.m.)</label>
                <input className="solar-input" type="number" step="0.001" value={cetValue} onChange={e => setCetValue(e.target.value)} /></div>
              <div><label className="block text-sm font-medium mb-1">Parcelas aprovadas</label>
                <select className="solar-input" value={cetParcelas} onChange={e => setCetParcelas(Number(e.target.value))}>
                  {[24, 36, 48, 60, 72].map(n => <option key={n} value={n}>{n}×</option>)}
                </select></div>
              {cetValue && parseFloat(cetValue) > 0 && (
                <div className="p-3 rounded-lg bg-primary/5 text-sm">
                  <span className="text-muted-foreground">Parcela calculada:</span>
                  <span className="font-bold text-primary ml-2">{formatCurrency(cetParcela)}</span>
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <button onClick={() => setCetModal(null)} className="solar-btn-outline text-sm py-2">Cancelar</button>
                <button onClick={handleApplyCet} className="solar-btn-primary text-sm py-2">Aplicar CET</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── PROVAS SOCIAIS ─── */
function SocialTab() {
  const [proofs, setProofs] = useState(getSocialProofs());

  const addProof = (type: 'video' | 'photo') => {
    const p: SocialProof = { id: Date.now().toString(), type, url: '', title: '', active: true, order: proofs.length };
    setProofs(prev => [...prev, p]);
  };

  const updateProof = (id: string, field: string, value: any) => {
    setProofs(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleSave = () => { saveSocialProofs(proofs); saveSocialProofsDB(proofs); };

  return (
    <div className="solar-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-primary">Provas Sociais</h2>
        <div className="flex gap-2">
          <button onClick={() => addProof('video')} className="solar-btn-outline text-sm py-2 px-3">+ Vídeo</button>
          <button onClick={() => addProof('photo')} className="solar-btn-outline text-sm py-2 px-3">+ Foto</button>
          <button onClick={handleSave} className="solar-btn-primary text-sm py-2 px-3 flex items-center gap-1"><Save className="w-4 h-4" /> Salvar</button>
        </div>
      </div>
      <div className="space-y-3">
        {proofs.map(p => (
          <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <span className="solar-badge bg-primary/10 text-primary text-xs">{p.type === 'video' ? 'Vídeo' : 'Foto'}</span>
            <input className="solar-input flex-1 text-sm py-1" placeholder="URL" value={p.url} onChange={e => updateProof(p.id, 'url', e.target.value)} />
            <input className="solar-input w-48 text-sm py-1" placeholder="Título" value={p.title} onChange={e => updateProof(p.id, 'title', e.target.value)} />
            <input type="checkbox" checked={p.active} onChange={e => updateProof(p.id, 'active', e.target.checked)} className="accent-primary" />
            <button onClick={() => setProofs(prev => prev.filter(x => x.id !== p.id))} className="text-destructive"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        {proofs.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma prova social cadastrada.</p>}
      </div>
    </div>
  );
}
