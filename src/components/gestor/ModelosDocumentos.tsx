import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Edit2, Eye, Save, Upload, X, Check, AlertCircle } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';

type Modelo = { id: string; tipo: string; conteudo_html: string; atualizado_em: string };

const TIPOS: { key: string; label: string }[] = [
  { key: 'contrato', label: 'Contrato de Instalação' },
  { key: 'procuracao_elektro_pf', label: 'Procuração Elektro (PF)' },
  { key: 'procuracao_elektro_pj', label: 'Procuração Elektro (PJ)' },
  { key: 'procuracao_energisa', label: 'Procuração Energisa' },
  { key: 'procuracao_copel', label: 'Procuração COPEL' },
];

const VARIABLES = [
  '{{nome_completo}}', '{{cpf}}', '{{cnpj}}', '{{razao_social}}',
  '{{nome_representante}}', '{{cpf_representante}}', '{{endereco}}',
  '{{cep}}', '{{cidade}}', '{{estado}}', '{{concessionaria}}',
  '{{marca_placa}}', '{{modelo_placa}}', '{{potencia_placa}}', '{{qtd_placas}}',
  '{{marca_inversor}}', '{{modelo_inversor}}', '{{potencia_inversor}}', '{{qtd_inversores}}',
  '{{preco_venda}}', '{{forma_pagamento}}', '{{codigo_uc}}', '{{unidade_consumidora}}',
  '{{geracao_estimada}}', '{{data}}', '{{data_fechamento}}', '{{data_nascimento}}',
];

const SAMPLE_VARS: Record<string, string> = {
  '{{nome_completo}}': 'João da Silva Santos',
  '{{cpf}}': '123.456.789-00',
  '{{cnpj}}': '12.345.678/0001-90',
  '{{razao_social}}': 'Solar Energia LTDA',
  '{{nome_representante}}': 'Maria Representante',
  '{{cpf_representante}}': '987.654.321-00',
  '{{endereco}}': 'Rua das Flores, 123, Centro, Três Lagoas, MS',
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
  '{{unidade_consumidora}}': 'UC 123456789',
  '{{geracao_estimada}}': '750',
  '{{data}}': new Date().toLocaleDateString('pt-BR'),
  '{{data_fechamento}}': new Date().toLocaleDateString('pt-BR'),
  '{{data_nascimento}}': '01/01/1990',
};

function highlightVariables(html: string): string {
  let result = html;
  VARIABLES.forEach(v => {
    result = result.split(v).join(
      `<span style="background-color:#fef3c7;color:#92400e;padding:1px 4px;border-radius:3px;font-family:monospace;font-size:0.85em;">${v}</span>`
    );
  });
  return result;
}

function replaceWithSample(html: string): string {
  let result = html;
  Object.entries(SAMPLE_VARS).forEach(([key, val]) => {
    result = result.split(key).join(val);
  });
  return result;
}

function EditorToolbar({ editor }: { editor: any }) {
  if (!editor) return null;
  const btn = (active: boolean, onClick: () => void, label: string) => (
    <button type="button" onClick={onClick}
      className={`px-2 py-1 text-xs rounded font-medium transition-colors ${active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
      {label}
    </button>
  );
  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-border bg-muted/30 rounded-t-lg">
      {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), 'B')}
      {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), 'I')}
      {btn(editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), 'U')}
      <span className="w-px bg-border mx-1" />
      {btn(editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), 'H1')}
      {btn(editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'H2')}
      {btn(editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'H3')}
      <span className="w-px bg-border mx-1" />
      {btn(editor.isActive({ textAlign: 'left' }), () => editor.chain().focus().setTextAlign('left').run(), '⬅')}
      {btn(editor.isActive({ textAlign: 'center' }), () => editor.chain().focus().setTextAlign('center').run(), '⬌')}
      {btn(editor.isActive({ textAlign: 'right' }), () => editor.chain().focus().setTextAlign('right').run(), '➡')}
      {btn(editor.isActive({ textAlign: 'justify' }), () => editor.chain().focus().setTextAlign('justify').run(), '⬛')}
      <span className="w-px bg-border mx-1" />
      {btn(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), '• Lista')}
      {btn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), '1. Lista')}
      <span className="w-px bg-border mx-1" />
      {btn(false, () => editor.chain().focus().setHorizontalRule().run(), '— Linha')}
      {btn(false, () => {
        const url = prompt('URL da imagem:');
        if (url) editor.chain().focus().setImage({ src: url }).run();
      }, '🖼 Imagem')}
    </div>
  );
}

function TipTapEditor({ content, onUpdate }: { content: string; onUpdate: (html: string) => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight,
      Image,
    ],
    content: highlightVariables(content),
    onUpdate: ({ editor: ed }) => {
      let html = ed.getHTML();
      // Convert highlighted variables back to raw {{var}}
      VARIABLES.forEach(v => {
        const regex = new RegExp(
          `<span[^>]*style="[^"]*background-color:#fef3c7[^"]*"[^>]*>${v.replace(/[{}]/g, '\\$&')}</span>`,
          'gi'
        );
        html = html.replace(regex, v);
      });
      onUpdate(html);
    },
  });

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} className="prose max-w-none p-4 min-h-[400px] bg-white text-black [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[400px]" />
    </div>
  );
}

