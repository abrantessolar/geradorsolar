import React, { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Upload, FileJson, CheckCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { parsePaineis, parseInversor } from './equipmentParser';

const FIELD_MAP: Record<string, string> = {
  'CLIENTE': 'nome_completo',
  'NOME': 'nome_completo',
  'NOME COMPLETO': 'nome_completo',
  'CPF': 'cpf',
  'ENDEREÇO': 'endereco',
  'ENDERECO': 'endereco',
  'TELEFONE': 'telefone',
  'UC': 'uc',
  'CONCESSIONÁRIA': 'concessionaria',
  'CONCESSIONARIA': 'concessionaria',
  'SISTEMA': 'sistema',
  'PAINÉIS': 'dados_paineis',
  'PAINEIS': 'dados_paineis',
  'PLACAS': 'dados_paineis',
  'INVERSOR': 'dados_inversor',
  'INVERSORES': 'dados_inversor',
  'FORNECEDOR': 'fornecedor',
  'VALOR': 'valor',
  'VALOR (R$)': 'valor',
  'FORMA DE PAGAMENTO': 'forma_pagamento',
  'FORMA PAGAMENTO': 'forma_pagamento',
  'PROJETO ENVIADO': 'projeto_enviado_em',
  'PROJETO APROVADO': 'projeto_aprovado',
  'DATA INSTALAÇÃO': 'instalado_em',
  'DATA INSTALACAO': 'instalado_em',
  'INSTALADO EM': 'instalado_em',
  'VISTORIADO EM': 'vistoriado_em',
  'NOME DA PLANTA': 'nome_planta',
  'NOME PLANTA': 'nome_planta',
  'SATISFAÇÃO': 'satisfacao',
  'SATISFACAO': 'satisfacao',
  'QTD PLACAS': 'qtd_placas',
  'QTD INVERSOR': 'qtd_inversores',
  'QTD INVERSORES': 'qtd_inversores',
  'MARCA PLACA': 'marca_placa',
  'POTÊNCIA PLACA': 'potencia_placa',
  'POTENCIA PLACA': 'potencia_placa',
  'POTÊNCIA PLACA (W)': 'potencia_placa',
  'POTENCIA PLACA (W)': 'potencia_placa',
  'KWP': 'kwp',
  'MARCA INVERSOR': 'marca_inversor',
  'POTÊNCIA INVERSOR': 'potencia_inversor',
  'POTENCIA INVERSOR': 'potencia_inversor',
  'TIPO INVERSOR': 'tipo_inversor',
  'TELEFONE_2': 'telefone_2',
  'TELEFONE 2': 'telefone_2',
  'TELEFONE_3': 'telefone_3',
  'TELEFONE 3': 'telefone_3',
  'OBSERVACOES': 'observacoes',
  'OBSERVAÇÕES': 'observacoes',
};

function normalizeConcessionaria(val: string): string {
  const u = val.toUpperCase().trim();
  if (/^ELE[KkCc]?TRO$/i.test(u) || u === 'ELETRO') return 'ELEKTRO';
  if (u.includes('ENERGISA')) return 'ENERGISA';
  if (u.includes('COPEL')) return 'COPEL';
  if (u === 'ELEKTRO') return 'ELEKTRO';
  return u || 'OUTRA';
}

function parseDate(val: string): string | null {
  if (!val || val.trim() === '') return null;
  const v = val.trim();
  // ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
    const [y, m, d] = v.substring(0, 10).split('-').map(Number);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) return v.substring(0, 10);
    // Maybe DD-MM-YYYY was misread, but unlikely for ISO. Return null if invalid.
    return null;
  }
  const parts = v.split('/');
  if (parts.length === 3) {
    const [p0, p1, p2] = parts.map(s => s.trim());
    let day: number, month: number, year: string;
    
    if (p2.length === 4) {
      // DD/MM/YYYY
      day = parseInt(p0);
      month = parseInt(p1);
      year = p2;
    } else if (p0.length === 4) {
      // YYYY/MM/DD
      day = parseInt(p2);
      month = parseInt(p1);
      year = p0;
    } else {
      day = parseInt(p0);
      month = parseInt(p1);
      year = p2.length === 2 ? `20${p2}` : p2;
    }

    // Validate
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      // Try swapping day/month
      if (day >= 1 && day <= 12 && month >= 1 && month <= 31) {
        [day, month] = [month, day];
      } else {
        return null;
      }
    }

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  return null;
}

