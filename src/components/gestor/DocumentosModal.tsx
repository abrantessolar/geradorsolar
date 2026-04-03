import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Projeto } from '@/pages/GestorPage';
import { X, FileText, Download, Loader2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useDropdownPosition } from '@/hooks/useDropdownPosition';

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9À-ÿ\s-_]/g, '').replace(/\s+/g, '_').substring(0, 60);
}

function FormatDropdown({ tipo, generating, onGenerate }: {
  tipo: string;
  generating: string | null;
  onGenerate: (tipo: string, formato: 'pdf' | 'docx') => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isGenerating = generating === tipo;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        disabled={!!generating}
        className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted transition-colors"
      >
        {isGenerating ? (
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
        ) : (
          <>
            <Download className="w-4 h-4 text-muted-foreground" />
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </>
        )}
      </button>
      {open && !generating && (
        <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-md shadow-lg z-10 min-w-[160px]">
          <button
            onClick={() => { setOpen(false); onGenerate(tipo, 'pdf'); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
          >
            📄 Baixar PDF
          </button>
          <button
            onClick={() => { setOpen(false); onGenerate(tipo, 'docx'); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
          >
            📝 Baixar Word (.docx)
          </button>
        </div>
      )}
    </div>
  );
}

type DocItem = { tipo: string; label: string; icon: string };

function getAvailableDocuments(projeto: Projeto): DocItem[] {
  const docs: DocItem[] = [
    { tipo: 'contrato', label: 'Contrato de Instalação', icon: '📄' },
  ];

  const conc = (projeto.concessionaria || '').toUpperCase();

  if (conc === 'ELEKTRO' && projeto.tipo_pessoa === 'PF') {
    docs.push({ tipo: 'procuracao_elektro_pf', label: 'Procuração Elektro (PF)', icon: '📋' });
  }
  if (conc === 'ELEKTRO' && projeto.tipo_pessoa === 'PJ') {
    docs.push({ tipo: 'procuracao_elektro_pj', label: 'Procuração Elektro (PJ)', icon: '📋' });
  }
  if (conc === 'COPEL') {
    docs.push({ tipo: 'procuracao_copel', label: 'Procuração COPEL', icon: '📋' });
  }
  if (conc === 'ENERGISA') {
    docs.push({ tipo: 'procuracao_energisa', label: 'Procuração Energisa', icon: '📋' });
  }

  return docs;
}

export default function DocumentosModal({ projeto, onClose }: { projeto: Projeto; onClose: () => void }) {
  const [generating, setGenerating] = useState<string | null>(null);

  const availableDocs = getAvailableDocuments(projeto);

  const handleGenerate = async (tipoDocumento: string, formato: 'pdf' | 'docx') => {
    setGenerating(tipoDocumento);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-document`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ projeto_id: projeto.id, tipo_documento: tipoDocumento, formato }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errData.error || `Erro ${res.status}`);
      }

      const blob = await res.blob();
      const clientName = sanitizeFilename(projeto.nome_completo || projeto.razao_social || 'cliente');
      const ext = formato === 'docx' ? 'docx' : 'pdf';
      const docLabel = tipoDocumento === 'contrato' ? 'Contrato' : 'Procuracao';
      const filename = `${docLabel}_${clientName}.${ext}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`${ext.toUpperCase()} "${filename}" gerado com sucesso!`);
    } catch (err) {
      console.error('Document generation error:', err);
      toast.error('Erro ao gerar documento: ' + String(err));
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-card rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-primary">
            Gerar Documentos — {projeto.nome_completo || projeto.razao_social}
          </h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <div className="space-y-3">
          {availableDocs.map(doc => (
            <div key={doc.tipo} className="w-full flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              {generating === doc.tipo ? (
                <Loader2 className="w-5 h-5 text-primary flex-shrink-0 animate-spin" />
              ) : (
                <FileText className="w-5 h-5 text-primary flex-shrink-0" />
              )}
              <div className="flex-1">
                <span className="font-medium">{doc.icon} {doc.label}</span>
                <p className="text-xs text-muted-foreground">
                  {generating === doc.tipo ? 'Gerando documento...' : 'Escolha o formato para download'}
                </p>
              </div>
              <FormatDropdown tipo={doc.tipo} generating={generating} onGenerate={handleGenerate} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