export default function ModelosDocumentos() {
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Modelo | null>(null);
  const [editHtml, setEditHtml] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadModelos = useCallback(async () => {
    const { data } = await supabase.from('modelos_documentos' as any).select('*').order('tipo');
    setModelos((data || []) as any);
    setLoading(false);
  }, []);

  useEffect(() => { loadModelos(); }, [loadModelos]);

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
    setModelos(prev => prev.map(m => m.id === editing.id ? { ...m, conteudo_html: editHtml, atualizado_em: new Date().toISOString() } : m));
    setEditing(null);
    setSaving(false);
    toast.success('Modelo salvo!');
  };

  const handleUploadDocx = async (tipo: string, existingId?: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.docx';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        const html = result.value;

        if (existingId) {
          await supabase.from('modelos_documentos' as any).update({
            conteudo_html: html,
            atualizado_em: new Date().toISOString(),
          }).eq('id', existingId);
        } else {
          await supabase.from('modelos_documentos' as any).insert({
            tipo,
            conteudo_html: html,
          });
        }
        await loadModelos();
        toast.success(`Documento "${file.name}" convertido e salvo!`);
      } catch (err) {
        toast.error('Erro ao converter .docx: ' + String(err));
      }
    };
    input.click();
  };

  const handleUploadInEditor = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
          <h2 className="text-lg font-bold text-primary">
            Editando: {TIPOS.find(t => t.key === editing.tipo)?.label || editing.tipo}
          </h2>
          <button onClick={() => setEditing(null)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <X className="w-4 h-4" /> Fechar
          </button>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setPreviewing(false)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${!previewing ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            <Edit2 className="w-3 h-3 inline mr-1" /> Editor
          </button>
          <button onClick={() => setPreviewing(true)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${previewing ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            <Eye className="w-3 h-3 inline mr-1" /> Pré-visualizar
          </button>
          <label className="px-3 py-1.5 rounded text-sm font-medium bg-muted text-muted-foreground cursor-pointer hover:bg-muted/70 transition-colors">
            <Upload className="w-3 h-3 inline mr-1" /> Upload .docx
            <input type="file" accept=".docx" onChange={handleUploadInEditor} className="hidden" />
          </label>
        </div>

        <div className="flex flex-wrap gap-1">
          <span className="text-xs text-muted-foreground mr-1">Variáveis:</span>
          {VARIABLES.map(v => (
            <button key={v} type="button" onClick={() => {
              setEditHtml(prev => prev + v);
              toast.info(`Variável ${v} inserida no final`);
            }}
              className="text-xs px-1.5 py-0.5 rounded bg-accent/20 text-accent-foreground font-mono hover:bg-accent/40 transition-colors">
              {v}
            </button>
          ))}
        </div>

        {!previewing ? (
          <TipTapEditor key={editing.id} content={editHtml} onUpdate={setEditHtml} />
        ) : (
          <div className="border border-border rounded-lg p-8 bg-white text-black prose max-w-none shadow-sm"
            dangerouslySetInnerHTML={{ __html: replaceWithSample(editHtml) }} />
        )}

        <div className="flex justify-end gap-2">
          <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg text-sm bg-muted text-muted-foreground hover:bg-muted/70 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="solar-btn-primary text-sm py-2 px-4 flex items-center gap-2">
            <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar modelo'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="solar-card p-6 space-y-4">
      <h2 className="text-lg font-bold text-primary">Modelos de Documentos</h2>
      <p className="text-sm text-muted-foreground">
        Gerencie os modelos HTML usados para gerar contratos e procurações. Faça upload de um .docx ou edite diretamente no editor.
      </p>
      <div className="space-y-3">
        {TIPOS.map(tipo => {
          const modelo = modelos.find(m => m.tipo === tipo.key);
          const hasContent = modelo && modelo.conteudo_html && modelo.conteudo_html.length > 10;
          return (
            <div key={tipo.key} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                {hasContent ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                )}
                <div>
                  <p className="font-medium">{tipo.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {hasContent
                      ? `Modelo salvo • Atualizado em ${new Date(modelo!.atualizado_em).toLocaleDateString('pt-BR')}`
                      : 'Nenhum modelo salvo'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleUploadDocx(tipo.key, modelo?.id)}
                  className="px-3 py-1.5 rounded text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/70 transition-colors flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" /> Upload .docx
                </button>
                {modelo && (
                  <button onClick={() => handleEdit(modelo)}
                    className="solar-btn-primary text-sm py-1.5 px-3 flex items-center gap-1">
                    <Edit2 className="w-3.5 h-3.5" /> Editar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
