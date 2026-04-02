import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Projeto } from '@/pages/GestorPage';
import { X, FileText, Download } from 'lucide-react';
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
    '{{preco_venda}}': p.preco_venda ? `R$ ${p.preco_venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '',
    '{{forma_pagamento}}': p.forma_pagamento || '',
    '{{codigo_uc}}': p.unidade_geradora_codigo_uc || '',
    '{{geracao_estimada}}': p.geracao_estimada_kwh?.toString() || '',
    '{{data}}': new Date().toLocaleDateString('pt-BR'),
    '{{data_fechamento}}': p.data_fechamento ? new Date(p.data_fechamento).toLocaleDateString('pt-BR') : '',
  };
  let result = html;
  Object.entries(vars).forEach(([key, val]) => { result = result.replaceAll(key, val); });
  return result;
}

export default function DocumentosModal({ projeto, onClose }: { projeto: Projeto; onClose: () => void }) {
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');

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
  };

  const handlePrint = () => {
    if (!preview) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>${previewTitle}</title><style>body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:0 auto}@media print{body{padding:20px}}</style></head><body>${preview}</body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-card rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-primary">Gerar Documentos — {projeto.nome_completo || projeto.razao_social}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
        ) : !preview ? (
          <div className="space-y-3">
            {applicable.length === 0 && <p className="text-sm text-muted-foreground">Nenhum documento aplicável para este projeto.</p>}
            {applicable.map(m => (
              <button key={m.id} onClick={() => handlePreview(m)}
                className="w-full flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left">
                <FileText className="w-5 h-5 text-primary" />
                <span className="font-medium">{tiposLabel[m.tipo] || m.tipo}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setPreview(null)} className="text-sm text-muted-foreground hover:text-foreground">← Voltar</button>
              <h4 className="font-semibold text-sm">{previewTitle}</h4>
              <button onClick={handlePrint} className="ml-auto solar-btn-primary text-sm py-2 px-4 flex items-center gap-2">
                <Download className="w-4 h-4" /> Imprimir / Salvar PDF
              </button>
            </div>
            <div className="border border-border rounded-lg p-6 bg-white text-black prose max-w-none"
              dangerouslySetInnerHTML={{ __html: preview }} />
          </div>
        )}
      </div>
    </div>
  );
}
