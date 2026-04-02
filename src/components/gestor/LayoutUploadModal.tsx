import React, { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Image as ImageIcon, X } from 'lucide-react';

export default function LayoutUploadModal({ projetoId, currentUrl, onClose, onDone }: {
  projetoId: string;
  currentUrl?: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (f.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  };

  const handleSave = async () => {
    if (!file) { toast.error('Selecione um arquivo'); return; }
    setSaving(true);
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `layouts/${projetoId}/layout.${ext}`;

    const { error: uploadErr } = await supabase.storage.from('layouts-obras').upload(path, file, { upsert: true });
    if (uploadErr) { toast.error('Erro no upload: ' + uploadErr.message); setSaving(false); return; }

    const { data: urlData } = supabase.storage.from('layouts-obras').getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    const { error } = await supabase.from('projetos' as any).update({ layout_url: publicUrl }).eq('id', projetoId);
    setSaving(false);
    if (error) { toast.error('Erro ao salvar: ' + error.message); return; }
    toast.success('Layout salvo!');
    onDone();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2"><ImageIcon className="w-5 h-5 text-primary" /> Layout da Obra</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        {preview && (
          <div className="border border-border rounded-lg overflow-hidden">
            <img src={preview} alt="Layout" className="w-full max-h-80 object-contain" />
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={handleFile} className="hidden" />
        <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/70 transition-colors w-full justify-center">
          <Upload className="w-4 h-4" /> {file ? file.name : 'Selecionar imagem'}
        </button>

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !file} className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar Layout'}
          </button>
        </div>
      </div>
    </div>
  );
}
