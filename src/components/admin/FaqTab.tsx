import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FAQ_SETORES, getSetor, type FaqItem } from '@/lib/faqSetores';
import { Plus, Edit2, Trash2, X, Save, Bold, List, Link as LinkIcon, Eye, EyeOff, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY: Partial<FaqItem> = {
  setor: 'geral',
  pergunta: '',
  resposta: '',
  visivel_cliente: true,
  visivel_site: true,
  ativo: true,
  ordem: 0,
};

export default function FaqTab() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<FaqItem> | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('faq')
      .select('*')
      .order('setor')
      .order('ordem')
      .order('criado_em');
    setItems((data as FaqItem[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleAtivo = async (item: FaqItem) => {
    const { error } = await supabase.from('faq').update({ ativo: !item.ativo }).eq('id', item.id);
    if (error) return toast.error('Erro ao atualizar.');
    toast.success(item.ativo ? 'Pergunta desativada.' : 'Pergunta ativada.');
    load();
  };

  const excluir = async (item: FaqItem) => {
    if (!confirm('Excluir esta pergunta definitivamente?')) return;
    const { error } = await supabase.from('faq').delete().eq('id', item.id);
    if (error) return toast.error('Erro ao excluir.');
    toast.success('Pergunta excluída.');
    load();
  };

  const grupos = useMemo(() => {
    return FAQ_SETORES.map((s) => ({
      setor: s,
      itens: items.filter((i) => i.setor === s.key),
    })).filter((g) => g.itens.length > 0);
  }, [items]);

  return (
    <div className="solar-card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-primary">Dúvidas Frequentes (FAQ)</h2>
          <p className="text-sm text-muted-foreground">Gerencie as perguntas exibidas no site público e no link do cliente.</p>
        </div>
        <button
          onClick={() => setEditing({ ...EMPTY })}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" /> Nova pergunta
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Carregando...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma pergunta cadastrada.</p>
      ) : (
        <div className="space-y-6">
          {grupos.map((g) => (
            <div key={g.setor.key}>
              <h3 className="text-sm font-bold text-foreground mb-2">
                {g.setor.icone} {g.setor.label}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground text-xs">
                      <th className="text-left py-2 px-2 w-12">Ordem</th>
                      <th className="text-left py-2 px-2">Pergunta</th>
                      <th className="text-center py-2 px-2 w-20">Ativo</th>
                      <th className="text-right py-2 px-2 w-32">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.itens.map((item) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="py-2 px-2 text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <GripVertical className="w-3.5 h-3.5 opacity-40" /> {item.ordem}
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-2">
                            {item.pergunta}
                            <span className="flex gap-1 shrink-0">
                              {item.visivel_site && <span title="Visível no site" className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Site</span>}
                              {item.visivel_cliente && <span title="Visível no link do cliente" className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Cliente</span>}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className={`text-xs font-medium ${item.ativo ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {item.ativo ? 'Sim' : 'Não'}
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => setEditing(item)} className="p-1.5 rounded hover:bg-muted" title="Editar">
                              <Edit2 className="w-4 h-4 text-muted-foreground" />
                            </button>
                            <button onClick={() => toggleAtivo(item)} className="p-1.5 rounded hover:bg-muted" title={item.ativo ? 'Desativar' : 'Ativar'}>
                              {item.ativo ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                            </button>
                            <button onClick={() => excluir(item)} className="p-1.5 rounded hover:bg-muted" title="Excluir">
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <FaqForm item={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function FaqForm({ item, onClose, onSaved }: { item: Partial<FaqItem>; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<FaqItem>>(item);
  const [saving, setSaving] = useState(false);
  const respRef = useRef<HTMLTextAreaElement>(null);

  const set = (k: keyof FaqItem, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const inserir = (antes: string, depois: string, placeholder: string) => {
    const ta = respRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const value = form.resposta || '';
    const sel = value.slice(start, end) || placeholder;
    const novo = value.slice(0, start) + antes + sel + depois + value.slice(end);
    set('resposta', novo);
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = start + antes.length;
      ta.selectionEnd = start + antes.length + sel.length;
    }, 0);
  };

  const inserirLink = () => {
    const url = prompt('Endereço do link (https://...):', 'https://');
    if (!url) return;
    inserir(`<a href="${url}" target="_blank" rel="noopener noreferrer">`, '</a>', 'texto do link');
  };

  const salvar = async () => {
    if (!form.pergunta?.trim() || !form.resposta?.trim()) {
      toast.error('Preencha a pergunta e a resposta.');
      return;
    }
    setSaving(true);
    const payload = {
      setor: form.setor || 'geral',
      pergunta: form.pergunta.trim(),
      resposta: form.resposta.trim(),
      visivel_cliente: !!form.visivel_cliente,
      visivel_site: !!form.visivel_site,
      ativo: !!form.ativo,
      ordem: Number(form.ordem) || 0,
    };
    const { error } = form.id
      ? await supabase.from('faq').update(payload).eq('id', form.id)
      : await supabase.from('faq').insert(payload);
    setSaving(false);
    if (error) return toast.error('Erro ao salvar: ' + error.message);
    toast.success('Pergunta salva!');
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card">
          <h3 className="text-lg font-bold text-foreground">{form.id ? 'Editar pergunta' : 'Nova pergunta'}</h3>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-muted">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Setor</label>
              <select
                value={form.setor}
                onChange={(e) => set('setor', e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                {FAQ_SETORES.map((s) => (
                  <option key={s.key} value={s.key}>{s.icone} {s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Ordem de exibição</label>
              <input
                type="number"
                value={form.ordem ?? 0}
                onChange={(e) => set('ordem', e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Pergunta</label>
            <input
              value={form.pergunta || ''}
              onChange={(e) => set('pergunta', e.target.value)}
              placeholder="Ex: Qual é a previsão de instalação?"
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Resposta</label>
            <div className="flex gap-1 mb-2">
              <button type="button" onClick={() => inserir('<strong>', '</strong>', 'texto')} className="p-2 rounded border border-input hover:bg-muted" title="Negrito">
                <Bold className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => inserir('<ul>\n  <li>', '</li>\n</ul>', 'item')} className="p-2 rounded border border-input hover:bg-muted" title="Lista">
                <List className="w-4 h-4" />
              </button>
              <button type="button" onClick={inserirLink} className="p-2 rounded border border-input hover:bg-muted" title="Link">
                <LinkIcon className="w-4 h-4" />
              </button>
            </div>
            <textarea
              ref={respRef}
              value={form.resposta || ''}
              onChange={(e) => set('resposta', e.target.value)}
              rows={6}
              placeholder="Escreva a resposta. Use os botões acima para negrito, listas e links."
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-mono"
            />
            {form.resposta && (
              <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Pré-visualização</p>
                <div className="text-sm text-muted-foreground leading-relaxed faq-content" dangerouslySetInnerHTML={{ __html: form.resposta }} />
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-4">
            <Toggle label="Visível no link do cliente" value={!!form.visivel_cliente} onChange={(v) => set('visivel_cliente', v)} />
            <Toggle label="Visível no site público" value={!!form.visivel_site} onChange={(v) => set('visivel_site', v)} />
            <Toggle label="Ativo" value={!!form.ativo} onChange={(v) => set('ativo', v)} />
          </div>
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-border sticky bottom-0 bg-card">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-input text-sm font-medium hover:bg-muted">
            Cancelar
          </button>
          <button onClick={salvar} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)} className="flex items-center gap-2 text-sm">
      <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${value ? 'bg-primary' : 'bg-input'}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </span>
      <span className="text-foreground">{label}</span>
    </button>
  );
}
