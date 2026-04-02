import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Projeto } from '@/pages/GestorPage';
import { X, FileText, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type Modelo = { id: string; tipo: string; conteudo_html: string };

function replaceVariables(html: string, p: Projeto): string {
  const vars: Record<string, string> = {
    '{{nome_completo}}': p.nome_completo || p.razao_social || '',
    '{{cpf}}': p.cpf || '',
    '{{cnpj}}': p.cnpj || '',
    '{{razao_social}}': p.razao_social || '',
    '{{nome_representante}}': p.nome_representante || '',
    '{{cpf_representante}}': p.cpf_representante || '',
    '{{endereco}}': [p.endereco_completo, p.bairro, p.cidade, p.estado].filter(Boolean).join(', '),
    '{{cep}}': p.cep || '',
    '{{cidade}}': p.cidade || '',
    '{{estado}}': p.estado || '',
    '{{concessionaria}}': p.concessionaria || '',
    '{{marca_placa}}': p.placa?.marca || '',
    '{{modelo_placa}}': p.placa?.modelo || '',
    '{{potencia_placa}}': p.placa?.potencia_wp?.toString() || '',
    '{{qtd_placas}}': p.qtd_placas?.toString() || '',
    '{{marca_inversor}}': p.inversor?.marca || '',
    '{{modelo_inversor}}': p.inversor?.modelo || '',
    '{{potencia_inversor}}': p.inversor?.potencia_kw?.toString() || '',
    '{{qtd_inversores}}': p.qtd_inversores?.toString() || '',
    '{{preco_venda}}': p.preco_venda ? `R$ ${Number(p.preco_venda).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '',
    '{{forma_pagamento}}': p.forma_pagamento || '',
    '{{codigo_uc}}': p.unidade_geradora_codigo_uc || '',
    '{{unidade_consumidora}}': p.unidade_geradora_codigo_uc ? `UC ${p.unidade_geradora_codigo_uc}` : '',
    '{{geracao_estimada}}': p.geracao_estimada_kwh?.toString() || '',
    '{{data}}': new Date().toLocaleDateString('pt-BR'),
    '{{data_fechamento}}': p.data_fechamento ? new Date(p.data_fechamento + 'T12:00:00').toLocaleDateString('pt-BR') : '',
    '{{data_nascimento}}': p.data_nascimento ? new Date(p.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR') : '',
  };
  let result = html;
  Object.entries(vars).forEach(([key, val]) => { result = result.split(key).join(val); });
  return result;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9À-ÿ\s-_]/g, '').replace(/\s+/g, '_').substring(0, 60);
}

export default function DocumentosModal({ projeto, onClose }: { projeto: Projeto; onClose: () => void }) {
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewTipo, setPreviewTipo] = useState('');
  const [generating, setGenerating] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

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

  const applicable = modelos.filter(m => {
    if (!m.conteudo_html || m.conteudo_html.length < 10) return false;
    if (m.tipo === 'contrato') return true;
    if (m.tipo === 'procuracao_elektro_pf') return projeto.concessionaria === 'Elektro' && projeto.tipo_pessoa === 'PF';
    if (m.tipo === 'procuracao_elektro_pj') return projeto.concessionaria === 'Elektro' && projeto.tipo_pessoa === 'PJ';
    if (m.tipo === 'procuracao_energisa') return projeto.concessionaria === 'Energisa';
    if (m.tipo === 'procuracao_copel') return projeto.concessionaria === 'COPEL';
    return false;
  });

  const handlePreview = (modelo: Modelo) => {
    const html = replaceVariables(modelo.conteudo_html, projeto);
    setPreview(html);
    setPreviewTitle(tiposLabel[modelo.tipo] || modelo.tipo);
    setPreviewTipo(modelo.tipo);
  };

  const handleGeneratePDF = async () => {
    if (!preview || !previewRef.current) return;
    setGenerating(true);

    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const clientName = sanitizeFilename(projeto.nome_completo || projeto.razao_social || 'cliente');
      const tipoLabel = sanitizeFilename(previewTipo);
      const filename = `${tipoLabel}_${clientName}.pdf`;

      // Create a container with proper styling for PDF
      const container = document.createElement('div');
      container.innerHTML = preview;
      container.style.cssText = 'font-family:Arial,sans-serif;font-size:12pt;line-height:1.6;color:#000;max-width:800px;margin:0 auto;';
      
      // Add CSS for page breaks
      const style = document.createElement('style');
      style.textContent = `
        h1, h2, h3 { page-break-after: avoid; }
        table, figure { page-break-inside: avoid; }
        .page-break { page-break-before: always; }
        img { max-width: 100%; height: auto; }
      `;
      container.prepend(style);

      const opt = {
        margin: [15, 15, 20, 15],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
        pagebreak: { mode: ['css', 'legacy'] as any },
      };

      await html2pdf().set(opt).from(container).save();
      toast.success(`PDF "${filename}" gerado com sucesso!`);
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Erro ao gerar PDF: ' + String(err));
    } finally {
      setGenerating(false);
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
        ) : !preview ? (
          <div className="space-y-3">
            {applicable.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">
                Nenhum documento aplicável para este projeto. Certifique-se de que os modelos estão salvos na aba "Modelos de Documentos".
              </p>
            )}
            {applicable.map(m => (
              <button key={m.id} onClick={() => handlePreview(m)}
                className="w-full flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left">
                <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                <div>
                  <span className="font-medium">{tiposLabel[m.tipo] || m.tipo}</span>
                  <p className="text-xs text-muted-foreground">Clique para visualizar e gerar PDF</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={() => setPreview(null)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                ← Voltar
              </button>
              <h4 className="font-semibold text-sm">{previewTitle}</h4>
              <button onClick={handleGeneratePDF} disabled={generating}
                className="ml-auto solar-btn-primary text-sm py-2 px-4 flex items-center gap-2">
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {generating ? 'Gerando...' : 'Baixar PDF'}
              </button>
            </div>
            <div ref={previewRef}
              className="border border-border rounded-lg p-8 bg-white text-black prose max-w-none shadow-sm"
              dangerouslySetInnerHTML={{ __html: preview }} />
          </div>
        )}
      </div>
    </div>
  );
}
