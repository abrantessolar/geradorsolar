import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Projeto } from '@/pages/GestorPage';
import { X, FileText, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type Modelo = { id: string; tipo: string; conteudo_html: string };

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9À-ÿ\s-_]/g, '').replace(/\s+/g, '_').substring(0, 60);
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

  // Contrato always available via Google Docs API
  const googleDocsTypes = ['contrato'];

  // Other document types still use the old modelos_documentos approach
  const applicableModelos = modelos.filter(m => {
    if (!m.conteudo_html || m.conteudo_html.length < 10) return false;
    if (googleDocsTypes.includes(m.tipo)) return false; // handled separately
    if (m.tipo === 'procuracao_elektro_pf') return projeto.concessionaria === 'Elektro' && projeto.tipo_pessoa === 'PF';
    if (m.tipo === 'procuracao_elektro_pj') return projeto.concessionaria === 'Elektro' && projeto.tipo_pessoa === 'PJ';
    if (m.tipo === 'procuracao_energisa') return projeto.concessionaria === 'Energisa';
    if (m.tipo === 'procuracao_copel') return projeto.concessionaria === 'COPEL';
    return false;
  });

  const handleGenerateGoogleDoc = async (tipoDocumento: string) => {
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
          }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errData.error || `Erro ${res.status}`);
      }

      const blob = await res.blob();
      const clientName = sanitizeFilename(projeto.nome_completo || projeto.razao_social || 'cliente');
      const filename = `Contrato_${clientName}.pdf`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`PDF "${filename}" gerado com sucesso!`);
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Erro ao gerar PDF: ' + String(err));
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
            <button
              onClick={() => handleGenerateGoogleDoc('contrato')}
              disabled={!!generating}
              className="w-full flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
            >
              {generating === 'contrato' ? (
                <Loader2 className="w-5 h-5 text-primary flex-shrink-0 animate-spin" />
              ) : (
                <FileText className="w-5 h-5 text-primary flex-shrink-0" />
              )}
              <div className="flex-1">
                <span className="font-medium">Contrato de Instalação</span>
                <p className="text-xs text-muted-foreground">
                  {generating === 'contrato' ? 'Gerando PDF...' : 'Clique para gerar e baixar o PDF'}
                </p>
              </div>
              <Download className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Legacy modelos-based documents */}
            {applicableModelos.map(m => (
              <button key={m.id}
                onClick={() => handleGenerateGoogleDoc(m.tipo)}
                disabled={!!generating}
                className="w-full flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
              >
                {generating === m.tipo ? (
                  <Loader2 className="w-5 h-5 text-primary flex-shrink-0 animate-spin" />
                ) : (
                  <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                )}
                <div className="flex-1">
                  <span className="font-medium">{tiposLabel[m.tipo] || m.tipo}</span>
                  <p className="text-xs text-muted-foreground">
                    {generating === m.tipo ? 'Gerando PDF...' : 'Clique para gerar e baixar o PDF'}
                  </p>
                </div>
                <Download className="w-4 h-4 text-muted-foreground" />
              </button>
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
