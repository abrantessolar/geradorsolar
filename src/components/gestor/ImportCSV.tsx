import React, { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Upload, Check, AlertTriangle, X } from 'lucide-react';

export default function ImportCSV({ onImported }: { onImported: () => void }) {
  const { session } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ ok: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').map(l => l.split(';').map(c => c.trim().replace(/^"|"$/g, '')));
      if (lines.length < 2) { toast.error('CSV vazio'); return; }
      setHeaders(lines[0]);
      setRows(lines.slice(1).filter(l => l.some(c => c)));
      setResult(null);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const FIELD_MAP: Record<string, string> = {
    'cliente': 'nome_completo', 'nome': 'nome_completo', 'nome_completo': 'nome_completo',
    'cpf': 'cpf', 'cnpj': 'cnpj', 'tipo_pessoa': 'tipo_pessoa', 'tipo': 'tipo_pessoa',
    'razao_social': 'razao_social', 'endereco': 'endereco_completo', 'endereco_completo': 'endereco_completo',
    'cep': 'cep', 'bairro': 'bairro', 'cidade': 'cidade', 'estado': 'estado', 'uf': 'estado',
    'concessionaria': 'concessionaria', 'qtd_placas': 'qtd_placas', 'qtd_inversores': 'qtd_inversores',
    'geracao_estimada': 'geracao_estimada_kwh', 'geracao_estimada_kwh': 'geracao_estimada_kwh',
    'preco_venda': 'preco_venda', 'forma_pagamento': 'forma_pagamento',
    'data_fechamento': 'data_fechamento', 'data_instalacao': 'data_instalacao',
    'local_entrega': 'local_entrega', 'objecoes': 'objecoes', 'status': 'status',
    'codigo_uc': 'unidade_geradora_codigo_uc',
  };

  const handleImport = async () => {
    if (!session?.user?.id) return;
    setImporting(true);
    let ok = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row: any = { usuario_id: session.user.id, concessionaria: 'Elektro', status: 'Vendido', tipo_pessoa: 'PF' };
      headers.forEach((h, j) => {
        const key = FIELD_MAP[h.toLowerCase().replace(/\s+/g, '_')];
        if (key && rows[i][j]) {
          const val = rows[i][j];
          if (['qtd_placas', 'qtd_inversores'].includes(key)) row[key] = parseInt(val) || null;
          else if (['preco_venda', 'geracao_estimada_kwh'].includes(key)) row[key] = parseFloat(val.replace(',', '.')) || null;
          else row[key] = val;
        }
      });

      if (!row.nome_completo && !row.razao_social) {
        errors.push(`Linha ${i + 2}: nome do cliente ausente`);
        continue;
      }

      const { error } = await supabase.from('projetos' as any).insert(row);
      if (error) {
        errors.push(`Linha ${i + 2}: ${error.message}`);
      } else {
        ok++;
      }
    }

    setResult({ ok, errors });
    setImporting(false);
    if (ok > 0) onImported();
  };

  return (
    <div className="solar-card p-6 space-y-4">
      <h2 className="text-lg font-bold text-primary">Importar CSV</h2>
      <p className="text-sm text-muted-foreground">
        Faça upload de um arquivo .csv com separador ponto-e-vírgula (;). Colunas aceitas: Cliente, CPF, CNPJ, Tipo Pessoa, Endereço, CEP, Cidade, Estado, Concessionária, Qtd Placas, Qtd Inversores, Geração Estimada, Preço Venda, Forma Pagamento, Data Fechamento, Status, Objeções, etc.
      </p>

      <div>
        <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
        <button onClick={() => fileRef.current?.click()} className="solar-btn-primary text-sm py-2 px-4 flex items-center gap-2">
          <Upload className="w-4 h-4" /> Selecionar CSV
        </button>
      </div>

      {rows.length > 0 && !result && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Preview ({Math.min(5, rows.length)} de {rows.length} linhas):</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-border">
              <thead>
                <tr className="bg-muted">{headers.map((h, i) => <th key={i} className="py-1 px-2 text-left">{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((r, i) => (
                  <tr key={i} className="border-t border-border">{r.map((c: string, j: number) => <td key={j} className="py-1 px-2">{c}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={handleImport} disabled={importing} className="solar-btn-primary text-sm py-2 px-4">
            {importing ? 'Importando...' : `Importar ${rows.length} linhas`}
          </button>
        </div>
      )}

      {result && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 text-green-600" />
            <span className="text-green-700 font-medium">{result.ok} importados com sucesso</span>
          </div>
          {result.errors.length > 0 && (
            <div>
              <p className="text-sm font-medium text-destructive flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> {result.errors.length} erro(s):</p>
              <ul className="text-xs text-destructive space-y-1 mt-1">
                {result.errors.map((err, i) => <li key={i}>• {err}</li>)}
              </ul>
            </div>
          )}
          <button onClick={() => { setRows([]); setHeaders([]); setResult(null); }} className="text-sm text-muted-foreground hover:text-foreground">
            Importar outro arquivo
          </button>
        </div>
      )}
    </div>
  );
}
