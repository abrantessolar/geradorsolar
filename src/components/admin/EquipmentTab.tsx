import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit2, X, Save, Power, PowerOff } from 'lucide-react';
import { toast } from 'sonner';

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

const CATEGORIES = ['Ar-condicionado', 'Cozinha', 'Refrigeração', 'Lavanderia', 'Piscina', 'Veículo Elétrico'];
const TIPO_LABELS: Record<string, string> = { hora: 'Por hora (kW × h × dias)', uso: 'Por uso (kWh fixo)', km: 'Por km' };

export default function EquipmentTab() {
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
    setForm({ nome: '', categoria: CATEGORIES[0], potencia_kw: '', tipo_medicao: 'hora', dias_mes_padrao: '30', horas_dia_padrao: '8' });
    setShowForm(true);
  };

  const openEdit = (item: EquipmentRow) => {
    setEditItem(item);
    setForm({
      nome: item.nome,
      categoria: item.categoria,
      potencia_kw: String(item.potencia_kw),
      tipo_medicao: item.tipo_medicao,
      dias_mes_padrao: String(item.dias_mes_padrao),
      horas_dia_padrao: item.horas_dia_padrao != null ? String(item.horas_dia_padrao) : '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nome || !form.potencia_kw) { toast.error('Preencha nome e potência.'); return; }
    setSaving(true);
    const row = {
      nome: form.nome,
      categoria: form.categoria,
      potencia_kw: parseFloat(form.potencia_kw),
      tipo_medicao: form.tipo_medicao,
      dias_mes_padrao: parseInt(form.dias_mes_padrao) || 30,
      horas_dia_padrao: form.horas_dia_padrao ? parseFloat(form.horas_dia_padrao) : null,
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

      {/* Filter */}
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

      {/* Form modal */}
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
