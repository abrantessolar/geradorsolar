import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit2, X, Save, Power, PowerOff, Trash2, SunMedium, Zap, Image as ImageIcon, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getSettings, saveSettings, getKits } from '@/data/store';

interface EquipmentRow {
  id: string;
  nome: string;
  categoria: string;
  potencia_kw: number;
  tipo_medicao: string;
  dias_mes_padrao: number;
  horas_dia_padrao: number | null;
  fator_servico: number;
  ativo: boolean;
}

interface PlacaRow {
  id: string;
  marca: string;
  modelo: string;
  potencia_wp: number;
  ativo: boolean;
}

interface InversorRow {
  id: string;
  marca: string;
  modelo: string;
  potencia_kw: number;
  tipo: string;
  ativo: boolean;
}

const CATEGORIES = ['Ar-condicionado', 'Cozinha', 'Refrigeração', 'Lavanderia', 'Piscina', 'Veículo Elétrico'];
const TIPO_LABELS: Record<string, string> = { hora: 'Por hora (kW × h × dias)', uso: 'Por uso (kWh fixo)', km: 'Por km' };

export default function EquipmentTab() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="placas">
        <TabsList className="w-full justify-start gap-1 bg-transparent p-0">
          <TabsTrigger value="placas" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-5 py-2 rounded-lg">
            <SunMedium className="w-4 h-4" /> Placas Solares
          </TabsTrigger>
          <TabsTrigger value="inversores" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-5 py-2 rounded-lg">
            <Zap className="w-4 h-4" /> Inversores
          </TabsTrigger>
          <TabsTrigger value="calculadora" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-5 py-2 rounded-lg">
            Calculadora
          </TabsTrigger>
          <TabsTrigger value="miniaturas" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-5 py-2 rounded-lg">
            <ImageIcon className="w-4 h-4" /> Miniaturas (Proposta)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="placas"><PlacasSection /></TabsContent>
        <TabsContent value="inversores"><InversoresSection /></TabsContent>
        <TabsContent value="calculadora"><CalculadoraSection /></TabsContent>
        <TabsContent value="miniaturas"><MiniaturasSection /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── PLACAS ─── */
