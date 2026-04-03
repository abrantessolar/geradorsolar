import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Save, X, Edit2, Trash2, Upload } from 'lucide-react';
import type { Material, Fornecedor, QuantidadePadrao } from './types';
import { CATEGORIAS, CATEGORIA_ICONS, POTENCIAS } from './types';

export default function ProdutosTab() {
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    nome: '', categoria: 'Outros', fornecedor_id: '', preco_unitario: '', unidade: 'unidade',
  });
  const [qtdPadrao, setQtdPadrao] = useState<Record<string, number>>({});
  const [estoqueMap, setEstoqueMap] = useState<Record<string, number>>({});

  const load = async () => {
    setLoading(true);
    const [{ data: mats }, { data: forns }, { data: estoque }] = await Promise.all([
      supabase.from('materiais' as any).select('*, fornecedores_materiais(nome)').eq('ativo', true).order('categoria').order('nome'),
      supabase.from('fornecedores_materiais' as any).select('*').eq('ativo', true).order('nome'),
      supabase.from('estoque' as any).select('*'),
    ]);
    setMateriais((mats || []).map((m: any) => ({ ...m, fornecedor: m.fornecedores_materiais })));
    setFornecedores((forns || []) as any);
    const eMap: Record<string, number> = {};
    (estoque || []).forEach((e: any) => { eMap[e.material_id] = e.quantidade_atual; });
    setEstoqueMap(eMap);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleEdit = async (m: Material) => {
    setForm({
      nome: m.nome, categoria: m.categoria, fornecedor_id: m.fornecedor_id || '',
      preco_unitario: m.preco_unitario?.toString() || '', unidade: m.unidade,
    });
    setEditId(m.id);
    const { data } = await supabase.from('materiais_quantidades_padrao' as any).select('*').eq('material_id', m.id);
    const qMap: Record<string, number> = {};
    (data || []).forEach((q: any) => { qMap[q.potencia] = q.quantidade; });
    setQtdPadrao(qMap);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return; }
    const row = {
      nome: form.nome, categoria: form.categoria,
      fornecedor_id: form.fornecedor_id || null,
      preco_unitario: form.preco_unitario ? parseFloat(form.preco_unitario) : null,
      unidade: form.unidade,
    };

    let materialId = editId;
    if (editId) {
      const { error } = await supabase.from('materiais' as any).update(row).eq('id', editId);
      if (error) { toast.error(error.message); return; }
    } else {
      const { data, error } = await supabase.from('materiais' as any).insert(row).select('id').single();
      if (error) { toast.error(error.message); return; }
      materialId = (data as any).id;
      // Create estoque entry
      await supabase.from('estoque' as any).insert({ material_id: materialId, quantidade_atual: 0 });
    }

    // Save quantidades padrão
    if (materialId) {
      await supabase.from('materiais_quantidades_padrao' as any).delete().eq('material_id', materialId);
      const rows = Object.entries(qtdPadrao).filter(([, q]) => q > 0).map(([pot, q]) => ({
        material_id: materialId, potencia: pot, quantidade: q,
      }));
      if (rows.length > 0) await supabase.from('materiais_quantidades_padrao' as any).insert(rows);
    }

    toast.success(editId ? 'Material atualizado!' : 'Material cadastrado!');
    setShowForm(false);
    setEditId(null);
    setForm({ nome: '', categoria: 'Outros', fornecedor_id: '', preco_unitario: '', unidade: 'unidade' });
    setQtdPadrao({});
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir material?')) return;
    await supabase.from('materiais' as any).update({ ativo: false }).eq('id', id);
    toast.success('Material desativado!');
    load();
  };

  const handleImportPadrao = async () => {
    if (!confirm('Isso irá substituir todos os materiais atuais pela tabela padrão com 48 itens. Confirmar?')) return;
    
    toast.info('Importando tabela padrão de materiais...');
    try {
      const { MATERIAIS_PADRAO, CABOS_PADRAO } = await import('./defaultMaterials');
      
      // 1. Delete existing quantidades padrão, estoque, and materiais
      await supabase.from('materiais_quantidades_padrao' as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('estoque' as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('materiais' as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');

      let matCount = 0;
      for (const mat of MATERIAIS_PADRAO) {
        const { data, error } = await supabase.from('materiais' as any)
          .insert({ nome: mat.nome, categoria: mat.categoria, unidade: mat.unidade || 'unidade' })
          .select('id').single();
        if (error || !data) continue;
        const matId = (data as any).id;
        matCount++;
        
        // Create stock entry
        await supabase.from('estoque' as any).insert({ material_id: matId, quantidade_atual: 0 });
        
        // Insert quantities (only non-zero)
        if (mat.quantidades) {
          const rows = Object.entries(mat.quantidades).filter(([, q]) => (q as number) > 0).map(([pot, q]) => ({
            material_id: matId, potencia: pot, quantidade: q,
          }));
          if (rows.length > 0) await supabase.from('materiais_quantidades_padrao' as any).insert(rows);
        }
      }

      // 2. Import cabos padrão
      await supabase.from('cabos_padrao' as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      const caboRows = CABOS_PADRAO.map(c => ({ potencia: c.potencia, tipo_cabo: c.tipo_cabo, observacao: c.observacao || null }));
      await supabase.from('cabos_padrao' as any).insert(caboRows);

      toast.success(`${matCount} materiais e ${caboRows.length} cabos importados com sucesso!`);
      load();
    } catch (err: any) {
      toast.error('Erro na importação: ' + err.message);
    }
  };

  const filtered = materiais.filter(m => {
    if (catFilter && m.categoria !== catFilter) return false;
    if (search && !m.nome.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input className="solar-input max-w-xs" placeholder="Buscar material..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="solar-input max-w-[180px]" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">Todas categorias</option>
          {CATEGORIAS.map(c => <option key={c} value={c}>{CATEGORIA_ICONS[c]} {c}</option>)}
        </select>
        <div className="ml-auto flex gap-2">
          <button onClick={() => { setShowForm(true); setEditId(null); setForm({ nome: '', categoria: 'Outros', fornecedor_id: '', preco_unitario: '', unidade: 'unidade' }); setQtdPadrao({}); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground">
            <Plus className="w-4 h-4" /> Novo Material
          </button>
        </div>
      </div>

      {showForm && (
        <div className="solar-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">{editId ? 'Editar' : 'Novo'} Material</h4>
            <button onClick={() => { setShowForm(false); setEditId(null); }}><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input className="solar-input" placeholder="Nome *" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            <select className="solar-input" value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="solar-input" value={form.fornecedor_id} onChange={e => setForm(f => ({ ...f, fornecedor_id: e.target.value }))}>
              <option value="">Sem fornecedor</option>
              {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
            <input className="solar-input" type="number" step="0.01" placeholder="Preço unitário" value={form.preco_unitario} onChange={e => setForm(f => ({ ...f, preco_unitario: e.target.value }))} />
            <select className="solar-input" value={form.unidade} onChange={e => setForm(f => ({ ...f, unidade: e.target.value }))}>
              <option value="unidade">Unidade</option>
              <option value="metros">Metros</option>
              <option value="par">Par</option>
              <option value="kit">Kit</option>
            </select>
          </div>

          <div>
            <h5 className="text-xs font-semibold mb-2">Quantidades Padrão por Potência</h5>
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-2">
              {POTENCIAS.map(pot => (
                <div key={pot} className="text-center">
                  <label className="block text-[10px] text-muted-foreground mb-1">{pot}</label>
                  <input className="solar-input text-center text-xs w-full" type="number" min="0"
                    value={qtdPadrao[pot] || ''}
                    onChange={e => setQtdPadrao(q => ({ ...q, [pot]: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              ))}
            </div>
          </div>

          <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground">
            <Save className="w-4 h-4" /> Salvar
          </button>
        </div>
      )}

      <div className="solar-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-3 px-4">Material</th>
              <th className="py-3 px-4">Categoria</th>
              <th className="py-3 px-4">Fornecedor</th>
              <th className="py-3 px-4">Preço Unit.</th>
              <th className="py-3 px-4">Estoque</th>
              <th className="py-3 px-4">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => (
              <tr key={m.id} className="border-b border-border/50 hover:bg-muted/30">
                <td className="py-3 px-4 font-medium">
                  <span className="mr-2">{CATEGORIA_ICONS[m.categoria] || '📦'}</span>
                  {m.nome}
                </td>
                <td className="py-3 px-4 text-muted-foreground">{m.categoria}</td>
                <td className="py-3 px-4 text-muted-foreground">{(m as any).fornecedores_materiais?.nome || '—'}</td>
                <td className="py-3 px-4">{m.preco_unitario ? `R$ ${Number(m.preco_unitario).toFixed(2)}` : '—'}</td>
                <td className="py-3 px-4">
                  <span className={`font-medium ${(estoqueMap[m.id] || 0) === 0 ? 'text-destructive' : ''}`}>
                    {estoqueMap[m.id] ?? 0}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(m)} className="text-primary hover:text-primary/80"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(m.id)} className="text-destructive hover:text-destructive/80"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Nenhum material cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <span className="text-xs text-muted-foreground">{filtered.length} material(is)</span>
    </div>
  );
}
