import React, { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Upload, FileJson, CheckCircle, AlertTriangle } from 'lucide-react';
import { parseEquipmentText } from './equipmentParser';

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
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.substring(0, 10);
  const parts = v.split('/');
  if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  return null;
}

function parseMonetary(val: any): number | null {
  if (typeof val === 'number') return val;
  if (!val) return null;
  const clean = String(val).replace(/[R$\s.]/g, '').replace(',', '.');
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

export default function ClienteImportJSON({ onImported }: { onImported: () => void }) {
  const { session } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<any[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ ok: number; errors: number } | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) { toast.error('O arquivo deve ser um array JSON.'); return; }
      setPreview(data);
      setResult(null);
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

    // Normalize concessionaria
    if (mapped.concessionaria) mapped.concessionaria = normalizeConcessionaria(mapped.concessionaria);

    // Parse monetary
    if (mapped.valor) mapped.valor = parseMonetary(mapped.valor);

    // Parse dates
    for (const df of ['projeto_enviado_em', 'projeto_aprovado', 'instalado_em', 'vistoriado_em']) {
      if (mapped[df]) mapped[df] = parseDate(mapped[df]);
    }

    // Parse equipment text
    if (mapped.dados_paineis) {
      const parsed = parseEquipmentText(mapped.dados_paineis);
      if (parsed) {
        mapped.qtd_placas = parsed.qtd;
        mapped.marca_placa = parsed.marca;
        mapped.potencia_placa = parsed.potencia;
      }
    }
    if (mapped.dados_inversor) {
      const parsed = parseEquipmentText(mapped.dados_inversor);
      if (parsed) {
        mapped.qtd_inversores = parsed.qtd;
        mapped.marca_inversor = parsed.marca;
        mapped.potencia_inversor = parsed.potencia;
        mapped.tipo_inversor = parsed.tipo || 'String';
      }
    }

    if (session?.user?.id) mapped.usuario_id = session.user.id;
    return mapped;
  };

  const doImport = async () => {
    if (!preview) return;
    setImporting(true);
    let ok = 0, errors = 0;
    const BATCH = 50;
    for (let i = 0; i < preview.length; i += BATCH) {
      const batch = preview.slice(i, i + BATCH).map(mapRecord);
      const { error } = await supabase.from('clientes_base' as any).insert(batch);
      if (error) { errors += batch.length; console.error(error); }
      else ok += batch.length;
    }
    setResult({ ok, errors });
    setImporting(false);
    if (ok > 0) { toast.success(`${ok} clientes importados!`); onImported(); }
    if (errors > 0) toast.error(`${errors} registros com erro.`);
  };

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
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
          {result.errors === 0
            ? <><CheckCircle className="w-5 h-5 text-green-600" /><span className="text-sm">{result.ok} clientes importados com sucesso!</span></>
            : <><AlertTriangle className="w-5 h-5 text-amber-500" /><span className="text-sm">{result.ok} importados, {result.errors} com erro.</span></>
          }
        </div>
      )}
    </div>
  );
}
