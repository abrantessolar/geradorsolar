import React, { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Eye, Search, ArrowUpRight, Upload, Edit2, RefreshCw } from 'lucide-react';
import WhatsAppLink from './WhatsAppLink';
import ClienteEditModal from './ClienteEditModal';
import { parsePaineis, parseInversor } from './equipmentParser';

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

export default function ClientesList({
  clientes, loading, onPromover, onRefresh, onImport,
}: {
  clientes: ClienteBase[];
  loading: boolean;
  onPromover: (c: ClienteBase) => void;
  onRefresh: () => void;
  onImport: () => void;
}) {
  const [search, setSearch] = useState('');
  const [marcaInversorFilter, setMarcaInversorFilter] = useState('');
  const [marcaPlacaFilter, setMarcaPlacaFilter] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<ClienteBase | null>(null);
  const [editCliente, setEditCliente] = useState<ClienteBase | null>(null);

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

  const handleReprocess = async () => {
    toast.info('Reprocessando equipamentos...');
    const { data, error } = await supabase.from('clientes_base' as any).select('id, dados_paineis, dados_inversor, marca_placa, marca_inversor');
    if (error) { toast.error(error.message); return; }
    const toUpdate = (data || []).filter((c: any) => (!c.marca_placa || c.marca_placa === '') || (!c.marca_inversor || c.marca_inversor === ''));
    let updated = 0;
    for (const c of toUpdate as any[]) {
      const changes: any = {};
      if ((!c.marca_placa || c.marca_placa === '') && c.dados_paineis) {
        const p = parsePaineis(c.dados_paineis);
        if (p) { changes.qtd_placas = p.qtd; changes.marca_placa = p.marca; changes.potencia_placa = p.potencia; }
      }
      if ((!c.marca_inversor || c.marca_inversor === '') && c.dados_inversor) {
        const p = parseInversor(c.dados_inversor);
        if (p) { changes.qtd_inversores = p.qtd; changes.marca_inversor = p.marca; changes.potencia_inversor = p.potencia; changes.tipo_inversor = p.tipo; }
      }
      if (Object.keys(changes).length > 0) {
        await supabase.from('clientes_base' as any).update(changes).eq('id', c.id);
        updated++;
      }
    }
    toast.success(`${updated} registros atualizados de ${toUpdate.length} pendentes.`);
    onRefresh();
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
          <button onClick={onImport} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors">
            <Upload className="w-4 h-4" /> Importar JSON
          </button>
          <button onClick={handleReprocess} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/70 transition-colors">
            <RefreshCw className="w-4 h-4" /> Reprocessar Equipamentos
          </button>
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} cliente(s)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 px-2">Nome</th>
                <th className="py-2 px-2">CPF</th>
                <th className="py-2 px-2">Telefone</th>
                <th className="py-2 px-2">UC</th>
                <th className="py-2 px-2">Concessionária</th>
                <th className="py-2 px-2">Marca Inv.</th>
                <th className="py-2 px-2">Pot. Inv.</th>
                <th className="py-2 px-2">Qtd Placas</th>
                <th className="py-2 px-2">Marca Placa</th>
                <th className="py-2 px-2">Pot. Placa</th>
                <th className="py-2 px-2">KWp</th>
                <th className="py-2 px-2">Valor</th>
                <th className="py-2 px-2">Instalação</th>
                <th className="py-2 px-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const isViaObra = c.origem === 'promovido_de_obra' || c.id.startsWith('proj-');
                return (
                <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-2 px-2 font-medium max-w-[180px] truncate">
                    {c.nome_completo || '—'}
                    {isViaObra && <span className="ml-1 inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700">✅ Via Obra</span>}
                  </td>
                  <td className="py-2 px-2 text-xs">{c.cpf || '—'}</td>
                  <td className="py-2 px-2 text-xs"><WhatsAppLink phone={c.telefone} /></td>
                  <td className="py-2 px-2 text-xs">{c.uc || '—'}</td>
                  <td className="py-2 px-2 text-xs">{c.concessionaria || '—'}</td>
                  <td className="py-2 px-2 text-xs">{c.marca_inversor || '—'}</td>
                  <td className="py-2 px-2 text-xs">{c.potencia_inversor || '—'}</td>
                  <td className="py-2 px-2 text-xs">{c.qtd_placas || '—'}</td>
                  <td className="py-2 px-2 text-xs">{c.marca_placa || '—'}</td>
                  <td className="py-2 px-2 text-xs">{c.potencia_placa || '—'}</td>
                  <td className="py-2 px-2 text-xs font-medium">{calcKwp(c.qtd_placas, c.potencia_placa)}</td>
                  <td className="py-2 px-2 text-xs">
                    {c.valor ? `R$ ${Number(c.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                  </td>
                  <td className="py-2 px-2 text-xs">
                    {c.instalado_em ? new Date(c.instalado_em).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex gap-1">
                      <button onClick={() => setSelectedCliente(c)} className="text-primary hover:text-primary/80" title="Ver detalhes">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditCliente(c)} className="text-primary hover:text-primary/80" title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {!c.projeto_id && (
                        <button onClick={() => onPromover(c)} className="text-green-600 hover:text-green-500" title="Promover para Obra">
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={14} className="py-8 text-center text-muted-foreground">Nenhum cliente encontrado.</td></tr>
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
                ['Inversor', selectedCliente.dados_inversor || `${selectedCliente.qtd_inversores || ''} ${selectedCliente.marca_inversor || ''} ${selectedCliente.potencia_inversor || ''}`],
                ['Tipo Inversor', selectedCliente.tipo_inversor],
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
                // Render phone fields as WhatsApp links
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
            {!selectedCliente.projeto_id && (
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
    </>
  );
}
