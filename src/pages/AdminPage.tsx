import { useState, useRef, useEffect } from 'react';
import {
  getSettings, saveSettings, getKits, saveKits, getProposals,
  getSocialProofs, saveSocialProofs,
  getPriceTable, savePriceTable,
} from '@/data/store';
import { supabase } from '@/integrations/supabase/client';
import {
  saveSettingsDB, saveVendedoresDB, savePriceTableDB, saveSocialProofsDB,
  saveDistribuidorasDB, importCidadesIrradianciaDB, getPropostasDB,
} from '@/data/supabaseStore';
import { formatCurrency } from '@/data/calculations';
import { AdminSettings, Seller, IrradiationEntry, PriceTableEntry, SocialProof, BRAZILIAN_STATES, CA_MATERIAL_TABLE_DEFAULT, LINE_NAMES } from '@/data/types';
import type { Distributor } from '@/data/types';
import { Lock, Users, DollarSign, Settings, MapPin, Building2, FileText, Image, LogOut, Plus, Trash2, Save, Eye, Wand2, AlertCircle, Upload, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [tab, setTab] = useState<'sellers' | 'prices' | 'pricing' | 'irradiation' | 'company' | 'proposals' | 'social'>('sellers');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setAuthed(!!session);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthed(!!session);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    setLoginError('');
    const { error } = await supabase.auth.signInWithPassword({
      email: user,
      password: pass,
    });
    if (error) {
      setLoginError('Usuário ou senha incorretos. Tente novamente.');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuthed(false);
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) return;
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (!error) {
      setForgotSent(true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!authed) {
    if (showForgot) {
      return (
        <div className="max-w-md mx-auto mt-20 solar-card p-8 space-y-6 animate-fade-in-up">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-primary">Redefinir Senha</h1>
          </div>
          {forgotSent ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Enviaremos um link de redefinição para seu e-mail cadastrado.
              </p>
              <button onClick={() => { setShowForgot(false); setForgotSent(false); }} className="solar-btn-outline text-sm">
                Voltar ao login
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">E-mail cadastrado</label>
                <input className="solar-input" type="email" placeholder="seu@email.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} />
              </div>
              <button className="w-full solar-btn-primary" onClick={handleForgotPassword}>
                Enviar link de redefinição
              </button>
              <button onClick={() => setShowForgot(false)} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
                Voltar ao login
              </button>
            </div>
          )}
        </div>
      );
    }

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
          {loginError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {loginError}
            </div>
          )}
          <input className="solar-input" placeholder="Usuário" value={user} onChange={e => setUser(e.target.value)} />
          <input className="solar-input" type="password" placeholder="Senha" value={pass}
            onChange={e => setPass(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleLogin(); }} />
          <button className="w-full solar-btn-primary" onClick={handleLogin}>
            Entrar
          </button>
          <button onClick={() => setShowForgot(true)} className="w-full text-sm text-primary hover:underline">
            Esqueci minha senha
          </button>
        </div>
      </div>
    );
  }

  const TABS = [
    { key: 'sellers' as const, label: 'Vendedores', icon: Users },
    { key: 'prices' as const, label: 'Tabela de Preços', icon: DollarSign },
    { key: 'pricing' as const, label: 'Precificação', icon: Settings },
    { key: 'irradiation' as const, label: 'Irradiação', icon: MapPin },
    { key: 'company' as const, label: 'Empresa', icon: Building2 },
    { key: 'proposals' as const, label: 'Propostas', icon: FileText },
    { key: 'social' as const, label: 'Provas Sociais', icon: Image },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Painel Administrativo</h1>
        <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors">
          <LogOut className="w-4 h-4" /> Sair
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

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

/* ─── ABA 1: VENDEDORES ─── */
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

  const handleSave = () => saveSettings(settings);

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

/* ─── ABA 2: TABELA DE PREÇOS ─── */
function PriceTableTab() {
  const stored = getPriceTable();
  const initial: PriceTableEntry[] = stored.length > 0 ? stored :
    Array.from({ length: 97 }, (_, i) => ({
      panels: i + 4,
      acesso: null,
      excellence: null,
      premium: null,
      estimated: {},
    }));
  const [table, setTable] = useState<PriceTableEntry[]>(initial);

  const updateCell = (idx: number, field: 'acesso' | 'excellence' | 'premium', value: string) => {
    const num = value === '' ? null : parseFloat(value);
    setTable(prev => prev.map((row, i) => i === idx ? {
      ...row,
      [field]: num,
      estimated: { ...row.estimated, [field]: false },
    } : row));
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

        let estimated: number;
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
        } else {
          return;
        }

        if (estimated! !== undefined) {
          newTable[idx] = { ...newTable[idx], [line]: Math.round(estimated!), estimated: { ...newTable[idx].estimated, [line]: true } };
        }
      });
    });

    setTable(newTable);
  };

  const handleSave = () => savePriceTable(table);

  return (
    <div className="solar-card p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-primary">Tabela de Preços dos Kits</h2>
        <div className="flex gap-2">
          <button onClick={generateEstimates} className="solar-btn-outline text-sm py-2 px-3 flex items-center gap-1">
            <Wand2 className="w-4 h-4" /> Gerar Valores Aproximados
          </button>
          <button onClick={handleSave} className="solar-btn-primary text-sm py-2 px-3 flex items-center gap-1">
            <Save className="w-4 h-4" /> Salvar tabela
          </button>
        </div>
      </div>
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 px-2 w-20">Nº Placas</th>
              <th className="py-2 px-2">Custo {LINE_NAMES.acesso} (R$)</th>
              <th className="py-2 px-2">Custo {LINE_NAMES.excellence} (R$)</th>
              <th className="py-2 px-2">Custo {LINE_NAMES.premium} (R$)</th>
            </tr>
          </thead>
          <tbody>
            {table.map((row, idx) => (
              <tr key={row.panels} className="border-b border-border/50 hover:bg-muted/30">
                <td className="py-1 px-2 font-medium text-muted-foreground">{row.panels}</td>
                {(['acesso', 'excellence', 'premium'] as const).map(line => {
                  const isEstimated = row.estimated?.[line];
                  return (
                    <td key={line} className="py-1 px-2">
                      <input
                        className={`solar-input py-1 text-sm w-32 ${isEstimated ? 'italic text-muted-foreground' : ''}`}
                        type="number"
                        value={row[line] ?? ''}
                        placeholder="—"
                        onChange={e => updateCell(idx, line, e.target.value)}
                      />
                    </td>
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

/* ─── ABA 3: REGRAS DE PRECIFICAÇÃO ─── */
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

  const handleSave = () => saveSettings(settings);

  return (
    <div className="solar-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-primary">Regras de Precificação</h2>
        <button onClick={handleSave} className="solar-btn-primary text-sm py-2 px-3 flex items-center gap-1"><Save className="w-4 h-4" /> Salvar</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-primary">Margem e Taxas</h3>
          <div>
            <label className="block text-sm font-medium mb-1">Margem de lucro (%)</label>
            <input className="solar-input" type="number" value={settings.profitMargin} onChange={e => update('profitMargin', parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">CET estimada padrão (% a.m.)</label>
            <input className="solar-input" type="number" step="0.001" value={settings.defaultCET} onChange={e => update('defaultCET', parseFloat(e.target.value) || 0)} />
            <p className="text-xs text-muted-foreground mt-1">Padrão: 2,214% a.m.</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Perda sistêmica (%)</label>
            <input className="solar-input" type="number" value={settings.systemLoss} onChange={e => update('systemLoss', parseFloat(e.target.value) || 0)} />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-primary">Instalação e Homologação</h3>
          <div>
            <label className="block text-sm font-medium mb-1">Valor por placa (R$)</label>
            <input className="solar-input" type="number" value={settings.installationPricePerPanel} onChange={e => update('installationPricePerPanel', parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Homologação (R$)</label>
            <input className="solar-input" type="number" value={settings.homologationPrice} onChange={e => update('homologationPrice', parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Cabo tronco {LINE_NAMES.premium} (R$ por micro adicional)</label>
            <input className="solar-input" type="number" value={settings.trunkCablePrice} onChange={e => update('trunkCablePrice', parseFloat(e.target.value) || 0)} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-primary">Material de Instalação CA (por potência do inversor)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 px-2">Até (kW)</th>
                <th className="py-2 px-2">Custo (R$)</th>
              </tr>
            </thead>
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

      {/* Credit Card Rates */}
      <div className="space-y-4">
        <h3 className="font-semibold text-primary">Taxas do Cartão de Crédito (1× a 18×)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 px-2">Parcelas</th>
                <th className="py-2 px-2">Taxa (%)</th>
              </tr>
            </thead>
            <tbody>
              {settings.creditCardRates.map((row, i) => (
                <tr key={row.installments} className="border-b border-border/50">
                  <td className="py-1 px-2 font-medium text-muted-foreground">{row.installments}×</td>
                  <td className="py-1 px-2">
                    <input className="solar-input py-1 text-sm w-24" type="number" step="0.1" value={row.rate}
                      onChange={e => updateCardRate(i, parseFloat(e.target.value) || 0)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── ABA 4: IRRADIAÇÃO POR CIDADE ─── */
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
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!Array.isArray(data)) throw new Error('Formato inválido');
        const newEntries: IrradiationEntry[] = data.map((item: any, i: number) => ({
          id: `imp_${Date.now()}_${i}`,
          state: item.uf || item.state || 'MS',
          city: item.cidade || item.city || '',
          value: Array.isArray(item.irr) ? item.irr.reduce((a: number, b: number) => a + b, 0) / 12 : (item.value || 5.0),
        }));
        setSettings(prev => ({ ...prev, irradiationEntries: [...prev.irradiationEntries, ...newEntries] }));
        setImportMsg(`${newEntries.length} cidades importadas com sucesso!`);
        setTimeout(() => setImportMsg(''), 4000);
      } catch {
        setImportMsg('Erro ao importar arquivo. Verifique o formato JSON.');
        setTimeout(() => setImportMsg(''), 4000);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = () => saveSettings(settings);

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
        Base CRESESB com 98 cidades já incluída no sistema. Aqui você pode adicionar cidades extras ou importar a base completa de 5.509 cidades via JSON.
      </p>
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 px-2">Estado (UF)</th>
              <th className="py-2 px-2">Cidade</th>
              <th className="py-2 px-2">Irradiação (kWh/m².dia)</th>
              <th className="py-2 px-2"></th>
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

/* ─── ABA 5: DADOS DA EMPRESA ─── */
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

  const handleSave = () => saveSettings(settings);

  const COMPANY_FIELDS = [
    { key: 'name', label: 'Nome da empresa' },
    { key: 'cnpj', label: 'CNPJ' },
    { key: 'phone', label: 'Telefone' },
    { key: 'email', label: 'E-mail' },
    { key: 'site', label: 'Site' },
    { key: 'social', label: 'Instagram / Facebook' },
  ];

  return (
    <div className="solar-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-primary">Dados da Empresa</h2>
        <button onClick={handleSave} className="solar-btn-primary text-sm py-2 px-3 flex items-center gap-1"><Save className="w-4 h-4" /> Salvar</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {COMPANY_FIELDS.map(f => (
          <div key={f.key}>
            <label className="block text-sm font-medium mb-1">{f.label}</label>
            <input className="solar-input" value={(settings.company as any)[f.key]} onChange={e => updateCompany(f.key, e.target.value)} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Validade proposta (dias)</label>
          <input className="solar-input" type="number" value={settings.proposalValidity} onChange={e => update('proposalValidity', parseInt(e.target.value) || 0)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Prazo instalação (dias)</label>
          <input className="solar-input" type="number" value={settings.installationDays} onChange={e => update('installationDays', parseInt(e.target.value) || 0)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Prazo homologação (dias)</label>
          <input className="solar-input" type="number" value={settings.homologationDays} onChange={e => update('homologationDays', parseInt(e.target.value) || 0)} />
        </div>
      </div>

      {/* Distributor Tariffs */}
      <div className="space-y-4 border-t border-border pt-6">
        <h3 className="font-semibold text-primary">Tarifas por Distribuidora</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 px-2">Distribuidora</th>
                <th className="py-2 px-2">Valor kWh (R$)</th>
                <th className="py-2 px-2">Padrão</th>
                <th className="py-2 px-2"></th>
              </tr>
            </thead>
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
