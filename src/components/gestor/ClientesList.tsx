import React, { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Eye, Search, ArrowUpRight, Edit2, GripVertical, Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import DeleteConfirmModal from './DeleteConfirmModal';
import WhatsAppLink from './WhatsAppLink';
import ClienteEditModal from './ClienteEditModal';

import { useDraggableColumns } from '@/hooks/useDraggableColumns';

export type ClienteBase = {
  id: string;
  criado_em: string;
  nome_completo: string | null;
  cpf: string | null;
  endereco: string | null;
  telefone: string | null;
  uc: string | null;
  concessionaria: string | null;
  sistema: string | null;
  dados_paineis: string | null;
  dados_inversor: string | null;
  qtd_placas: number | null;
  marca_placa: string | null;
  potencia_placa: string | null;
  qtd_inversores: number | null;
  marca_inversor: string | null;
  potencia_inversor: string | null;
  tipo_inversor: string | null;
  fornecedor: string | null;
  valor: number | null;
  forma_pagamento: string | null;
  projeto_enviado_em: string | null;
  projeto_aprovado: string | null;
  instalado_em: string | null;
  vistoriado_em: string | null;
  nome_planta: string | null;
  satisfacao: string | null;
  origem: string;
  projeto_id: string | null;
  telefone_2: string | null;
  telefone_3: string | null;
  observacoes: string | null;
  kwp: number | null;
};

function calcKwp(qtd?: number | null, potW?: string | null): string {
  if (!qtd || !potW) return '—';
  const pot = parseFloat(potW);
  if (isNaN(pot)) return '—';
  return ((qtd * pot) / 1000).toFixed(2);
}

const COL_KEYS = ['nome', 'cpf', 'telefone', 'endereco', 'uc', 'concessionaria', 'marca_inv', 'pot_inv', 'qtd_placas', 'marca_placa', 'pot_placa', 'kwp', 'valor', 'forma_pgto', 'instalacao', 'acoes'];

export default function ClientesList({
  clientes, loading, onPromover, onRefresh, onImport, showImport = true,
}: {
  clientes: ClienteBase[];
  loading: boolean;
  onPromover: (c: ClienteBase) => void;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState('');
  const [marcaInversorFilter, setMarcaInversorFilter] = useState('');
  const [marcaPlacaFilter, setMarcaPlacaFilter] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<ClienteBase | null>(null);
  const [editCliente, setEditCliente] = useState<ClienteBase | null>(null);
  const [deleteCliente, setDeleteCliente] = useState<ClienteBase | null>(null);

  const { order, onDragStart, onDragOver, onDragEnd, dragIdx } = useDraggableColumns('gestor-clientes-cols', COL_KEYS);

  const marcasInversor = useMemo(() => {
    const set = new Set<string>();
    clientes.forEach(c => { if (c.marca_inversor) set.add(c.marca_inversor); });
    return Array.from(set).sort();
  }, [clientes]);

  const marcasPlaca = useMemo(() => {
    const set = new Set<string>();
    clientes.forEach(c => { if (c.marca_placa) set.add(c.marca_placa); });
    return Array.from(set).sort();
  }, [clientes]);

  const filtered = useMemo(() => {
    return clientes.filter(c => {
      if (marcaInversorFilter && c.marca_inversor !== marcaInversorFilter) return false;
      if (marcaPlacaFilter && c.marca_placa !== marcaPlacaFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = (c.nome_completo || '').toLowerCase();
        const cpf = (c.cpf || '').toLowerCase();
        const uc = (c.uc || '').toLowerCase();
        if (!name.includes(q) && !cpf.includes(q) && !uc.includes(q)) return false;
      }
      return true;
    });
  }, [clientes, search, marcaInversorFilter, marcaPlacaFilter]);

  const colHeaders: Record<string, string> = {
    nome: 'Nome', cpf: 'CPF', telefone: 'Telefone', uc: 'UC',
    concessionaria: 'Concessionária', marca_inv: 'Marca Inv.', pot_inv: 'Pot. Inv.',
    qtd_placas: 'Qtd Placas', marca_placa: 'Marca Placa', pot_placa: 'Pot. Placa',
    kwp: 'KWp', valor: 'Valor', forma_pgto: 'Forma Pgto.', instalacao: 'Instalação', acoes: 'Ações',
  };

  const renderCell = (key: string, c: ClienteBase) => {
    const isViaObra = c.origem === 'promovido_de_obra' || c.id.startsWith('proj-');
    switch (key) {
      case 'nome': return (
        <td key={key} className="py-2 px-2 font-medium max-w-[180px] truncate">
          {c.nome_completo || '—'}
          {isViaObra && <span className="ml-1 inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent text-accent-foreground">✅ Via Obra</span>}
        </td>
      );
      case 'cpf': return <td key={key} className="py-2 px-2 text-xs">{c.cpf || '—'}</td>;
      case 'telefone': return <td key={key} className="py-2 px-2 text-xs"><WhatsAppLink phone={c.telefone} /></td>;
      case 'uc': return <td key={key} className="py-2 px-2 text-xs">{c.uc || '—'}</td>;
      case 'concessionaria': return <td key={key} className="py-2 px-2 text-xs">{c.concessionaria || '—'}</td>;
      case 'marca_inv': return (
        <td key={key} className="py-2 px-2 text-xs">
          {c.marca_inversor || '—'}
          {c.tipo_inversor?.toLowerCase() === 'micro' && (
            <span className="ml-1 inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/15 text-primary">MICRO</span>
          )}
        </td>
      );
      case 'pot_inv': return (
        <td key={key} className="py-2 px-2 text-xs">
          {c.tipo_inversor?.toLowerCase() === 'micro' && c.potencia_inversor && c.qtd_inversores
            ? `${c.potencia_inversor} kW × ${c.qtd_inversores}`
            : c.potencia_inversor ? `${c.potencia_inversor} kW` : '—'}
        </td>
      );
      case 'qtd_placas': return <td key={key} className="py-2 px-2 text-xs">{c.qtd_placas || '—'}</td>;
      case 'marca_placa': return <td key={key} className="py-2 px-2 text-xs">{c.marca_placa || '—'}</td>;
      case 'pot_placa': return <td key={key} className="py-2 px-2 text-xs">{c.potencia_placa || '—'}</td>;
      case 'kwp': return <td key={key} className="py-2 px-2 text-xs font-medium">{c.kwp ? Number(c.kwp).toFixed(2) : calcKwp(c.qtd_placas, c.potencia_placa)}</td>;
      case 'valor': return <td key={key} className="py-2 px-2 text-xs">{c.valor ? `R$ ${Number(c.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}</td>;
      case 'forma_pgto': return <td key={key} className="py-2 px-2 text-xs">{c.forma_pagamento || '—'}</td>;
      case 'instalacao': return <td key={key} className="py-2 px-2 text-xs">{c.instalado_em ? new Date(c.instalado_em).toLocaleDateString('pt-BR') : '—'}</td>;
      case 'acoes': return (
        <td key={key} className="py-2 px-2">
          <div className="flex gap-1">
            <button onClick={() => setSelectedCliente(c)} className="text-primary hover:text-primary/80" title="Ver detalhes"><Eye className="w-4 h-4" /></button>
            <button onClick={() => setEditCliente(c)} className="text-primary hover:text-primary/80" title="Editar"><Edit2 className="w-4 h-4" /></button>
            {!c.projeto_id && !c.id.startsWith('proj-') && (
              <button onClick={() => onPromover(c)} className="text-primary hover:text-primary/80" title="Promover para Obra"><ArrowUpRight className="w-4 h-4" /></button>
            )}
            {!c.id.startsWith('proj-') && (
              <button onClick={() => setDeleteCliente(c)} className="text-destructive hover:text-destructive/80" title="Excluir"><Trash2 className="w-4 h-4" /></button>
            )}
          </div>
        </td>
      );
      default: return <td key={key} className="py-2 px-2">—</td>;
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <>
      <div className="solar-card p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input className="solar-input pl-9 max-w-xs" placeholder="Buscar nome, CPF ou UC..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="solar-input max-w-[180px]" value={marcaInversorFilter} onChange={e => setMarcaInversorFilter(e.target.value)}>
            <option value="">Todas marcas inversor</option>
            {marcasInversor.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select className="solar-input max-w-[180px]" value={marcaPlacaFilter} onChange={e => setMarcaPlacaFilter(e.target.value)}>
            <option value="">Todas marcas placa</option>
            {marcasPlaca.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          {showImport && (
            <button onClick={onImport} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors">
              <Upload className="w-4 h-4" /> Importar JSON
            </button>
          )}
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} cliente(s)</span>
        </div>

        <p className="text-[11px] text-muted-foreground flex items-center gap-1"><GripVertical className="w-3 h-3" /> Arraste os cabeçalhos para reordenar colunas</p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                {order.map((key, idx) => (
                  <th
                    key={key}
                    className={`py-2 px-2 cursor-grab select-none ${dragIdx === idx ? 'opacity-50' : ''}`}
                    draggable
                    onDragStart={() => onDragStart(idx)}
                    onDragOver={e => onDragOver(e, idx)}
                    onDragEnd={onDragEnd}
                  >
                    {colHeaders[key] || key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30">
                  {order.map(key => renderCell(key, c))}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={order.length} className="py-8 text-center text-muted-foreground">Nenhum cliente encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCliente && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedCliente(null)}>
          <div className="bg-background rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-primary">{selectedCliente.nome_completo || 'Cliente'}</h2>
              <button onClick={() => setSelectedCliente(null)} className="text-muted-foreground hover:text-foreground text-xl">×</button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['CPF', selectedCliente.cpf],
                ['Telefone 1', selectedCliente.telefone],
                ['Telefone 2', selectedCliente.telefone_2],
                ['Telefone 3', selectedCliente.telefone_3],
                ['Endereço', selectedCliente.endereco],
                ['UC', selectedCliente.uc],
                ['Concessionária', selectedCliente.concessionaria],
                ['Sistema', selectedCliente.sistema],
                ['Painéis', selectedCliente.dados_paineis || `${selectedCliente.qtd_placas || ''} ${selectedCliente.marca_placa || ''} ${selectedCliente.potencia_placa || ''}`],
                ['Inversor', selectedCliente.tipo_inversor?.toLowerCase() === 'micro' && selectedCliente.qtd_inversores && selectedCliente.marca_inversor && selectedCliente.potencia_inversor
                  ? `${selectedCliente.qtd_inversores}x ${selectedCliente.marca_inversor} ${selectedCliente.potencia_inversor}kW (MICRO)`
                  : selectedCliente.dados_inversor || `${selectedCliente.qtd_inversores || '1'}x ${selectedCliente.marca_inversor || ''} ${selectedCliente.potencia_inversor || ''}kW`],
                ['Tipo Inversor', selectedCliente.tipo_inversor || 'String'],
                ['KWp', selectedCliente.kwp ? Number(selectedCliente.kwp).toFixed(2) : calcKwp(selectedCliente.qtd_placas, selectedCliente.potencia_placa)],
                ['Fornecedor', selectedCliente.fornecedor],
                ['Valor', selectedCliente.valor ? `R$ ${Number(selectedCliente.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : null],
                ['Forma Pagamento', selectedCliente.forma_pagamento],
                ['Projeto Enviado', selectedCliente.projeto_enviado_em],
                ['Projeto Aprovado', selectedCliente.projeto_aprovado],
                ['Instalado em', selectedCliente.instalado_em],
                ['Vistoriado em', selectedCliente.vistoriado_em],
                ['Nome Planta', selectedCliente.nome_planta],
                ['Satisfação', selectedCliente.satisfacao],
                ['Origem', selectedCliente.origem === 'importacao' ? 'Importação' : 'Promovido de Obra'],
              ].map(([label, val]) => {
                if ((label === 'Telefone 1' || label === 'Telefone 2' || label === 'Telefone 3') && val) {
                  return (
                    <div key={label as string}>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <div className="font-medium"><WhatsAppLink phone={val as string} /></div>
                    </div>
                  );
                }
                return (
                  <div key={label as string}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-medium">{(val as string) || '—'}</p>
                  </div>
                );
              })}
              {selectedCliente.observacoes && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Observações</p>
                  <p className="font-medium whitespace-pre-wrap">{selectedCliente.observacoes}</p>
                </div>
              )}
            </div>
            {!selectedCliente.projeto_id && !selectedCliente.id.startsWith('proj-') && (
              <button
                onClick={() => { onPromover(selectedCliente); setSelectedCliente(null); }}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <ArrowUpRight className="w-4 h-4" /> Promover para Obra
              </button>
            )}
          </div>
        </div>
      )}

      {editCliente && (
        <ClienteEditModal
          cliente={editCliente}
          onClose={() => setEditCliente(null)}
          onSaved={() => { onRefresh(); setEditCliente(null); }}
        />
      )}

      {deleteCliente && (
        <DeleteConfirmModal
          nome={deleteCliente.nome_completo || 'Cliente'}
          id={deleteCliente.id}
          tabela="clientes_base"
          onClose={() => setDeleteCliente(null)}
          onDeleted={() => { setDeleteCliente(null); onRefresh(); }}
        />
      )}
    </>
  );
}
