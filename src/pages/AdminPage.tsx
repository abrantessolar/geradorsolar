import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  getSettings, saveSettings, getKits, saveKits,
  getSocialProofs, saveSocialProofs,
} from '@/data/store';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  saveSettingsDB, saveSocialProofsDB,
  saveDistribuidorasDB, importCidadesIrradianciaDB,
  getConfigDB, saveConfigDB,
} from '@/data/supabaseStore';
import { AdminSettings, IrradiationEntry, SocialProof, BRAZILIAN_STATES, CA_MATERIAL_TABLE_DEFAULT, LINE_NAMES } from '@/data/types';
import type { Distributor } from '@/data/types';
import { Users, Settings, MapPin, Building2, FileText, Image, Plus, Trash2, Save, Wand2, AlertCircle, Upload, Check, ChevronDown, UserPlus, Edit2, X, Globe, CheckCircle, AlertTriangle, Megaphone, Cpu, HelpCircle, Zap } from 'lucide-react';
import LeadsTab from '@/components/admin/LeadsTab';
import AtivarPosVendaTab from '@/components/admin/AtivarPosVendaTab';
import { useNewLeadsCount } from '@/components/LeadNotification';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import SiteContentTab from '@/components/admin/SiteContentTab';
import FaqTab from '@/components/admin/FaqTab';
import EquipmentTab from '@/components/admin/EquipmentTab';
import ModelosDocumentos from '@/components/gestor/ModelosDocumentos';

function ModelosDocumentosWrapper() {
  return (
    <div className="solar-card p-6">
      <h2 className="text-lg font-bold text-primary mb-4">Modelos de Documentos</h2>
      <ModelosDocumentos />
    </div>
  );
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  gestor: 'Gestor',
  orcamentista: 'Orçamentista',
  vendedor: 'Vendedor',
};

