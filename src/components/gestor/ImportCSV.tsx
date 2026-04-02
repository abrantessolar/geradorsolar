import React, { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Upload, Check, AlertTriangle } from 'lucide-react';

function normalizeConcessionaria(v: string): string {
  const upper = v.toUpperCase().trim();
  if (['ELEKTRO', 'ELETRO', 'ELETKTRO', 'ELETKRO'].some(x => upper.includes(x)) || upper.replace(/K/gi, '').includes('ELETRO')) return 'ELEKTRO';
  if (upper.includes('ENERGISA')) return 'ENERGISA';
  if (upper.includes('COPEL')) return 'COPEL';
  return upper || 'ELEKTRO';
}

function normalizeLocalEntrega(v: string): string {
  const upper = v.toUpperCase().trim();
  if (['CLIENTE', 'CASA CLIENTE', 'CASA DO CLIENTE'].some(x => upper.includes(x))) return 'CASA DO CLIENTE';
  if (upper.includes('LOJA') || upper.includes('CL11') || upper.includes('MATERIAL GUARDADO')) return 'LOJA';
  return v.trim() || 'CASA DO CLIENTE';
}

function parseMonetario(v: string): number | null {
  const clean = v.replace(/R\$\s*/g, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

function parseDate(v: string): string | null {
  if (!v || !v.trim()) return null;
  const t = v.trim();
  const m = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  return null;
}

const FIELD_MAP: Record<string, string> = {
  'nome completo': 'nome_completo', 'cliente': 'nome_completo', 'nome': 'nome_completo', 'nome_completo': 'nome_completo',
  'cpf': 'cpf', 'cnpj': 'cnpj', 'tipo_pessoa': 'tipo_pessoa', 'tipo': 'tipo_pessoa',
  'razao_social': 'razao_social', 'endereco': 'endereco_completo', 'endereço': 'endereco_completo', 'endereco_completo': 'endereco_completo',
  'cep': 'cep', 'bairro': 'bairro', 'cidade': 'cidade', 'estado': 'estado', 'uf': 'estado',
  'telefone': 'telefone',
  'uc': 'unidade_geradora_codigo_uc', 'codigo_uc': 'unidade_geradora_codigo_uc',
  'concessionaria': 'concessionaria', 'concessionária': 'concessionaria',
  'sistema': 'sistema',
  'qtd placas': 'qtd_placas', 'qtd_placas': 'qtd_placas',
  'marca placa': 'marca_placa', 'marca_placa': 'marca_placa',
  'potencia placa': 'potencia_placa', 'potência placa': 'potencia_placa', 'potência placa (w)': 'potencia_placa', 'potencia placa (w)': 'potencia_placa', 'potencia_placa': 'potencia_placa',
  'marca inversor': 'marca_inversor', 'marca_inversor': 'marca_inversor',
  'potencia inversor': 'potencia_inversor', 'potência inversor': 'potencia_inversor', 'potencia_inversor': 'potencia_inversor',
  'qtd inversor': 'qtd_inversores', 'qtd inversores': 'qtd_inversores', 'qtd_inversores': 'qtd_inversores',
  'valor': 'preco_venda', 'valor (r$)': 'preco_venda', 'preco_venda': 'preco_venda', 'preço venda': 'preco_venda',
  'forma de pagamento': 'forma_pagamento', 'forma_pagamento': 'forma_pagamento',
  'data fechamento': 'data_fechamento', 'data_fechamento': 'data_fechamento',
  'data instalacao': 'data_instalacao', 'data instalação': 'data_instalacao', 'data_instalacao': 'data_instalacao',
  'instalado': 'instalado',
  'local entrega': 'local_entrega', 'local_entrega': 'local_entrega',
  'objecoes': 'objecoes', 'objeções': 'objecoes',
  'distribuidor': 'distribuidor',
  'instalador': 'instalador',
  'pagamento status': 'pagamento_status', 'pagamento_status': 'pagamento_status',
  'projeto enviado': 'projeto_enviado_em', 'projeto_enviado_em': 'projeto_enviado_em',
  'projeto aprovado': 'projeto_aprovado', 'projeto_aprovado': 'projeto_aprovado',
  'vistoriado em': 'vistoriado_em', 'vistoriado_em': 'vistoriado_em',
  'status': 'status_importacao',
  'geracao estimada': 'geracao_estimada_kwh', 'geracao_estimada_kwh': 'geracao_estimada_kwh',
};

function mapJsonRow(obj: Record<string, any>, userId: string): Record<string, any> {
  const row: Record<string, any> = {
    usuario_id: userId,
    concessionaria: 'ELEKTRO',
    status: 'Vendido',
    tipo_pessoa: 'PF',
    pagamento_status: 'Pendente',
  };

  let isInstalado = false;

  for (const [rawKey, rawVal] of Object.entries(obj)) {
    const val = String(rawVal ?? '').trim();
    if (!val) continue;

    const key = FIELD_MAP[rawKey.toLowerCase().replace(/\s+/g, ' ').trim()];
    if (!key) continue;
    if (key === 'status_importacao') continue;

    if (key === 'instalado') {
      const upper = val.toUpperCase();
      if (upper === 'TRUE' || upper === 'SIM' || val === '✓' || val === '✔') {
        isInstalado = true;
      }
      continue;
    }

    if (['qtd_placas', 'qtd_inversores'].includes(key)) {
      row[key] = parseInt(val) || null;
    } else if (key === 'preco_venda') {
      row[key] = parseMonetario(val);
    } else if (key === 'geracao_estimada_kwh') {
      row[key] = parseFloat(val.replace(',', '.')) || null;
    } else if (['data_fechamento', 'data_instalacao', 'projeto_enviado_em', 'projeto_aprovado', 'vistoriado_em'].includes(key)) {
      row[key] = parseDate(val);
    } else if (key === 'concessionaria') {
      row[key] = normalizeConcessionaria(val);
    } else if (key === 'local_entrega') {
      row[key] = normalizeLocalEntrega(val);
    } else {
      row[key] = val;
    }
  }

  if (isInstalado) row.status = 'Instalado';

  return row;
}

export default function ImportCSV({ onImported }: { onImported: () => void }) {
  const { session } = useAuth();
  const [items, setItems] = useState<Record<string, any>[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ ok: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (!Array.isArray(parsed) || parsed.length === 0) {
          toast.error('O arquivo JSON deve conter um array de objetos.');
          return;
        }
        setItems(parsed);
        setResult(null);
      } catch {
        toast.error('Arquivo JSON inválido. Verifique a formatação.');
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleImport = async () => {
    if (!session?.user?.id) return;
    setImporting(true);
    let ok = 0;
    const errors: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const row = mapJsonRow(items[i], session.user.id);

      if (!row.nome_completo && !row.razao_social) {
        errors.push(`Item ${i + 1}: nome do cliente ausente`);
        continue;
      }

      const { error } = await supabase.from('projetos' as any).insert(row);
      if (error) {
        errors.push(`Item ${i + 1}: ${error.message}`);
      } else {
        ok++;
      }
    }

    setResult({ ok, errors });
    setImporting(false);
    if (ok > 0) onImported();
  };

  const previewKeys = items.length > 0 ? Object.keys(items[0]) : [];

  return (
    <div className="solar-card p-6 space-y-4">
      <h2 className="text-lg font-bold text-primary">Importar JSON</h2>
      <p className="text-sm text-muted-foreground">
        Faça upload de um arquivo <strong>.json</strong> contendo um array de objetos. Chaves aceitas: CLIENTE, CPF, ENDEREÇO, TELEFONE, UC, CONCESSIONÁRIA, SISTEMA, QTD PLACAS, MARCA PLACA, POTÊNCIA PLACA (W), MARCA INVERSOR, POTÊNCIA INVERSOR, QTD INVERSOR, VALOR (R$), FORMA DE PAGAMENTO, DATA FECHAMENTO, DATA INSTALAÇÃO, INSTALADO, LOCAL ENTREGA, OBJEÇÕES, DISTRIBUIDOR, INSTALADOR, PAGAMENTO STATUS, PROJETO ENVIADO, PROJETO APROVADO, VISTORIADO EM.
      </p>
      <p className="text-xs text-muted-foreground">
        <strong>Normalização automática:</strong> Concessionária (variações de ELEKTRO → ELEKTRO), Local de Entrega (CLIENTE → CASA DO CLIENTE), Instalado ("true"/"✓" → Instalado), Valores monetários (remove R$ e converte).
      </p>

      <div>
        <input ref={fileRef} type="file" accept=".json" onChange={handleFile} className="hidden" />
        <button onClick={() => fileRef.current?.click()} className="solar-btn-primary text-sm py-2 px-4 flex items-center gap-2">
          <Upload className="w-4 h-4" /> Selecionar JSON
        </button>
      </div>

      {items.length > 0 && !result && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Preview ({Math.min(5, items.length)} de {items.length} itens):</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-border">
              <thead>
                <tr className="bg-muted">{previewKeys.map((h, i) => <th key={i} className="py-1 px-2 text-left">{h}</th>)}</tr>
              </thead>
              <tbody>
                {items.slice(0, 5).map((item, i) => (
                  <tr key={i} className="border-t border-border">
                    {previewKeys.map((k, j) => <td key={j} className="py-1 px-2">{String(item[k] ?? '')}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={handleImport} disabled={importing} className="solar-btn-primary text-sm py-2 px-4">
            {importing ? 'Importando...' : `Importar ${items.length} itens`}
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
          <button onClick={() => { setItems([]); setResult(null); }} className="text-sm text-muted-foreground hover:text-foreground">
            Importar outro arquivo
          </button>
        </div>
      )}
    </div>
  );
}
