import { useState, useEffect } from 'react';
import { getSettings, saveSettings, getKits, saveKits, getProposals, getSocialProofs, saveSocialProofs, isAdminLoggedIn, setAdminAuth } from '@/data/store';
import { formatCurrency } from '@/data/calculations';
import { Kit, AdminSettings, SocialProof } from '@/data/types';
import { Lock, Database, Settings, FileText, Image, LogOut, Plus, Trash2, Save, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminPage() {
  const [authed, setAuthed] = useState(isAdminLoggedIn());
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [tab, setTab] = useState<'kits' | 'settings' | 'proposals' | 'social'>('kits');

  if (!authed) {
    return (
      <div className="max-w-md mx-auto mt-20 solar-card p-8 space-y-6 animate-fade-in-up">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-primary">Painel Admin</h1>
          <p className="text-sm text-muted-foreground">Acesso restrito</p>
        </div>
        <div className="space-y-3">
          <input className="solar-input" placeholder="Usuário" value={user} onChange={e => setUser(e.target.value)} />
          <input className="solar-input" type="password" placeholder="Senha" value={pass} onChange={e => setPass(e.target.value)} />
          <button className="w-full solar-btn-primary"
            onClick={() => { if (user === 'admin' && pass === 'solar2024') { setAdminAuth(true); setAuthed(true); } }}>
            Entrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Painel Administrativo</h1>
        <button onClick={() => { setAdminAuth(false); setAuthed(false); }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors">
          <LogOut className="w-4 h-4" /> Sair
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {([
          { key: 'kits', label: 'Banco de Kits', icon: Database },
          { key: 'settings', label: 'Configurações', icon: Settings },
          { key: 'proposals', label: 'Propostas', icon: FileText },
          { key: 'social', label: 'Provas Sociais', icon: Image },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'kits' && <KitsTab />}
      {tab === 'settings' && <SettingsTab />}
      {tab === 'proposals' && <ProposalsTab />}
      {tab === 'social' && <SocialTab />}
    </div>
  );
}

function KitsTab() {
  const [kits, setKits] = useState(getKits());
  const [editId, setEditId] = useState<string | null>(null);

  const handleSave = () => { saveKits(kits); };

  const addKit = () => {
    const newKit: Kit = {
      id: Date.now().toString(), line: 'acesso', type: 'inversor', brand: '', model: '',
      power: 0, warranty: 10, costPrice: 0, minPower: 0, maxPower: 999, active: true,
    };
    setKits(prev => [newKit, ...prev]);
    setEditId(newKit.id);
  };

  const updateKit = (id: string, field: string, value: any) => {
    setKits(prev => prev.map(k => k.id === id ? { ...k, [field]: value } : k));
  };

  return (
    <div className="solar-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-primary">Banco de Dados de Kits</h2>
        <div className="flex gap-2">
          <button onClick={addKit} className="solar-btn-outline text-sm py-2 px-3 flex items-center gap-1"><Plus className="w-4 h-4" /> Novo</button>
          <button onClick={handleSave} className="solar-btn-primary text-sm py-2 px-3 flex items-center gap-1"><Save className="w-4 h-4" /> Salvar</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 px-2">Linha</th><th className="py-2 px-2">Tipo</th>
              <th className="py-2 px-2">Marca</th><th className="py-2 px-2">Modelo</th>
              <th className="py-2 px-2">Potência</th><th className="py-2 px-2">Custo</th>
              <th className="py-2 px-2">Ativo</th><th className="py-2 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {kits.map(k => (
              <tr key={k.id} className="border-b border-border/50 hover:bg-muted/30">
                <td className="py-2 px-2">
                  <select className="solar-input py-1 text-xs" value={k.line} onChange={e => updateKit(k.id, 'line', e.target.value)}>
                    <option value="acesso">Acesso</option><option value="excellence">Excellence</option><option value="premium">Premium</option>
                  </select>
                </td>
                <td className="py-2 px-2">
                  <select className="solar-input py-1 text-xs" value={k.type} onChange={e => updateKit(k.id, 'type', e.target.value)}>
                    <option value="inversor">Inversor</option><option value="placa">Placa</option><option value="estrutura">Estrutura</option>
                    <option value="cabo">Cabo</option><option value="stringbox">String Box</option>
                  </select>
                </td>
                <td className="py-2 px-2"><input className="solar-input py-1 text-xs w-24" value={k.brand} onChange={e => updateKit(k.id, 'brand', e.target.value)} /></td>
                <td className="py-2 px-2"><input className="solar-input py-1 text-xs w-32" value={k.model} onChange={e => updateKit(k.id, 'model', e.target.value)} /></td>
                <td className="py-2 px-2"><input className="solar-input py-1 text-xs w-20" type="number" value={k.power} onChange={e => updateKit(k.id, 'power', parseFloat(e.target.value) || 0)} /></td>
                <td className="py-2 px-2"><input className="solar-input py-1 text-xs w-24" type="number" value={k.costPrice} onChange={e => updateKit(k.id, 'costPrice', parseFloat(e.target.value) || 0)} /></td>
                <td className="py-2 px-2">
                  <input type="checkbox" checked={k.active} onChange={e => updateKit(k.id, 'active', e.target.checked)} className="accent-primary" />
                </td>
                <td className="py-2 px-2">
                  <button onClick={() => setKits(prev => prev.filter(x => x.id !== k.id))} className="text-destructive hover:text-destructive/80">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsTab() {
  const [settings, setSettings] = useState(getSettings());
  const update = (field: string, value: any) => setSettings((prev: AdminSettings) => ({ ...prev, [field]: value }));
  const updateCompany = (field: string, value: string) => setSettings((prev: AdminSettings) => ({ ...prev, company: { ...prev.company, [field]: value } }));

  const handleSave = () => saveSettings(settings);

  return (
    <div className="solar-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-primary">Configurações</h2>
        <button onClick={handleSave} className="solar-btn-primary text-sm py-2 px-3 flex items-center gap-1"><Save className="w-4 h-4" /> Salvar</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-primary">Precificação</h3>
          <div>
            <label className="block text-sm font-medium mb-1">Margem de lucro (%)</label>
            <input className="solar-input" type="number" value={settings.profitMargin} onChange={e => update('profitMargin', parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">CET estimada (% a.m.)</label>
            <input className="solar-input" type="number" step="0.01" value={settings.defaultCET} onChange={e => update('defaultCET', parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Perda sistêmica (%)</label>
            <input className="solar-input" type="number" value={settings.systemLoss} onChange={e => update('systemLoss', parseFloat(e.target.value) || 0)} />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-primary">Prazos</h3>
          <div>
            <label className="block text-sm font-medium mb-1">Validade proposta (dias)</label>
            <input className="solar-input" type="number" value={settings.proposalValidity} onChange={e => update('proposalValidity', parseInt(e.target.value) || 0)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Prazo instalação (dias)</label>
            <input className="solar-input" type="number" value={settings.installationDays} onChange={e => update('installationDays', parseInt(e.target.value) || 0)} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-primary">Dados da Empresa</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['name', 'cnpj', 'phone', 'email', 'site', 'social'] as const).map(f => (
            <div key={f}>
              <label className="block text-sm font-medium mb-1 capitalize">{f}</label>
              <input className="solar-input" value={settings.company[f]} onChange={e => updateCompany(f, e.target.value)} />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-primary">Vendedores</h3>
        <div className="space-y-2">
          {settings.sellers.map((s, i) => (
            <div key={i} className="flex gap-2">
              <input className="solar-input flex-1" value={s}
                onChange={e => update('sellers', settings.sellers.map((x: string, j: number) => j === i ? e.target.value : x))} />
              <button onClick={() => update('sellers', settings.sellers.filter((_: string, j: number) => j !== i))} className="text-destructive hover:text-destructive/80 p-2">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button onClick={() => update('sellers', [...settings.sellers, ''])} className="flex items-center gap-1 text-sm text-primary font-medium hover:underline">
            <Plus className="w-4 h-4" /> Adicionar vendedor
          </button>
        </div>
      </div>
    </div>
  );
}

function ProposalsTab() {
  const proposals = getProposals();
  const navigate = useNavigate();

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
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 px-2">Cliente</th><th className="py-2 px-2">Vendedor</th>
                <th className="py-2 px-2">Data</th><th className="py-2 px-2">Valor</th>
                <th className="py-2 px-2">Status</th><th className="py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {proposals.map(p => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-2 px-2 font-medium">{p.clientData.name || 'Sem nome'}</td>
                  <td className="py-2 px-2">{p.clientData.seller}</td>
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

function SocialTab() {
  const [proofs, setProofs] = useState(getSocialProofs());

  const addProof = (type: 'video' | 'photo') => {
    const p: SocialProof = { id: Date.now().toString(), type, url: '', title: '', active: true, order: proofs.length };
    setProofs(prev => [...prev, p]);
  };

  const updateProof = (id: string, field: string, value: any) => {
    setProofs(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleSave = () => saveSocialProofs(proofs);

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
