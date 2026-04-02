import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Edit2, Eye, Save, Upload, X } from 'lucide-react';

type Modelo = { id: string; tipo: string; conteudo_html: string; atualizado_em: string };

const TIPOS_LABEL: Record<string, string> = {
  contrato: 'Contrato de Instalação',
  procuracao_elektro_pf: 'Procuração Elektro (PF)',
  procuracao_elektro_pj: 'Procuração Elektro (PJ)',
  procuracao_energisa: 'Procuração Energisa',
  procuracao_copel: 'Procuração COPEL',
};

const SAMPLE_VARS: Record<string, string> = {
  '{{nome_completo}}': 'João da Silva Santos',
  '{{cpf}}': '123.456.789-00',
  '{{cnpj}}': '12.345.678/0001-90',
  '{{razao_social}}': 'Solar LTDA',
  '{{nome_representante}}': 'Maria Representante',
  '{{cpf_representante}}': '987.654.321-00',
  '{{endereco}}': 'Rua Exemplo, 123, Centro, Três Lagoas, MS',
  '{{cep}}': '79600-000',
  '{{cidade}}': 'Três Lagoas',
  '{{estado}}': 'MS',
  '{{concessionaria}}': 'Elektro',
  '{{marca_placa}}': 'Canadian Solar',
  '{{modelo_placa}}': 'CS6W-550MS',
  '{{potencia_placa}}': '550',
  '{{qtd_placas}}': '10',
  '{{marca_inversor}}': 'Growatt',
  '{{modelo_inversor}}': 'MIN 5000TL-X',
  '{{potencia_inversor}}': '5',
  '{{qtd_inversores}}': '1',
  '{{preco_venda}}': 'R$ 25.000,00',
  '{{forma_pagamento}}': 'Financiamento Santander',
  '{{codigo_uc}}': '123456789',
  '{{geracao_estimada}}': '750',
  '{{data}}': new Date().toLocaleDateString('pt-BR'),
  '{{data_fechamento}}': new Date().toLocaleDateString('pt-BR'),
};

function replaceWithSample(html: string): string {
  let result = html;
  Object.entries(SAMPLE_VARS).forEach(([key, val]) => { result = result.split(key).join(`<mark>${val}</mark>`); });
  return result;
}

export default function ModelosDocumentos() {
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Modelo | null>(null);
  const [editHtml, setEditHtml] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('modelos_documentos' as any).select('*').order('tipo').then(({ data }) => {
      setModelos((data || []) as any);
      setLoading(false);
    });
  }, []);

  const handleEdit = (m: Modelo) => {
    setEditing(m);
    setEditHtml(m.conteudo_html);
    setPreviewing(false);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    await supabase.from('modelos_documentos' as any).update({
      conteudo_html: editHtml,
      atualizado_em: new Date().toISOString(),
    }).eq('id', editing.id);
    setModelos(prev => prev.map(m => m.id === editing.id ? { ...m, conteudo_html: editHtml } : m));
    setEditing(null);
    setSaving(false);
    toast.success('Modelo salvo!');
  };

  const handleUploadDocx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const mammoth = await import('mammoth');
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      setEditHtml(result.value);
      toast.success('Documento convertido! Revise e salve.');
    } catch (err) {
      toast.error('Erro ao converter .docx');
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>;

  if (editing) {
    return (
      <div className="solar-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-primary">Editando: {TIPOS_LABEL[editing.tipo] || editing.tipo}</h2>
          <button onClick={() => setEditing(null)} className="text-sm text-muted-foreground hover:text-foreground">← Voltar</button>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setPreviewing(false)} className={`px-3 py-1.5 rounded text-sm font-medium ${!previewing ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            <Edit2 className="w-3 h-3 inline mr-1" /> Editar HTML
          </button>
          <button onClick={() => setPreviewing(true)} className={`px-3 py-1.5 rounded text-sm font-medium ${previewing ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            <Eye className="w-3 h-3 inline mr-1" /> Pré-visualizar
          </button>
          <label className="px-3 py-1.5 rounded text-sm font-medium bg-muted text-muted-foreground cursor-pointer hover:bg-muted/70">
            <Upload className="w-3 h-3 inline mr-1" /> Upload .docx
            <input type="file" accept=".docx" onChange={handleUploadDocx} className="hidden" />
          </label>
        </div>

        <p className="text-xs text-muted-foreground">
          Variáveis disponíveis: {Object.keys(SAMPLE_VARS).map(v => <code key={v} className="bg-muted px-1 rounded mr-1">{v}</code>)}
        </p>

        {!previewing ? (
          <textarea className="solar-input font-mono text-xs" rows={20} value={editHtml} onChange={e => setEditHtml(e.target.value)} />
        ) : (
          <div className="border border-border rounded-lg p-6 bg-white text-black prose max-w-none"
            dangerouslySetInnerHTML={{ __html: replaceWithSample(editHtml) }} />
        )}

        <div className="flex justify-end gap-2">
          <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg text-sm bg-muted text-muted-foreground">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="solar-btn-primary text-sm py-2 px-4 flex items-center gap-2">
            <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="solar-card p-6 space-y-4">
      <h2 className="text-lg font-bold text-primary">Modelos de Documentos</h2>
      <div className="space-y-3">
        {modelos.map(m => (
          <div key={m.id} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/30">
            <div>
              <p className="font-medium">{TIPOS_LABEL[m.tipo] || m.tipo}</p>
              <p className="text-xs text-muted-foreground">Atualizado em: {new Date(m.atualizado_em).toLocaleDateString('pt-BR')}</p>
            </div>
            <button onClick={() => handleEdit(m)} className="solar-btn-primary text-sm py-2 px-4 flex items-center gap-2">
              <Edit2 className="w-4 h-4" /> Editar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