function PlacasSection() {
  const [items, setItems] = useState<PlacaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<PlacaRow | null>(null);
  const [form, setForm] = useState({ marca: '', modelo: '', potencia_wp: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('equipamentos_placas' as any).select('*').order('marca').order('modelo');
    setItems((data || []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditItem(null); setForm({ marca: '', modelo: '', potencia_wp: '' }); setShowForm(true); };
  const openEdit = (item: PlacaRow) => { setEditItem(item); setForm({ marca: item.marca, modelo: item.modelo, potencia_wp: String(item.potencia_wp) }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.marca.trim() || !form.modelo.trim() || !form.potencia_wp) { toast.error('Preencha marca, modelo e potência.'); return; }
    setSaving(true);
    const payload = { marca: form.marca.trim(), modelo: form.modelo.trim(), potencia_wp: parseFloat(form.potencia_wp.replace(',', '.')) || 0 };
    const { error } = editItem
      ? await supabase.from('equipamentos_placas' as any).update(payload).eq('id', editItem.id)
      : await supabase.from('equipamentos_placas' as any).insert({ ...payload, ativo: true });
    setSaving(false);
    if (error) { toast.error('Erro: ' + error.message); return; }
    toast.success(editItem ? 'Placa atualizada!' : 'Placa cadastrada!');
    setShowForm(false);
    load();
  };

  const handleDelete = async (item: PlacaRow) => {
    if (!confirm(`Excluir placa "${item.marca} ${item.modelo} ${item.potencia_wp}Wp"?\n\nAtenção: isso pode afetar projetos que usam esta placa.`)) return;
    const { error } = await supabase.from('equipamentos_placas' as any).delete().eq('id', item.id);
    if (error) { toast.error('Erro: ' + error.message); return; }
    toast.success('Placa excluída!');
    load();
  };

  const toggleActive = async (item: PlacaRow) => {
    await supabase.from('equipamentos_placas' as any).update({ ativo: !item.ativo }).eq('id', item.id);
    toast.success(item.ativo ? 'Placa desativada' : 'Placa reativada');
    load();
  };

  return (
    <div className="solar-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-primary">Placas Solares Cadastradas</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{items.length} cadastradas</span>
          <button onClick={openNew} className="solar-btn-primary text-sm py-2 px-4 flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Nova placa
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 px-2">Marca</th>
                <th className="py-2 px-2">Modelo</th>
                <th className="py-2 px-2">Potência (Wp)</th>
                <th className="py-2 px-2">Status</th>
                <th className="py-2 px-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className={`border-b border-border/50 hover:bg-muted/30 ${!item.ativo ? 'opacity-50' : ''}`}>
                  <td className="py-2 px-2 font-medium">{item.marca}</td>
                  <td className="py-2 px-2">{item.modelo}</td>
                  <td className="py-2 px-2">{item.potencia_wp} Wp</td>
                  <td className="py-2 px-2">
                    <span className={`solar-badge text-xs ${item.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {item.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(item)} className="p-1 rounded text-primary hover:bg-primary/10" title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => toggleActive(item)}
                        className={`p-1 rounded ${item.ativo ? 'text-destructive hover:bg-destructive/10' : 'text-green-700 hover:bg-green-50'}`}
                        title={item.ativo ? 'Desativar' : 'Reativar'}>
                        {item.ativo ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleDelete(item)} className="p-1 rounded text-destructive/60 hover:text-destructive hover:bg-destructive/10" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Nenhuma placa cadastrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-xl p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-primary">{editItem ? 'Editar placa' : 'Nova placa'}</h3>
            <div>
              <label className="block text-xs font-medium mb-1">Marca</label>
              <input className="solar-input text-sm" value={form.marca} onChange={e => setForm(f => ({ ...f, marca: e.target.value }))} placeholder="Ex: Astronergy" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Modelo</label>
              <input className="solar-input text-sm" value={form.modelo} onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))} placeholder="Ex: CHSM-580M" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Potência (Wp)</label>
              <input type="text" inputMode="decimal" className="solar-input text-sm" value={form.potencia_wp} onChange={e => setForm(f => ({ ...f, potencia_wp: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowForm(false)} className="solar-btn-outline text-sm py-2 px-4" disabled={saving}>Cancelar</button>
              <button onClick={handleSave} className="solar-btn-primary text-sm py-2 px-4 flex items-center gap-1.5" disabled={saving}>
                <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── INVERSORES ─── */
function InversoresSection() {
  const [items, setItems] = useState<InversorRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('equipamentos_inversores' as any).select('*').order('marca').order('modelo');
    setItems((data || []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (item: InversorRow) => {
    if (!confirm(`Excluir inversor "${item.marca} ${item.modelo} ${item.potencia_kw}kW (${item.tipo})"?\n\nAtenção: isso pode afetar projetos que usam este inversor.`)) return;
    const { error } = await supabase.from('equipamentos_inversores' as any).delete().eq('id', item.id);
    if (error) { toast.error('Erro: ' + error.message); return; }
    toast.success('Inversor excluído!');
    load();
  };

  const toggleActive = async (item: InversorRow) => {
    await supabase.from('equipamentos_inversores' as any).update({ ativo: !item.ativo }).eq('id', item.id);
    toast.success(item.ativo ? 'Inversor desativado' : 'Inversor reativado');
    load();
  };

  return (
    <div className="solar-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-primary">Inversores Cadastrados</h2>
        <span className="text-sm text-muted-foreground">{items.length} cadastrados</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 px-2">Marca</th>
                <th className="py-2 px-2">Modelo</th>
                <th className="py-2 px-2">Potência (kW)</th>
                <th className="py-2 px-2">Tipo</th>
                <th className="py-2 px-2">Status</th>
                <th className="py-2 px-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className={`border-b border-border/50 hover:bg-muted/30 ${!item.ativo ? 'opacity-50' : ''}`}>
                  <td className="py-2 px-2 font-medium">{item.marca}</td>
                  <td className="py-2 px-2">{item.modelo}</td>
                  <td className="py-2 px-2">{item.potencia_kw} kW</td>
                  <td className="py-2 px-2">
                    <span className={`solar-badge text-xs ${item.tipo === 'Micro' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                      {item.tipo}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <span className={`solar-badge text-xs ${item.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {item.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex gap-1">
                      <button onClick={() => toggleActive(item)}
                        className={`p-1 rounded ${item.ativo ? 'text-destructive hover:bg-destructive/10' : 'text-green-700 hover:bg-green-50'}`}
                        title={item.ativo ? 'Desativar' : 'Reativar'}>
                        {item.ativo ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleDelete(item)} className="p-1 rounded text-destructive/60 hover:text-destructive hover:bg-destructive/10" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Nenhum inversor cadastrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── CALCULADORA (original) ─── */
function CalculadoraSection() {
  const [items, setItems] = useState<EquipmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<EquipmentRow | null>(null);
  const [form, setForm] = useState({ nome: '', categoria: CATEGORIES[0], potencia_kw: '', tipo_medicao: 'hora', dias_mes_padrao: '30', horas_dia_padrao: '8', fator_servico: '80' });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('equipamentos_calculadora').select('*').order('categoria').order('nome');
    setItems((data as any[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditItem(null);
    setForm({ nome: '', categoria: CATEGORIES[0], potencia_kw: '', tipo_medicao: 'hora', dias_mes_padrao: '30', horas_dia_padrao: '8', fator_servico: '80' });
    setShowForm(true);
  };

  const openEdit = (item: EquipmentRow) => {
    setEditItem(item);
    setForm({
      nome: item.nome, categoria: item.categoria, potencia_kw: String(item.potencia_kw),
      tipo_medicao: item.tipo_medicao, dias_mes_padrao: String(item.dias_mes_padrao),
      horas_dia_padrao: item.horas_dia_padrao != null ? String(item.horas_dia_padrao) : '',
      fator_servico: String(Math.round((item.fator_servico || 0.80) * 100)),
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nome || !form.potencia_kw) { toast.error('Preencha nome e potência.'); return; }
    setSaving(true);
    const row = {
      nome: form.nome, categoria: form.categoria, potencia_kw: parseFloat(form.potencia_kw),
      tipo_medicao: form.tipo_medicao, dias_mes_padrao: parseInt(form.dias_mes_padrao) || 30,
      horas_dia_padrao: form.horas_dia_padrao ? parseFloat(form.horas_dia_padrao) : null,
      fator_servico: Math.max(0.10, Math.min(1.00, (parseInt(form.fator_servico) || 80) / 100)),
    };
    if (editItem) {
      await supabase.from('equipamentos_calculadora').update({ ...row, atualizado_em: new Date().toISOString() }).eq('id', editItem.id);
      toast.success('Equipamento atualizado!');
    } else {
      await supabase.from('equipamentos_calculadora').insert(row);
      toast.success('Equipamento criado!');
    }
    setSaving(false);
    setShowForm(false);
    load();
  };

  const toggleActive = async (item: EquipmentRow) => {
    await supabase.from('equipamentos_calculadora').update({ ativo: !item.ativo, atualizado_em: new Date().toISOString() }).eq('id', item.id);
    toast.success(item.ativo ? 'Equipamento desativado' : 'Equipamento reativado');
    load();
  };

  const filtered = filter === 'all' ? items : items.filter(i => i.categoria === filter);

  return (
    <div className="solar-card p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-primary">Equipamentos da Calculadora</h2>
        <button onClick={openCreate} className="solar-btn-primary text-sm py-2 px-3 flex items-center gap-1">
          <Plus className="w-4 h-4" /> Novo equipamento
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
          Todos ({items.length})
        </button>
        {CATEGORIES.map(cat => {
          const count = items.filter(i => i.categoria === cat).length;
          return (
            <button key={cat} onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === cat ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 px-2">Nome</th>
                <th className="py-2 px-2">Categoria</th>
                <th className="py-2 px-2">Potência (kW)</th>
                <th className="py-2 px-2">Fator Serv.</th>
                <th className="py-2 px-2">Tipo</th>
                <th className="py-2 px-2">h/dia</th>
                <th className="py-2 px-2">dias/mês</th>
                <th className="py-2 px-2">Status</th>
                <th className="py-2 px-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} className={`border-b border-border/50 hover:bg-muted/30 ${!item.ativo ? 'opacity-50' : ''}`}>
                  <td className="py-2 px-2 font-medium">{item.nome}</td>
                  <td className="py-2 px-2 text-muted-foreground">{item.categoria}</td>
                  <td className="py-2 px-2">{item.potencia_kw}</td>
                  <td className="py-2 px-2">{Math.round((item.fator_servico || 0.80) * 100)}%</td>
                  <td className="py-2 px-2 text-xs text-muted-foreground">{TIPO_LABELS[item.tipo_medicao] || item.tipo_medicao}</td>
                  <td className="py-2 px-2">{item.horas_dia_padrao ?? '—'}</td>
                  <td className="py-2 px-2">{item.dias_mes_padrao}</td>
                  <td className="py-2 px-2">
                    <span className={`solar-badge text-xs ${item.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {item.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(item)} className="text-primary hover:text-primary/80" title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => toggleActive(item)}
                        className={`p-1 rounded ${item.ativo ? 'text-destructive hover:bg-destructive/10' : 'text-green-700 hover:bg-green-50'}`}
                        title={item.ativo ? 'Desativar' : 'Reativar'}>
                        {item.ativo ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-xl p-6 max-w-md w-full mx-4 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-primary">{editItem ? 'Editar Equipamento' : 'Novo Equipamento'}</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium mb-1">Nome</label>
                <input className="solar-input" value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} /></div>
              <div><label className="block text-sm font-medium mb-1">Categoria</label>
                <select className="solar-input" value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select></div>
              <div><label className="block text-sm font-medium mb-1">Potência (kW)</label>
                <input className="solar-input" type="number" step="0.01" value={form.potencia_kw} onChange={e => setForm(p => ({ ...p, potencia_kw: e.target.value }))} /></div>
              <div><label className="block text-sm font-medium mb-1">Tipo de medição</label>
                <select className="solar-input" value={form.tipo_medicao} onChange={e => setForm(p => ({ ...p, tipo_medicao: e.target.value }))}>
                  <option value="hora">Por hora (kW × horas × dias)</option>
                  <option value="uso">Por uso (kWh fixo por uso)</option>
                  <option value="km">Por km (veículo elétrico)</option>
                </select></div>
              {form.tipo_medicao !== 'km' && (
                <div><label className="block text-sm font-medium mb-1">Horas/dia padrão</label>
                  <input className="solar-input" type="number" step="0.5" value={form.horas_dia_padrao} onChange={e => setForm(p => ({ ...p, horas_dia_padrao: e.target.value }))} /></div>
              )}
              <div><label className="block text-sm font-medium mb-1">Dias/mês padrão</label>
                <input className="solar-input" type="number" value={form.dias_mes_padrao} onChange={e => setForm(p => ({ ...p, dias_mes_padrao: e.target.value }))} /></div>
              <div><label className="block text-sm font-medium mb-1">Fator de Serviço (%)</label>
                <input className="solar-input" type="number" min="10" max="100" value={form.fator_servico} onChange={e => setForm(p => ({ ...p, fator_servico: e.target.value }))} />
                <p className="text-xs text-muted-foreground mt-1">Quanto o equipamento trabalha em relação à potência nominal (10-100%)</p></div>
              <button className="w-full solar-btn-primary flex items-center justify-center gap-2" onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── MINIATURAS (imagens usadas na proposta comercial) ─── */
function BrandImageManager({
  title, description, field, settings, persist, uploadTo, pathPrefix, realBrands,
}: {
  title: string;
  description: string;
  field: 'inverterBrandImages' | 'microInverterBrandImages';
  settings: ReturnType<typeof getSettings>;
  persist: (next: ReturnType<typeof getSettings>) => Promise<void>;
  uploadTo: (file: File, path: string) => Promise<string | null>;
  pathPrefix: string;
  realBrands: string[];
}) {
  const [novaMarca, setNovaMarca] = useState('');
  const [uploadingBrand, setUploadingBrand] = useState<string | null>(null);
  const brands = Object.entries(settings[field] || {});
  const cadastradas = new Set(brands.map(([m]) => m));
  const semImagem = realBrands.filter(b => !cadastradas.has(b));
  const orfas = brands.filter(([m]) => realBrands.length > 0 && !realBrands.includes(m));

  const handleBrandUpload = async (marca: string, file: File) => {
    const key = marca.trim().toUpperCase();
    if (!key) return;
    setUploadingBrand(key);
    const ext = file.name.split('.').pop();
    const url = await uploadTo(file, `${pathPrefix}-${key.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.${ext}`);
    setUploadingBrand(null);
    if (!url) return;
    await persist({ ...settings, [field]: { ...(settings[field] || {}), [key]: url } });
    toast.success(`Miniatura de ${key} salva!`);
  };

  const removeBrand = async (key: string) => {
    const imgs = { ...(settings[field] || {}) };
    delete imgs[key];
    await persist({ ...settings, [field]: imgs });
  };

  return (
    <div>
      <h3 className="text-lg font-bold text-primary mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>

      <div className="flex flex-wrap gap-4 mb-4">
        {brands.map(([marca, url]) => (
          <div key={marca} className="w-36 text-center">
            <div className="w-full aspect-square rounded-xl border-2 border-dashed border-border bg-card flex items-center justify-center overflow-hidden mb-1.5">
              <img src={url as string} alt={marca} className="w-full h-full object-contain p-2" />
            </div>
            <p className="text-xs font-semibold truncate">{marca}</p>
            {realBrands.length > 0 && !realBrands.includes(marca) && (
              <p className="text-[10px] text-destructive font-medium">⚠ não usada em nenhum kit ativo</p>
            )}
            <div className="flex items-center justify-center gap-2 mt-1">
              <label className="text-xs text-primary hover:underline cursor-pointer">
                Trocar
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && handleBrandUpload(marca, e.target.files[0])} />
              </label>
              <button onClick={() => removeBrand(marca)} className="text-xs text-destructive hover:underline">Remover</button>
            </div>
            {uploadingBrand === marca && <p className="text-[10px] text-muted-foreground">Enviando...</p>}
          </div>
        ))}
      </div>

      {semImagem.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-2">
            Marcas usadas em kits ativos que ainda não têm miniatura — clique pra preencher o nome certinho:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {semImagem.map(b => (
              <button key={b} onClick={() => setNovaMarca(b)}
                className="text-xs px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-800 font-medium">
                {b}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-end gap-2 max-w-md">
        <div className="flex-1">
          <label className="block text-xs font-medium mb-1">Nova marca (ex: SOFAR, SOLIS, GOODWE)</label>
          <input className="solar-input text-sm" value={novaMarca} onChange={e => setNovaMarca(e.target.value)}
            placeholder="Nome da marca" />
        </div>
        <label className={`solar-btn-outline text-sm py-2 px-3 flex items-center gap-1.5 cursor-pointer ${!novaMarca.trim() ? 'opacity-50 pointer-events-none' : ''}`}>
          <Upload className="w-4 h-4" /> Enviar imagem
          <input type="file" accept="image/*" className="hidden"
            onChange={e => { if (e.target.files?.[0] && novaMarca.trim()) { handleBrandUpload(novaMarca, e.target.files[0]); setNovaMarca(''); } }} />
        </label>
      </div>
    </div>
  );
}

/* ─── MINIATURAS (imagens usadas na proposta comercial) ─── */
function MiniaturasSection() {
  const [settings, setSettingsState] = useState(getSettings());
  const [uploadingPanel, setUploadingPanel] = useState(false);
  const kits = getKits();
  const inverterBrands = Array.from(new Set(
    kits.filter(k => k.type === 'inversor' && k.line !== 'premium' && k.active).map(k => k.brand.trim().toUpperCase())
  )).sort();
  const microInverterBrands = Array.from(new Set(
    kits.filter(k => k.type === 'inversor' && k.line === 'premium' && k.active).map(k => k.brand.trim().toUpperCase())
  )).sort();

  const persist = async (next: typeof settings) => {
    setSettingsState(next);
    saveSettings(next);
    try {
      const { saveEquipmentImagesDB } = await import('@/data/supabaseStore');
      await saveEquipmentImagesDB({
        inverterBrandImages: next.inverterBrandImages || {},
        microInverterBrandImages: next.microInverterBrandImages || {},
        panelImage: next.panelImage || '',
      });
    } catch { /* segue local se offline */ }
  };

  const uploadTo = async (file: File, path: string): Promise<string | null> => {
    const { error } = await supabase.storage.from('site-content').upload(path, file);
    if (error) { toast.error('Erro ao fazer upload: ' + error.message); return null; }
    const { data } = supabase.storage.from('site-content').getPublicUrl(path);
    return data.publicUrl;
  };

  const handlePanelUpload = async (file: File) => {
    setUploadingPanel(true);
    const ext = file.name.split('.').pop();
    const url = await uploadTo(file, `equipamentos/placa-padrao-${Date.now()}.${ext}`);
    setUploadingPanel(false);
    if (!url) return;
    await persist({ ...settings, panelImage: url });
    toast.success('Miniatura de placas salva!');
  };

  return (
    <div className="solar-card p-6 space-y-6">
      <BrandImageManager
        title="Miniaturas por marca de inversor (string)"
        description="Cada proposta com inversor string mostra automaticamente a miniatura da marca escolhida. O nome digitado aqui precisa bater com a marca usada no inversor (não diferencia maiúsculas/minúsculas)."
        field="inverterBrandImages"
        settings={settings}
        persist={persist}
        uploadTo={uploadTo}
        pathPrefix="equipamentos/inversor"
        realBrands={inverterBrands}
      />

      <div className="border-t border-border pt-6">
        <BrandImageManager
          title="Miniaturas por marca de MICRO inversor (linha Premium)"
          description="Usada nas propostas da linha Premium (microinversores) — separada da imagem do inversor string, já que o produto é visualmente diferente mesmo sendo a mesma marca."
          field="microInverterBrandImages"
          settings={settings}
          persist={persist}
          uploadTo={uploadTo}
          pathPrefix="equipamentos/microinversor"
          realBrands={microInverterBrands}
        />
      </div>

      <div className="border-t border-border pt-6">
        <h3 className="text-lg font-bold text-primary mb-1">Miniatura de placas</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Uma única imagem, usada em todas as propostas independente da marca da placa.
        </p>
        <div className="w-36 text-center">
          <div className="w-full aspect-square rounded-xl border-2 border-dashed border-border bg-card flex items-center justify-center overflow-hidden mb-1.5">
            {settings.panelImage
              ? <img src={settings.panelImage} alt="Placas" className="w-full h-full object-contain p-2" />
              : <SunMedium className="w-8 h-8 text-muted-foreground" />}
          </div>
          <label className="text-xs text-primary hover:underline cursor-pointer">
            {settings.panelImage ? 'Trocar' : 'Enviar imagem'}
            <input type="file" accept="image/*" className="hidden"
              onChange={e => e.target.files?.[0] && handlePanelUpload(e.target.files[0])} />
          </label>
          {uploadingPanel && <p className="text-[10px] text-muted-foreground">Enviando...</p>}
        </div>
      </div>
    </div>
  );
}
