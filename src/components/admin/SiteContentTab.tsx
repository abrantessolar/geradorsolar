import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Save, GripVertical, Eye, EyeOff, Upload, Image, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';

interface PortfolioPhoto {
  id: string;
  url: string;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
}

interface PartnerLogo {
  id: string;
  url: string;
  nome: string;
  url_site: string | null;
  ordem: number;
  ativo: boolean;
}

export default function SiteContentTab() {
  const [section, setSection] = useState<'portfolio' | 'partners' | 'diferenciais'>('portfolio');

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setSection('portfolio')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${section === 'portfolio' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
          Portfólio de Obras
        </button>
        <button onClick={() => setSection('partners')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${section === 'partners' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
          Parceiros
        </button>
        <button onClick={() => setSection('diferenciais')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${section === 'diferenciais' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
          Diferenciais
        </button>
      </div>

      {section === 'portfolio' && <PortfolioSection />}
      {section === 'partners' && <PartnersSection />}
      {section === 'diferenciais' && <DiferenciaisSection />}
    </div>
  );
}

function PortfolioSection() {
  const [photos, setPhotos] = useState<PortfolioPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [showUrlForm, setShowUrlForm] = useState(false);

  const loadPhotos = async () => {
    const { data } = await supabase.from('fotos_portfolio').select('*').order('ordem');
    setPhotos((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { loadPhotos(); }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `portfolio/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('site-content').upload(path, file);
    if (error) { toast.error('Erro ao fazer upload'); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('site-content').getPublicUrl(path);
    await supabase.from('fotos_portfolio').insert({
      url: urlData.publicUrl,
      descricao: descInput || null,
      ordem: photos.length,
    });
    setDescInput('');
    setUploading(false);
    toast.success('Foto adicionada!');
    loadPhotos();
  };

  const handleAddUrl = async () => {
    if (!urlInput.trim()) return;
    await supabase.from('fotos_portfolio').insert({
      url: urlInput.trim(),
      descricao: descInput || null,
      ordem: photos.length,
    });
    setUrlInput('');
    setDescInput('');
    setShowUrlForm(false);
    toast.success('Foto adicionada!');
    loadPhotos();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('fotos_portfolio').delete().eq('id', id);
    toast.success('Foto removida');
    loadPhotos();
  };

  const handleToggle = async (id: string, ativo: boolean) => {
    await supabase.from('fotos_portfolio').update({ ativo: !ativo }).eq('id', id);
    loadPhotos();
  };

  const moveItem = async (idx: number, dir: -1 | 1) => {
    const newPhotos = [...photos];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= newPhotos.length) return;
    [newPhotos[idx], newPhotos[swapIdx]] = [newPhotos[swapIdx], newPhotos[idx]];
    // Update ordem
    for (let i = 0; i < newPhotos.length; i++) {
      await supabase.from('fotos_portfolio').update({ ordem: i }).eq('id', newPhotos[i].id);
    }
    loadPhotos();
  };

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>;

  return (
    <div className="solar-card p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-primary">Portfólio de Obras</h2>
        <div className="flex gap-2">
          <label className="solar-btn-outline text-sm py-2 px-3 flex items-center gap-1 cursor-pointer">
            <Upload className="w-4 h-4" /> Upload
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
          </label>
          <button onClick={() => setShowUrlForm(!showUrlForm)} className="solar-btn-outline text-sm py-2 px-3 flex items-center gap-1">
            <LinkIcon className="w-4 h-4" /> URL
          </button>
        </div>
      </div>

      {uploading && <p className="text-sm text-muted-foreground">Enviando imagem...</p>}

      {showUrlForm && (
        <div className="flex gap-2 items-end flex-wrap">
          <div className="flex-1 min-w-[200px]"><label className="block text-sm font-medium mb-1">URL da imagem</label>
            <input className="solar-input text-sm" value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://..." /></div>
          <div className="w-48"><label className="block text-sm font-medium mb-1">Descrição (opcional)</label>
            <input className="solar-input text-sm" value={descInput} onChange={e => setDescInput(e.target.value)} /></div>
          <button onClick={handleAddUrl} className="solar-btn-primary text-sm py-2 px-3">Adicionar</button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {photos.map((p, idx) => (
          <div key={p.id} className={`relative group rounded-xl overflow-hidden border ${p.ativo ? 'border-border' : 'border-destructive/30 opacity-50'}`}>
            <img src={p.url} alt={p.descricao || `Foto ${idx + 1}`} className="w-full aspect-square object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              <button onClick={() => moveItem(idx, -1)} disabled={idx === 0} className="p-1.5 rounded bg-white/90 text-foreground disabled:opacity-30">↑</button>
              <button onClick={() => moveItem(idx, 1)} disabled={idx === photos.length - 1} className="p-1.5 rounded bg-white/90 text-foreground disabled:opacity-30">↓</button>
              <button onClick={() => handleToggle(p.id, p.ativo)} className="p-1.5 rounded bg-white/90 text-foreground">
                {p.ativo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded bg-destructive text-white"><Trash2 className="w-4 h-4" /></button>
            </div>
            {p.descricao && <p className="text-xs p-2 text-muted-foreground truncate">{p.descricao}</p>}
          </div>
        ))}
      </div>
      {photos.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma foto cadastrada. Adicione fotos do seu portfólio.</p>}
    </div>
  );
}

function PartnersSection() {
  const [partners, setPartners] = useState<PartnerLogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ url: '', nome: '', url_site: '' });
  const [showForm, setShowForm] = useState(false);

  const loadPartners = async () => {
    const { data } = await supabase.from('logos_parceiros').select('*').order('ordem');
    setPartners((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { loadPartners(); }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `partners/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('site-content').upload(path, file);
    if (error) { toast.error('Erro ao fazer upload'); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('site-content').getPublicUrl(path);
    setForm(f => ({ ...f, url: urlData.publicUrl }));
    setShowForm(true);
    setUploading(false);
  };

  const handleAdd = async () => {
    if (!form.url.trim() || !form.nome.trim()) { toast.error('Preencha URL e nome'); return; }
    await supabase.from('logos_parceiros').insert({
      url: form.url.trim(),
      nome: form.nome.trim(),
      url_site: form.url_site.trim() || null,
      ordem: partners.length,
    });
    setForm({ url: '', nome: '', url_site: '' });
    setShowForm(false);
    toast.success('Parceiro adicionado!');
    loadPartners();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('logos_parceiros').delete().eq('id', id);
    toast.success('Parceiro removido');
    loadPartners();
  };

  const handleToggle = async (id: string, ativo: boolean) => {
    await supabase.from('logos_parceiros').update({ ativo: !ativo }).eq('id', id);
    loadPartners();
  };

  const moveItem = async (idx: number, dir: -1 | 1) => {
    const items = [...partners];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= items.length) return;
    [items[idx], items[swapIdx]] = [items[swapIdx], items[idx]];
    for (let i = 0; i < items.length; i++) {
      await supabase.from('logos_parceiros').update({ ordem: i }).eq('id', items[i].id);
    }
    loadPartners();
  };

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>;

  return (
    <div className="solar-card p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-primary">Parceiros</h2>
        <div className="flex gap-2">
          <label className="solar-btn-outline text-sm py-2 px-3 flex items-center gap-1 cursor-pointer">
            <Upload className="w-4 h-4" /> Upload logo
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
          </label>
          <button onClick={() => setShowForm(!showForm)} className="solar-btn-outline text-sm py-2 px-3 flex items-center gap-1">
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </div>
      </div>

      {uploading && <p className="text-sm text-muted-foreground">Enviando logo...</p>}

      {showForm && (
        <div className="flex gap-2 items-end flex-wrap p-4 rounded-lg bg-muted/50">
          <div className="flex-1 min-w-[180px]"><label className="block text-sm font-medium mb-1">URL do logo</label>
            <input className="solar-input text-sm" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." /></div>
          <div className="w-40"><label className="block text-sm font-medium mb-1">Nome</label>
            <input className="solar-input text-sm" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
          <div className="w-48"><label className="block text-sm font-medium mb-1">Site (opcional)</label>
            <input className="solar-input text-sm" value={form.url_site} onChange={e => setForm(f => ({ ...f, url_site: e.target.value }))} placeholder="https://..." /></div>
          <button onClick={handleAdd} className="solar-btn-primary text-sm py-2 px-3">Salvar</button>
        </div>
      )}

      <div className="space-y-2">
        {partners.map((p, idx) => (
          <div key={p.id} className={`flex items-center gap-4 p-3 rounded-lg bg-muted/30 ${!p.ativo ? 'opacity-50' : ''}`}>
            <img src={p.url} alt={p.nome} className="h-12 w-20 object-contain" />
            <div className="flex-1">
              <p className="font-medium text-sm">{p.nome}</p>
              {p.url_site && <a href={p.url_site} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">{p.url_site}</a>}
            </div>
            <div className="flex gap-1">
              <button onClick={() => moveItem(idx, -1)} disabled={idx === 0} className="p-1.5 rounded bg-muted text-foreground disabled:opacity-30 text-xs">↑</button>
              <button onClick={() => moveItem(idx, 1)} disabled={idx === partners.length - 1} className="p-1.5 rounded bg-muted text-foreground disabled:opacity-30 text-xs">↓</button>
              <button onClick={() => handleToggle(p.id, p.ativo)} className="p-1.5 rounded bg-muted text-foreground">
                {p.ativo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded bg-destructive/10 text-destructive"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
      {partners.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">Nenhum parceiro cadastrado.</p>}
    </div>
  );
}

const DIFERENCIAIS_ITEMS = [
  { key: 'empresa_solida', title: 'Empresa sólida', defaultUrl: 'https://static.wixstatic.com/media/c2ae0d_a39bd5c40b7548248101a986677e534a~mv2.jpg' },
  { key: 'sistema_completo', title: 'Sistema solar completo', defaultUrl: 'https://static.wixstatic.com/media/c2ae0d_894355b5cb6445ba9c1277ddecfb6ec6~mv2.png' },
  { key: 'analise_drone', title: 'Análise 3D com drone', defaultUrl: 'https://static.wixstatic.com/media/c2ae0d_3e01f00f92804e79ac321e54ad8f4d75~mv2.jpg' },
];

function DiferenciaisSection() {
  const [images, setImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  const loadImages = async () => {
    const { data } = await supabase.from('configuracoes').select('*').eq('chave', 'diferenciais_images').maybeSingle();
    if (data?.valor && typeof data.valor === 'object') {
      setImages(data.valor as Record<string, string>);
    }
    setLoading(false);
  };

  useEffect(() => { loadImages(); }, []);

  const saveImages = async (updated: Record<string, string>) => {
    const { data: existing } = await supabase.from('configuracoes').select('id').eq('chave', 'diferenciais_images').maybeSingle();
    if (existing) {
      await supabase.from('configuracoes').update({ valor: updated as any }).eq('chave', 'diferenciais_images');
    } else {
      await supabase.from('configuracoes').insert({ chave: 'diferenciais_images', valor: updated as any });
    }
    setImages(updated);
  };

  const handleUpload = async (key: string, file: File) => {
    setUploading(key);
    const ext = file.name.split('.').pop();
    const path = `diferenciais/${key}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('site-content').upload(path, file);
    if (error) { toast.error('Erro ao fazer upload'); setUploading(null); return; }
    const { data: urlData } = supabase.storage.from('site-content').getPublicUrl(path);
    const updated = { ...images, [key]: urlData.publicUrl };
    await saveImages(updated);
    setUploading(null);
    toast.success('Imagem atualizada!');
  };

  const handleUrlChange = async (key: string, url: string) => {
    const updated = { ...images, [key]: url };
    await saveImages(updated);
    toast.success('URL atualizada!');
  };

  const handleRemove = async (key: string) => {
    const updated = { ...images };
    delete updated[key];
    await saveImages(updated);
    toast.success('Imagem removida!');
  };

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>;

  return (
    <div className="solar-card p-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-primary">Imagens dos Diferenciais</h2>
        <p className="text-sm text-muted-foreground mt-1">Gerencie as imagens que aparecem ao clicar nos cards de diferenciais na landing page e proposta.</p>
      </div>

      <div className="space-y-4">
        {DIFERENCIAIS_ITEMS.map(item => (
          <DiferencialImageItem
            key={item.key}
            item={item}
            currentUrl={images[item.key] || ''}
            uploading={uploading === item.key}
            onUpload={(file) => handleUpload(item.key, file)}
            onUrlChange={(url) => handleUrlChange(item.key, url)}
            onRemove={() => handleRemove(item.key)}
          />
        ))}
      </div>
    </div>
  );
}

function DiferencialImageItem({ item, currentUrl, uploading, onUpload, onUrlChange, onRemove }: {
  item: { key: string; title: string; defaultUrl: string };
  currentUrl: string;
  uploading: boolean;
  onUpload: (file: File) => void;
  onUrlChange: (url: string) => void;
  onRemove: () => void;
}) {
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState(currentUrl);
  const displayUrl = currentUrl || item.defaultUrl;
  const isDefault = !currentUrl;

  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{item.title}</h3>
        {isDefault && <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">Imagem padrão</span>}
        {!isDefault && <span className="text-xs bg-primary/10 px-2 py-0.5 rounded-full text-primary">Personalizada</span>}
      </div>

      <div className="flex gap-4 items-start">
        <img src={displayUrl} alt={item.title} className="w-32 h-24 rounded-lg object-cover border border-border" />
        <div className="flex-1 space-y-2">
          <div className="flex gap-2 flex-wrap">
            <label className="solar-btn-outline text-xs py-1.5 px-3 flex items-center gap-1 cursor-pointer">
              <Upload className="w-3.5 h-3.5" /> Upload
              <input type="file" accept="image/*" className="hidden" onChange={e => {
                const f = e.target.files?.[0];
                if (f) onUpload(f);
              }} disabled={uploading} />
            </label>
            <button onClick={() => { setEditingUrl(!editingUrl); setUrlInput(currentUrl); }}
              className="solar-btn-outline text-xs py-1.5 px-3 flex items-center gap-1">
              <LinkIcon className="w-3.5 h-3.5" /> URL
            </button>
            {!isDefault && (
              <button onClick={onRemove}
                className="text-xs py-1.5 px-3 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" /> Remover
              </button>
            )}
          </div>
          {uploading && <p className="text-xs text-muted-foreground">Enviando...</p>}
          {editingUrl && (
            <div className="flex gap-2">
              <input className="solar-input text-xs flex-1" value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://..." />
              <button onClick={() => { onUrlChange(urlInput); setEditingUrl(false); }}
                className="solar-btn-primary text-xs py-1.5 px-3"><Save className="w-3.5 h-3.5" /></button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
