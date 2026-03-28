import { useState, useRef, useEffect } from 'react';
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
import { Users, DollarSign, Settings, MapPin, Building2, FileText, Image, Plus, Trash2, Save, Wand2, AlertCircle, Upload, Check, ChevronDown, UserPlus, Edit2, X } from 'lucide-react';
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
    { key: 'sellers' as const, label: 'Vendedores', icon: Users, roles: ['admin'] },
    { key: 'prices' as const, label: 'Tabela de Preços', icon: DollarSign, roles: ['admin'] },
    { key: 'pricing' as const, label: 'Precificação', icon: Settings, roles: ['admin'] },
    { key: 'irradiation' as const, label: 'Irradiação', icon: MapPin, roles: ['admin', 'orcamentista'] },
    { key: 'company' as const, label: 'Empresa', icon: Building2, roles: ['admin', 'orcamentista'] },
    { key: 'proposals' as const, label: 'Propostas', icon: FileText, roles: ['admin', 'orcamentista'] },
    { key: 'social' as const, label: 'Provas Sociais', icon: Image, roles: ['admin'] },
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
      {tab === 'sellers' && <SellersTab />}
      {tab === 'prices' && <PriceTableTab />}
      {tab === 'pricing' && <PricingTab />}
      {tab === 'irradiation' && <IrradiationTab />}
      {tab === 'company' && <CompanyTab />}
      {tab === 'proposals' && <ProposalsTab />}
      {tab === 'social' && <SocialTab />}
    </div>
  );
}

