import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Projeto } from '@/pages/GestorPage';
import { X, FileText, Download, Loader2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

type Modelo = { id: string; tipo: string; conteudo_html: string };

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

export default function DocumentosModal({ projeto, onClose }: { projeto: Projeto; onClose: () => void }) {
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('modelos_documentos' as any).select('*').then(({ data }) => {
      setModelos((data || []) as any);
      setLoading(false);
    });
  }, []);

  const tiposLabel: Record<string, string> = {
    contrato: 'Contrato de Instalação',
    procuracao_elektro_pf: 'Procuração Elektro (PF)',
    procuracao_elektro_pj: 'Procuração Elektro (PJ)',
    procuracao_energisa: 'Procuração Energisa',
    procuracao_copel: 'Procuração COPEL',
  };

  const googleDocsTypes = ['contrato'];

  const applicableModelos = modelos.filter(m => {
    if (!m.conteudo_html || m.conteudo_html.length < 10) return false;
    if (googleDocsTypes.includes(m.tipo)) return false;
    if (m.tipo === 'procuracao_elektro_pf') return projeto.concessionaria === 'Elektro' && projeto.tipo_pessoa === 'PF';
    if (m.tipo === 'procuracao_elektro_pj') return projeto.concessionaria === 'Elektro' && projeto.tipo_pessoa === 'PJ';
    if (m.tipo === 'procuracao_energisa') return projeto.concessionaria === 'Energisa';
    if (m.tipo === 'procuracao_copel') return projeto.concessionaria === 'COPEL';
    return false;
  });

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
          body: JSON.stringify({
            projeto_id: projeto.id,
            tipo_documento: tipoDocumento,
            formato,
          }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errData.error || `Erro ${res.status}`);
      }

      const blob = await res.blob();
      const clientName = sanitizeFilename(projeto.nome_completo || projeto.razao_social || 'cliente');
      const ext = formato === 'docx' ? 'docx' : 'pdf';
      const filename = `Contrato_${clientName}.${ext}`;

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

        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
        ) : (
          <div className="space-y-3">
            {/* Google Docs-based documents */}
            <div className="w-full flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              {generating === 'contrato' ? (
                <Loader2 className="w-5 h-5 text-primary flex-shrink-0 animate-spin" />
              ) : (
                <FileText className="w-5 h-5 text-primary flex-shrink-0" />
              )}
              <div className="flex-1">
                <span className="font-medium">Contrato de Instalação</span>
                <p className="text-xs text-muted-foreground">
                  {generating === 'contrato' ? 'Gerando documento...' : 'Escolha o formato para download'}
                </p>
              </div>
              <FormatDropdown tipo="contrato" generating={generating} onGenerate={handleGenerate} />
            </div>

            {/* Legacy modelos-based documents */}
            {applicableModelos.map(m => (
              <div key={m.id} className="w-full flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                {generating === m.tipo ? (
                  <Loader2 className="w-5 h-5 text-primary flex-shrink-0 animate-spin" />
                ) : (
                  <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                )}
                <div className="flex-1">
                  <span className="font-medium">{tiposLabel[m.tipo] || m.tipo}</span>
                  <p className="text-xs text-muted-foreground">
                    {generating === m.tipo ? 'Gerando documento...' : 'Escolha o formato para download'}
                  </p>
                </div>
                <FormatDropdown tipo={m.tipo} generating={generating} onGenerate={handleGenerate} />
              </div>
            ))}

            {applicableModelos.length === 0 && (
              <p className="text-xs text-muted-foreground pt-2">
                Procurações adicionais aparecerão aqui conforme a concessionária do projeto.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