export default function AdminPage() {
  const { isAdmin, isOrcamentista, profile } = useAuth();
  const location = useLocation();
  const newLeadsCount = useNewLeadsCount();

  const adminTabs = [
    { key: 'users' as const, label: 'Usuários', icon: Users, roles: ['admin'] },
    { key: 'leads' as const, label: 'Leads', icon: Megaphone, roles: ['admin', 'orcamentista'], badge: newLeadsCount },
    { key: 'pricing' as const, label: 'Precificação', icon: Settings, roles: ['admin', 'orcamentista'] },
    { key: 'equipment' as const, label: 'Equipamentos', icon: Cpu, roles: ['admin'] },
    { key: 'modelos' as const, label: 'Modelos Docs', icon: FileText, roles: ['admin'] },
    { key: 'irradiation' as const, label: 'Irradiação', icon: MapPin, roles: ['admin', 'orcamentista'] },
    { key: 'company' as const, label: 'Empresa', icon: Building2, roles: ['admin'] },
    { key: 'social' as const, label: 'Provas Sociais', icon: Image, roles: ['admin'] },
    { key: 'site_content' as const, label: 'Conteúdo do Site', icon: Globe, roles: ['admin'] },
    { key: 'faq' as const, label: 'FAQ', icon: HelpCircle, roles: ['admin'] },
    { key: 'ativar_posvenda' as const, label: 'Ativar Pós-venda', icon: Zap, roles: ['admin'] },
  ];

  const visibleTabs = adminTabs.filter(t => t.roles.includes(profile?.role || ''));
  const initialTab = (location.state as any)?.tab || visibleTabs[0]?.key || 'users';
  const [tab, setTab] = useState(initialTab);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Painel Administrativo</h1>
      </div>

      <div className="flex gap-2 flex-wrap">
        {visibleTabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
            {(t as any).badge > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {(t as any).badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'users' && isAdmin && <UsersTab />}
      {tab === 'leads' && <LeadsTab />}
      {tab === 'equipment' && <EquipmentTab />}
      {tab === 'modelos' && <ModelosDocumentosWrapper />}
      {tab === 'pricing' && <PricingTab />}
      {tab === 'irradiation' && <IrradiationTab />}
      {tab === 'company' && <CompanyTab />}
      {tab === 'social' && <SocialTab />}
      {tab === 'site_content' && <SiteContentTab />}
      {tab === 'faq' && <FaqTab />}
      {tab === 'ativar_posvenda' && isAdmin && <AtivarPosVendaTab />}
    </div>
  );
}

/* ─── Permission Checkboxes Component ─── */
const PERMISSION_LABELS: { key: string; label: string; group?: string }[] = [
  { key: 'calculadora', label: 'Calculadora — acesso à calculadora interna' },
  { key: 'gestor_obras', label: 'Gestor — Obras', group: 'Gestor' },
  { key: 'gestor_clientes', label: 'Gestor — Clientes', group: 'Gestor' },
  { key: 'gestor_materiais', label: 'Gestor — Materiais', group: 'Gestor' },
  { key: 'gestor_equipamentos', label: 'Gestor — Equipamentos', group: 'Gestor' },
  { key: 'gestor_custos', label: 'Gestor — Custos', group: 'Gestor' },
  { key: 'estoque', label: 'Estoque — acesso à tela de estoque' },
  { key: 'posvenda', label: 'Pós-venda — responsável (recebe avisos e notificações)' },
  { key: 'leads', label: 'Leads — responsável (recebe notificações de novos leads)' },
  { key: 'admin', label: 'Admin — acesso total à área administrativa' },
  { key: 'importar_dados', label: 'Importar dados — importar JSON' },
  { key: 'sincronizar_sheets', label: 'Sincronizar Sheets — Google Sheets' },
  { key: 'zerar_base', label: 'Zerar base — apagar todos os dados' },
];

/** Permissões que NÃO são herdadas automaticamente ao marcar "Admin". */
const INDEPENDENT_PERMS = ['posvenda', 'leads'];

const DEFAULT_PERMS = {
  calculadora: false, gestor_obras: false, gestor_clientes: false,
  gestor_materiais: false, gestor_equipamentos: false, gestor_custos: false,
  estoque: false, admin: false, importar_dados: false, sincronizar_sheets: false, zerar_base: false,
  posvenda: false, leads: false,
};

function PermissionCheckboxes({ perms, onChange, disabled }: { perms: Record<string, boolean>; onChange: (p: Record<string, boolean>) => void; disabled?: boolean }) {
  const isAdmin = perms.admin;

  const toggle = (key: string) => {
    if (disabled) return;
    const newPerms = { ...perms, [key]: !perms[key] };
    // If admin toggled on, enable all (except independent ones)
    if (key === 'admin' && !perms.admin) {
      Object.keys(newPerms).forEach(k => { if (!INDEPENDENT_PERMS.includes(k)) newPerms[k] = true; });
    }
    onChange(newPerms);
  };

  return (
    <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
      {PERMISSION_LABELS.map(p => {
        const independent = INDEPENDENT_PERMS.includes(p.key);
        const locked = isAdmin && p.key !== 'admin' && !independent;
        return (
          <label key={p.key} className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer hover:bg-muted/50 text-sm ${locked ? 'opacity-50' : ''}`}>
            <input
              type="checkbox"
              checked={locked || perms[p.key] || false}
              onChange={() => toggle(p.key)}
              disabled={disabled || locked}
              className="rounded border-border"
            />
            <span>{p.label}</span>
          </label>
        );
      })}
    </div>
  );
}

/* ─── USUÁRIOS ─── */
function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', password: '', confirmPassword: '' });
  const [formPerms, setFormPerms] = useState<Record<string, boolean>>({ ...DEFAULT_PERMS });
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

  const deriveRole = (perms: Record<string, boolean>) => {
    if (perms.admin) return 'admin';
    if (perms.gestor_obras || perms.gestor_clientes || perms.gestor_materiais || perms.gestor_equipamentos || perms.gestor_custos) return 'gestor';
    if (perms.calculadora) return 'orcamentista';
    return 'vendedor';
  };

  const handleCreate = async () => {
    setError('');
    if (!form.nome || !form.email || !form.password) { setError('Preencha todos os campos.'); return; }
    if (form.password.length < 6) { setError('Senha deve ter pelo menos 6 caracteres.'); return; }
    if (form.password !== form.confirmPassword) { setError('As senhas não coincidem.'); return; }
    setSaving(true);
    const role = deriveRole(formPerms);
    const { data, error: err } = await callApi({ action: 'create', ...form, role, permissions: formPerms });
    if (err || data?.error) { setError(data?.error || 'Erro ao criar usuário.'); setSaving(false); return; }
    setShowCreate(false);
    setForm({ nome: '', email: '', telefone: '', password: '', confirmPassword: '' });
    setFormPerms({ ...DEFAULT_PERMS });
    setSaving(false);
    loadUsers();
  };

  const handleUpdate = async (userId: string, updates: any) => {
    await callApi({ action: 'update', user_id: userId, ...updates });
    loadUsers();
  };

  const getPermsSummary = (u: any) => {
    const p = u.permissions;
    if (!p) return '—';
    if (p.admin) return 'Acesso total';
    const items: string[] = [];
    if (p.calculadora) items.push('Calc');
    if (p.gestor_obras) items.push('Obras');
    if (p.gestor_clientes) items.push('Clientes');
    if (p.gestor_materiais) items.push('Mat');
    if (p.gestor_custos) items.push('Custos');
    if (p.estoque) items.push('Estoq');
    return items.length > 0 ? items.join(', ') : 'Nenhuma';
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
          <div className="bg-card rounded-xl p-6 max-w-md w-full mx-4 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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
              <div>
                <label className="block text-sm font-medium mb-2">Permissões de acesso</label>
                <PermissionCheckboxes perms={formPerms} onChange={setFormPerms} />
              </div>
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
                <th className="py-2 px-2">Telefone</th>
                <th className="py-2 px-2">Permissões</th>
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
                  <td className="py-2 px-2 text-sm text-muted-foreground">{u.telefone || '—'}</td>
                  <td className="py-2 px-2 text-xs text-muted-foreground max-w-[180px] truncate" title={getPermsSummary(u)}>
                    {getPermsSummary(u)}
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
  const [telefone, setTelefone] = useState(user.telefone || '');
  const [perms, setPerms] = useState<Record<string, boolean>>(() => {
    if (user.permissions) {
      const p = user.permissions;
      return {
        calculadora: p.calculadora ?? false, gestor_obras: p.gestor_obras ?? false,
        gestor_clientes: p.gestor_clientes ?? false, gestor_materiais: p.gestor_materiais ?? false,
        gestor_equipamentos: p.gestor_equipamentos ?? false, gestor_custos: p.gestor_custos ?? false,
        estoque: p.estoque ?? false, admin: p.admin ?? false,
        importar_dados: p.importar_dados ?? false, sincronizar_sheets: p.sincronizar_sheets ?? false,
        zerar_base: p.zerar_base ?? false, posvenda: p.posvenda ?? false, leads: p.leads ?? false,
      };
    }
    return { ...DEFAULT_PERMS, admin: user.role === 'admin' };
  });
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const deriveRole = (p: Record<string, boolean>) => {
    if (p.admin) return 'admin';
    if (p.gestor_obras || p.gestor_clientes || p.gestor_materiais || p.gestor_equipamentos || p.gestor_custos) return 'gestor';
    if (p.calculadora) return 'orcamentista';
    return 'vendedor';
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    const role = deriveRole(perms);
    const updates: any = { nome, role, telefone, permissions: perms };
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
      <div className="bg-card rounded-xl p-6 max-w-md w-full mx-4 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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
          <div><label className="block text-sm font-medium mb-1">Telefone/WhatsApp</label>
            <input className="solar-input" value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(XX) XXXXX-XXXX" /></div>
          <div>
            <label className="block text-sm font-medium mb-2">Permissões de acesso</label>
            <PermissionCheckboxes perms={perms} onChange={setPerms} />
          </div>
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

/* ─── TABELA DE PREÇOS ─── */
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

  const handleSave = async () => {
    saveSettings(settings);
    try {
      await saveSettingsDB(settings);
      toast.success('Configurações salvas!');
    } catch (err) {
      console.error(err);
      toast.error('Salvo localmente, mas houve erro ao sincronizar com o servidor. Tente de novo.');
    }
  };
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

  const handleSave = async () => {
    saveSettings(settings);
    try {
      await Promise.all([
        saveSettingsDB(settings),
        saveDistribuidorasDB(settings.distributors || [], settings.defaultDistributor || ''),
      ]);
      toast.success('Configurações salvas!');
    } catch (err) {
      console.error(err);
      toast.error('Salvo localmente, mas houve erro ao sincronizar com o servidor. Tente de novo.');
    }
  };

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

      <RastreamentoConfigSection />
      <WhatsAppTemplatesSection />
    </div>
  );
}

/* ─── CONFIGURAÇÕES DE RASTREAMENTO ─── */
function RastreamentoConfigSection() {
  const [googleLink, setGoogleLink] = useState('');
  const [indicacaoTexto, setIndicacaoTexto] = useState('');
  const [prazoDias, setPrazoDias] = useState(7);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const g = await getConfigDB('rastreamento_google_link');
      const t = await getConfigDB('rastreamento_indicacao_texto');
      const p = await getConfigDB('rastreamento_prazo_dias');
      if (g) setGoogleLink(String(g));
      if (t) setIndicacaoTexto(String(t));
      if (p) setPrazoDias(Number(p) || 7);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    await saveConfigDB('rastreamento_google_link', googleLink);
    await saveConfigDB('rastreamento_indicacao_texto', indicacaoTexto);
    await saveConfigDB('rastreamento_prazo_dias', prazoDias);
    setSaving(false);
    toast.success('Configurações de rastreamento salvas!');
  };

  return (
    <div className="space-y-4 border-t border-border pt-6">
      <h3 className="font-semibold text-primary">Rastreamento de Obra</h3>
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Link do Google Meu Negócio (avaliações)</label>
          <input className="solar-input" value={googleLink} onChange={e => setGoogleLink(e.target.value)} placeholder="https://g.page/r/..." />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Texto do programa de indicação</label>
          <textarea className="solar-input min-h-[70px]" value={indicacaoTexto} onChange={e => setIndicacaoTexto(e.target.value)}
            placeholder="Indique um amigo e ganhe benefícios enquanto ele economiza na conta de luz." />
        </div>
        <div className="max-w-xs">
          <label className="block text-sm font-medium mb-1">Prazo máximo por etapa (dias) — alerta de atraso</label>
          <input className="solar-input" type="number" value={prazoDias} onChange={e => setPrazoDias(parseInt(e.target.value) || 0)} />
        </div>
      </div>
      <button onClick={save} disabled={saving} className="solar-btn-primary text-sm py-2 px-3 flex items-center gap-1">
        <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar rastreamento'}
      </button>
    </div>
  );
}

/* ─── TEMPLATES DE MENSAGEM (WHATSAPP) ─── */
function WhatsAppTemplatesSection() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('whatsapp_templates' as any).select('*').order('criado_em', { ascending: true });
    setTemplates((data || []) as any[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const updateLocal = (id: string, texto: string) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, texto } : t));
  };

  const salvar = async (t: any) => {
    setSavingId(t.id);
    const { error } = await supabase.from('whatsapp_templates' as any).update({ texto: t.texto }).eq('id', t.id);
    setSavingId(null);
    if (error) { toast.error(error.message); return; }
    toast.success('Template salvo!');
  };

  return (
    <div className="space-y-4 border-t border-border pt-6">
      <div>
        <h3 className="font-semibold text-primary">Templates de mensagem (WhatsApp)</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Use <code>[nome]</code> para o nome do cliente e <code>[link avaliação]</code> para o link do Google.
        </p>
      </div>
      {loading ? (
        <div className="flex justify-center py-6"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
      ) : (
        <div className="space-y-3">
          {templates.map(t => (
            <div key={t.id} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">{t.titulo || t.tipo}</span>
                <button onClick={() => salvar(t)} disabled={savingId === t.id} className="solar-btn-primary text-xs py-1 px-2 flex items-center gap-1">
                  <Save className="w-3.5 h-3.5" /> {savingId === t.id ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
              <textarea className="solar-input min-h-[70px] text-sm" value={t.texto} onChange={e => updateLocal(t.id, e.target.value)} />
            </div>
          ))}
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

  const handleSave = async () => {
    saveSocialProofs(proofs);
    try {
      await saveSocialProofsDB(proofs);
      toast.success('Depoimentos salvos!');
    } catch (err) {
      console.error(err);
      toast.error('Salvo localmente, mas houve erro ao sincronizar com o servidor. Tente de novo.');
    }
  };

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