/* ─── USUÁRIOS ─── */
function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [form, setForm] = useState({ nome: '', email: '', role: 'vendedor', password: '', confirmPassword: '' });
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
    setForm({ nome: '', email: '', role: 'vendedor', password: '', confirmPassword: '' });
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
  const initial: PriceTableEntry[] = stored.length > 0 ? stored :
    Array.from({ length: 97 }, (_, i) => ({
      panels: i + 4,
      acesso: null,
      excellence: null,
      premium: null,
      estimated: {},
      details: {},
    }));
  const [table, setTable] = useState<PriceTableEntry[]>(initial);
  const [bulkFillCol, setBulkFillCol] = useState<string | null>(null);
  const [bulkFillValue, setBulkFillValue] = useState('');

  const updateCell = (idx: number, field: 'acesso' | 'excellence' | 'premium', value: string) => {
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
      // Cost column (e.g., 'acesso')
      const line = parts[0] as 'acesso' | 'excellence' | 'premium';
      const num = parseFloat(bulkFillValue);
      if (!isNaN(num)) {
        setTable(prev => prev.map(row => ({ ...row, [line]: row[line] ?? num })));
      }
    } else {
      // Detail column (e.g., 'acesso.inverterBrand')
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
    const lines: ('acesso' | 'excellence' | 'premium')[] = ['acesso', 'excellence', 'premium'];
    const newTable = [...table.map(r => ({ ...r, estimated: { ...r.estimated } }))];

    lines.forEach(line => {
      const filled = newTable.filter(r => r[line] !== null && r[line]! > 0).map(r => ({ panels: r.panels, value: r[line]! }));
      if (filled.length < 2) return;

      const increments: number[] = [];
      for (let i = 1; i < filled.length; i++) {
        const inc = (filled[i].value - filled[i - 1].value) / (filled[i].panels - filled[i - 1].panels);
        increments.push(inc);
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
            const extraMicros = microsNow - microsBefore;
            estimated = before.value + (row.panels - before.panels) * avgInc + extraMicros * 300;
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

  const handleSave = () => { savePriceTable(table); savePriceTableDB(table); };

  const DETAIL_COLS: { key: keyof PriceTableLineDetails; label: string; short: string }[] = [
    { key: 'inverterBrand', label: 'Marca Inv.', short: 'M.Inv' },
    { key: 'inverterPower', label: 'Pot. Inv.', short: 'P.Inv' },
    { key: 'panelBrand', label: 'Marca Placa', short: 'M.Plc' },
    { key: 'panelPower', label: 'Pot. Placa', short: 'P.Plc' },
  ];

  const LINES_ARR = [
    { key: 'acesso' as const, name: LINE_NAMES.acesso },
    { key: 'excellence' as const, name: LINE_NAMES.excellence },
    { key: 'premium' as const, name: LINE_NAMES.premium },
  ];

  const BulkFillButton = ({ colKey }: { colKey: string }) => (
    <button onClick={() => { setBulkFillCol(colKey); setBulkFillValue(''); }}
      className="ml-1 text-xs text-primary hover:text-primary/80" title="Preencher coluna inteira">↓</button>
  );

  return (
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

      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 px-1 w-14" rowSpan={2}>Nº</th>
              {LINES_ARR.map(line => (
                <th key={line.key} className="py-1 px-1 text-center border-l border-border/50" colSpan={5}>
                  {line.name}
                </th>
              ))}
            </tr>
            <tr className="border-b border-border text-muted-foreground text-[10px]">
              {LINES_ARR.map(line => (
                <>
                  <th key={`${line.key}-cost`} className="py-1 px-1 border-l border-border/50">
                    Custo <BulkFillButton colKey={line.key} />
                  </th>
                  {DETAIL_COLS.map(col => (
                    <th key={`${line.key}-${col.key}`} className="py-1 px-1">
                      {col.short} <BulkFillButton colKey={`${line.key}.${col.key}`} />
                    </th>
                  ))}
                </>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.map((row, idx) => (
              <tr key={row.panels} className="border-b border-border/50 hover:bg-muted/30">
                <td className="py-1 px-1 font-medium text-muted-foreground">{row.panels}</td>
                {LINES_ARR.map(line => {
                  const isEstimated = row.estimated?.[line.key];
                  const details = (row.details as any)?.[line.key] as PriceTableLineDetails | undefined;
                  return (
                    <>
                      <td key={`${line.key}-cost-${idx}`} className="py-1 px-1 border-l border-border/50">
                        <input
                          className={`solar-input py-0.5 text-xs w-20 ${isEstimated ? 'italic text-muted-foreground' : ''}`}
                          type="number" value={row[line.key] ?? ''} placeholder="—"
                          onChange={e => updateCell(idx, line.key, e.target.value)} />
                      </td>
                      {DETAIL_COLS.map(col => (
                        <td key={`${line.key}-${col.key}-${idx}`} className="py-1 px-1">
                          <input className="solar-input py-0.5 text-xs w-20"
                            value={details?.[col.key] || ''} placeholder="—"
                            onChange={e => updateDetail(idx, line.key, col.key, e.target.value)} />
                        </td>
                      ))}
                    </>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
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
  const [settings, setSettings] = useState(getSettings());
  const entries = settings.irradiationEntries;
  const [importMsg, setImportMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateEntry = (idx: number, field: keyof IrradiationEntry, value: any) => {
    const updated = [...entries];
    updated[idx] = { ...updated[idx], [field]: field === 'value' ? (parseFloat(value) || 0) : value };
    setSettings(prev => ({ ...prev, irradiationEntries: updated }));
  };

  const add = () => {
    const entry: IrradiationEntry = { id: Date.now().toString(), state: 'MS', city: '', value: 5.0 };
    setSettings(prev => ({ ...prev, irradiationEntries: [...prev.irradiationEntries, entry] }));
  };

  const remove = (idx: number) => {
    setSettings(prev => ({ ...prev, irradiationEntries: prev.irradiationEntries.filter((_, i) => i !== idx) }));
  };

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
        const newEntries: IrradiationEntry[] = data.map((item: any, i: number) => ({
          id: `imp_${Date.now()}_${i}`,
          state: item.uf || item.state || 'MS',
          city: item.cidade || item.city || '',
          value: Array.isArray(item.irr) ? item.irr.reduce((a: number, b: number) => a + b, 0) / 12 : (item.value || 5.0),
        }));
        setSettings(prev => ({ ...prev, irradiationEntries: [...prev.irradiationEntries, ...newEntries] }));
        setImportMsg(`${newEntries.length} cidades importadas no banco de dados com sucesso!`);
        setTimeout(() => setImportMsg(''), 4000);
      } catch {
        setImportMsg('Erro ao importar arquivo. Verifique o formato JSON.');
        setTimeout(() => setImportMsg(''), 4000);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = () => { saveSettings(settings); saveSettingsDB(settings); };
  return (
    <div className="solar-card p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-primary">Irradiação por Cidade</h2>
        <div className="flex gap-2 flex-wrap">
          <input type="file" accept=".json" ref={fileInputRef} className="hidden" onChange={handleImportJSON} />
          <button onClick={() => fileInputRef.current?.click()} className="solar-btn-outline text-sm py-2 px-3 flex items-center gap-1">
            <Upload className="w-4 h-4" /> Importar base completa (JSON)
          </button>
          <button onClick={add} className="solar-btn-outline text-sm py-2 px-3 flex items-center gap-1"><Plus className="w-4 h-4" /> Nova cidade</button>
          <button onClick={handleSave} className="solar-btn-primary text-sm py-2 px-3 flex items-center gap-1"><Save className="w-4 h-4" /> Salvar</button>
        </div>
      </div>
      {importMsg && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${importMsg.includes('sucesso') ? 'bg-green-100 text-green-800' : importMsg.includes('Erro') ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
          {importMsg.includes('sucesso') ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {importMsg}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Base CRESESB com 98 cidades já incluída no sistema. Aqui você pode adicionar cidades extras ou importar a base completa via JSON.
      </p>
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 px-2">UF</th><th className="py-2 px-2">Cidade</th>
              <th className="py-2 px-2">Irradiação (kWh/m².dia)</th><th className="py-2 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={e.id} className="border-b border-border/50 hover:bg-muted/30">
                <td className="py-2 px-2">
                  <select className="solar-input py-1 text-sm w-20" value={e.state} onChange={ev => updateEntry(i, 'state', ev.target.value)}>
                    {BRAZILIAN_STATES.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </td>
                <td className="py-2 px-2"><input className="solar-input py-1 text-sm" value={e.city} onChange={ev => updateEntry(i, 'city', ev.target.value)} /></td>
                <td className="py-2 px-2"><input className="solar-input py-1 text-sm w-24" type="number" step="0.1" value={e.value} onChange={ev => updateEntry(i, 'value', ev.target.value)} /></td>
                <td className="py-2 px-2"><button onClick={() => remove(i)} className="text-destructive hover:text-destructive/80"><Trash2 className="w-4 h-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
  const { profile, isAdmin, isOrcamentista } = useAuth();

  useEffect(() => {
    getPropostasDB().then(data => {
      let list = data.length > 0 ? data : getProposals();
      // Vendedor only sees own proposals (but vendedor shouldn't reach admin)
      // Orcamentista sees all
      setProposals(list);
      setLoadingProposals(false);
    });
  }, []);

  const STATUS_LABELS: Record<string, string> = {
    enviada: 'Enviada', visualizada: 'Visualizada', aprovada: 'Aprovada',
    financiamento: 'Financiamento', fechada: 'Fechada',
  };
  const STATUS_COLORS: Record<string, string> = {
    enviada: 'bg-blue-100 text-blue-800', visualizada: 'bg-amber-100 text-amber-800',
    aprovada: 'bg-green-100 text-green-800', financiamento: 'bg-purple-100 text-purple-800',
    fechada: 'bg-primary/10 text-primary',
  };

  return (
    <div className="solar-card p-6 space-y-4">
      <h2 className="text-lg font-bold text-primary">Propostas Geradas</h2>
      {proposals.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma proposta gerada ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 px-2">Cliente</th><th className="py-2 px-2">Vendedor</th>
              <th className="py-2 px-2">Data</th><th className="py-2 px-2">Valor</th>
              <th className="py-2 px-2">Status</th><th className="py-2 px-2"></th>
            </tr></thead>
            <tbody>
              {proposals.map(p => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-2 px-2 font-medium">{p.clientData?.name || 'Sem nome'}</td>
                  <td className="py-2 px-2">{p.clientData?.seller}</td>
                  <td className="py-2 px-2">{new Date(p.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td className="py-2 px-2 font-medium">{formatCurrency(p.totalPrice)}</td>
                  <td className="py-2 px-2"><span className={`solar-badge ${STATUS_COLORS[p.status]}`}>{STATUS_LABELS[p.status]}</span></td>
                  <td className="py-2 px-2">
                    <button onClick={() => navigate(`/proposta/${p.id}`)} className="text-primary hover:text-primary/80">
                      <Eye className="w-4 h-4" />
                    </button>
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
