import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Save, X, Edit2, Trash2 } from 'lucide-react';
import type { Fornecedor } from './types';

export default function FornecedoresTab() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: '', contato: '', telefone: '' });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('fornecedores_materiais' as any).select('*').order('nome');
    setFornecedores((data || []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return; }
    const row = { nome: form.nome, contato: form.contato || null, telefone: form.telefone || null };
    if (editId) {
      const { error } = await supabase.from('fornecedores_materiais' as any).update(row).eq('id', editId);
      if (error) { toast.error(error.message); return; }
      toast.success('Fornecedor atualizado!');
    } else {
      const { error } = await supabase.from('fornecedores_materiais' as any).insert(row);
      if (error) { toast.error(error.message); return; }
      toast.success('Fornecedor cadastrado!');
    }
    setForm({ nome: '', contato: '', telefone: '' });
    setShowForm(false);
    setEditId(null);
    load();
  };

  const handleEdit = (f: Fornecedor) => {
    setForm({ nome: f.nome, contato: f.contato || '', telefone: f.telefone || '' });
    setEditId(f.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir fornecedor?')) return;
    await supabase.from('fornecedores_materiais' as any).delete().eq('id', id);
    toast.success('Fornecedor excluído!');
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Fornecedores de Materiais</h3>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ nome: '', contato: '', telefone: '' }); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground">
          <Plus className="w-4 h-4" /> Novo Fornecedor
        </button>
      </div>

      {showForm && (
        <div className="solar-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">{editId ? 'Editar' : 'Novo'} Fornecedor</h4>
            <button onClick={() => { setShowForm(false); setEditId(null); }}><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input className="solar-input" placeholder="Nome *" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            <input className="solar-input" placeholder="Contato" value={form.contato} onChange={e => setForm(f => ({ ...f, contato: e.target.value }))} />
            <input className="solar-input" placeholder="Telefone" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} />
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
              <th className="py-3 px-4">Nome</th>
              <th className="py-3 px-4">Contato</th>
              <th className="py-3 px-4">Telefone</th>
              <th className="py-3 px-4">Ações</th>
            </tr>
          </thead>
          <tbody>
            {fornecedores.map(f => (
              <tr key={f.id} className="border-b border-border/50 hover:bg-muted/30">
                <td className="py-3 px-4 font-medium">{f.nome}</td>
                <td className="py-3 px-4 text-muted-foreground">{f.contato || '—'}</td>
                <td className="py-3 px-4 text-muted-foreground">{f.telefone || '—'}</td>
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(f)} className="text-primary hover:text-primary/80"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(f.id)} className="text-destructive hover:text-destructive/80"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {fornecedores.length === 0 && (
              <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">Nenhum fornecedor cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