function parseMonetary(val: any): number | null {
  if (typeof val === 'number') return val;
  if (!val) return null;
  const clean = String(val).replace(/[R$\s.]/g, '').replace(',', '.');
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

interface ImportError {
  index: number;
  nome: string;
  message: string;
}

export default function ClienteImportJSON({ onImported }: { onImported: () => void }) {
  const { session } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<any[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ ok: number; errors: number } | null>(null);
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);
  const [showAllErrors, setShowAllErrors] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) { toast.error('O arquivo deve ser um array JSON.'); return; }
      setPreview(data);
      setResult(null);
      setImportErrors([]);
    } catch { toast.error('Erro ao ler o JSON.'); }
  };

  const mapRecord = (raw: any) => {
    const mapped: any = { origem: 'importacao' };
    for (const [key, val] of Object.entries(raw)) {
      const field = FIELD_MAP[key.toUpperCase().trim()];
      if (field && val !== null && val !== undefined && String(val).trim() !== '') {
        mapped[field] = String(val).trim();
      }
    }

    if (mapped.concessionaria) mapped.concessionaria = normalizeConcessionaria(mapped.concessionaria);
    if (mapped.valor) mapped.valor = parseMonetary(mapped.valor);

    // Parse numeric fields
    if (mapped.qtd_placas) mapped.qtd_placas = parseInt(String(mapped.qtd_placas)) || null;
    if (mapped.qtd_inversores) mapped.qtd_inversores = parseInt(String(mapped.qtd_inversores)) || null;
    if (mapped.kwp) {
      const k = parseFloat(String(mapped.kwp).replace(',', '.'));
      mapped.kwp = isNaN(k) ? null : k;
    }
    if (mapped.potencia_placa) mapped.potencia_placa = String(mapped.potencia_placa).replace(/[Ww]$/, '').trim();
    if (mapped.potencia_inversor) mapped.potencia_inversor = String(mapped.potencia_inversor).replace(/[Kk][Ww]$/, '').replace(',', '.').trim();

    // Parse dates - convert empty/invalid to null
    for (const df of ['projeto_enviado_em', 'projeto_aprovado', 'instalado_em', 'vistoriado_em']) {
      if (mapped[df] !== undefined) {
        const parsed = parseDate(mapped[df]);
        mapped[df] = parsed; // null if invalid
      }
    }

    // Calculate KWp if not provided
    if (!mapped.kwp && mapped.qtd_placas && mapped.potencia_placa) {
      const pot = parseFloat(mapped.potencia_placa);
      if (!isNaN(pot)) mapped.kwp = (mapped.qtd_placas * pot) / 1000;
    }

    // Parse equipment text into structured fields (fallback)
    if (mapped.dados_paineis && !mapped.qtd_placas) {
      const parsed = parsePaineis(mapped.dados_paineis);
      if (parsed) {
        mapped.qtd_placas = parsed.qtd;
        mapped.marca_placa = parsed.marca;
        mapped.potencia_placa = parsed.potencia;
      }
    }
    if (mapped.dados_inversor && !mapped.qtd_inversores) {
      const parsed = parseInversor(mapped.dados_inversor);
      if (parsed) {
        mapped.qtd_inversores = parsed.qtd;
        mapped.marca_inversor = parsed.marca;
        mapped.potencia_inversor = parsed.potencia;
        mapped.tipo_inversor = parsed.tipo || 'String';
      }
    }

    // Clean any remaining empty strings to null for non-text fields
    for (const key of Object.keys(mapped)) {
      if (mapped[key] === '') mapped[key] = null;
    }

    if (session?.user?.id) mapped.usuario_id = session.user.id;
    return mapped;
  };

  const doImport = async () => {
    if (!preview) return;
    setImporting(true);
    setImportErrors([]);
    let ok = 0;
    const errors: ImportError[] = [];

    // Insert one by one to capture per-record errors
    for (let i = 0; i < preview.length; i++) {
      const raw = preview[i];
      const mapped = mapRecord(raw);
      const nome = mapped.nome_completo || raw.CLIENTE || raw.NOME || `Registro ${i + 1}`;
      const { error } = await supabase.from('clientes_base' as any).insert([mapped]);
      if (error) {
        errors.push({ index: i, nome, message: error.message });
      } else {
        ok++;
      }
    }

    setResult({ ok, errors: errors.length });
    setImportErrors(errors);
    setImporting(false);
    if (ok > 0) { toast.success(`${ok} clientes importados!`); onImported(); }
    if (errors.length > 0) toast.error(`${errors.length} registros com erro.`);
  };

  const visibleErrors = showAllErrors ? importErrors : importErrors.slice(0, 5);

  return (
    <div className="solar-card p-6 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2"><FileJson className="w-5 h-5 text-primary" /> Importar Base de Clientes (JSON)</h2>
      <p className="text-sm text-muted-foreground">Formato: array de objetos com campos como CLIENTE, CPF, ENDEREÇO, PAINÉIS, INVERSOR, etc.</p>

      <input ref={fileRef} type="file" accept=".json" onChange={handleFile} className="hidden" />
      <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
        <Upload className="w-4 h-4" /> Selecionar Arquivo JSON
      </button>

      {preview && (
        <div className="space-y-3">
          <p className="text-sm font-medium">{preview.length} registros encontrados</p>
          <div className="overflow-x-auto max-h-60 border border-border rounded-lg">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted">
                  {Object.keys(preview[0] || {}).slice(0, 8).map(k => <th key={k} className="px-2 py-1 text-left">{k}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 5).map((r, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {Object.values(r).slice(0, 8).map((v, j) => <td key={j} className="px-2 py-1 max-w-[120px] truncate">{String(v ?? '')}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={doImport} disabled={importing} className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {importing ? 'Importando...' : `Importar ${preview.length} Clientes`}
          </button>
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
            {result.errors === 0
              ? <><CheckCircle className="w-5 h-5 text-green-600" /><span className="text-sm">{result.ok} clientes importados com sucesso!</span></>
              : <><AlertTriangle className="w-5 h-5 text-amber-500" /><span className="text-sm">{result.ok} importados, {result.errors} com erro.</span></>
            }
          </div>

          {importErrors.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-destructive">Erros na importação:</h3>
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {visibleErrors.map((err, i) => (
                  <div key={i} className="text-xs p-2 rounded bg-destructive/10 border border-destructive/20">
                    <span className="font-medium">{err.nome}</span>
                    <span className="text-muted-foreground"> — </span>
                    <span>{err.message}</span>
                  </div>
                ))}
              </div>
              {importErrors.length > 5 && (
                <button
                  onClick={() => setShowAllErrors(!showAllErrors)}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  {showAllErrors ? <><ChevronUp className="w-3 h-3" /> Mostrar menos</> : <><ChevronDown className="w-3 h-3" /> Ver todos os {importErrors.length} erros</>}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
