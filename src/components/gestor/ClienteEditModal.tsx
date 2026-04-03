import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, X, Plus } from 'lucide-react';
import type { ClienteBase } from './ClientesList';

export default function ClienteEditModal({ cliente, onClose, onSaved }: {
  cliente: ClienteBase;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isFromProjeto = cliente.id.startsWith('proj-');
  const [form, setForm] = useState({
    nome_completo: cliente.nome_completo || '',
    cpf: cliente.cpf || '',
    endereco: cliente.endereco || '',
    telefone: cliente.telefone || '',
    telefone_2: (cliente as any).telefone_2 || '',
    telefone_3: (cliente as any).telefone_3 || '',
    uc: cliente.uc || '',
    concessionaria: cliente.concessionaria || 'ELEKTRO',
    valor: cliente.valor?.toString() || '',
    forma_pagamento: cliente.forma_pagamento || '',
    instalado_em: cliente.instalado_em || '',
    observacoes: (cliente as any).observacoes || '',
    tipo_inversor: cliente.tipo_inversor || 'String',
    qtd_inversores: cliente.qtd_inversores?.toString() || '',
    marca_inversor: cliente.marca_inversor || '',
    potencia_inversor: cliente.potencia_inversor || '',
  });
  const [saving, setSaving] = useState(false);
  const [showTel2, setShowTel2] = useState(!!form.telefone_2);
  const [showTel3, setShowTel3] = useState(!!form.telefone_3);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    if (isFromProjeto) {
      const realId = cliente.id.replace('proj-', '');
      const { error } = await supabase.from('projetos' as any).update({
        nome_completo: form.nome_completo || null,
        cpf: form.cpf || null,
        endereco_completo: form.endereco || null,
        telefone: form.telefone || null,
        unidade_geradora_codigo_uc: form.uc || null,
        concessionaria: form.concessionaria,
        preco_venda: form.valor ? parseFloat(form.valor) : null,
        forma_pagamento: form.forma_pagamento || null,
        data_instalacao: form.instalado_em || null,
        objecoes: form.observacoes || null,
      }).eq('id', realId);
      setSaving(false);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from('clientes_base' as any).update({
        nome_completo: form.nome_completo || null,
        cpf: form.cpf || null,
        endereco: form.endereco || null,
        telefone: form.telefone || null,
        telefone_2: form.telefone_2 || null,
        telefone_3: form.telefone_3 || null,
        uc: form.uc || null,
        concessionaria: form.concessionaria,
        valor: form.valor ? parseFloat(form.valor) : null,
        forma_pagamento: form.forma_pagamento || null,
        instalado_em: form.instalado_em || null,
        observacoes: form.observacoes || null,
      }).eq('id', cliente.id);
      setSaving(false);
      if (error) { toast.error(error.message); return; }
    }
    toast.success('Cliente atualizado!');
    onSaved();
    onClose();
  };

  const inputClass = 'solar-input';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-primary">Editar Cliente</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Nome</label><input className={inputClass} value={form.nome_completo} onChange={e => set('nome_completo', e.target.value)} /></div>
          <div><label className="block text-sm font-medium mb-1">CPF</label><input className={inputClass} value={form.cpf} onChange={e => set('cpf', e.target.value)} /></div>
          <div className="md:col-span-2"><label className="block text-sm font-medium mb-1">Endereço</label><input className={inputClass} value={form.endereco} onChange={e => set('endereco', e.target.value)} /></div>
          <div>
            <label className="block text-sm font-medium mb-1">Telefone 1</label>
            <input className={inputClass} value={form.telefone} onChange={e => set('telefone', e.target.value)} />
          </div>
          {showTel2 ? (
            <div>
              <label className="block text-sm font-medium mb-1">Telefone 2</label>
              <input className={inputClass} value={form.telefone_2} onChange={e => set('telefone_2', e.target.value)} />
            </div>
          ) : null}
          {showTel3 ? (
            <div>
              <label className="block text-sm font-medium mb-1">Telefone 3</label>
              <input className={inputClass} value={form.telefone_3} onChange={e => set('telefone_3', e.target.value)} />
            </div>
          ) : null}
          {(!showTel2 || !showTel3) && (
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => { if (!showTel2) setShowTel2(true); else setShowTel3(true); }}
                className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
              >
                <Plus className="w-4 h-4" /> Adicionar telefone
              </button>
            </div>
          )}
          <div><label className="block text-sm font-medium mb-1">UC</label><input className={inputClass} value={form.uc} onChange={e => set('uc', e.target.value)} /></div>
          <div><label className="block text-sm font-medium mb-1">Concessionária</label>
            <select className={inputClass} value={form.concessionaria} onChange={e => set('concessionaria', e.target.value)}>
              {['ELEKTRO', 'ENERGISA', 'COPEL', 'OUTRA'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium mb-1">Valor (R$)</label><input className={inputClass} type="number" step="0.01" value={form.valor} onChange={e => set('valor', e.target.value)} /></div>
          <div><label className="block text-sm font-medium mb-1">Forma de Pagamento</label><input className={inputClass} value={form.forma_pagamento} onChange={e => set('forma_pagamento', e.target.value)} /></div>
          <div><label className="block text-sm font-medium mb-1">Instalado em</label><input className={inputClass} type="date" value={form.instalado_em} onChange={e => set('instalado_em', e.target.value)} /></div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Observações</label>
            <textarea className={`${inputClass} min-h-[80px]`} value={form.observacoes} onChange={e => set('observacoes', e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
