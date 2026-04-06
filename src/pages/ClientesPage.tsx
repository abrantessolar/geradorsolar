import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ClientesList, { type ClienteBase } from '@/components/gestor/ClientesList';
import { Calendar } from 'lucide-react';

export default function ClientesPage() {
  const { session } = useAuth();
  const [clientes, setClientes] = useState<ClienteBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('todos');
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [dateValue, setDateValue] = useState('');

  const loadClientes = useCallback(async () => {
    setLoading(true);
    const { data: cb } = await supabase.from('clientes_base' as any).select('*').order('criado_em', { ascending: false });
    const { data: installed } = await supabase.from('projetos' as any).select('*')
      .in('status', ['Instalado', 'Homologado'])
      .order('criado_em', { ascending: false });

    const fromBase: ClienteBase[] = (cb || []).map((c: any) => ({ ...c }));
    const fromProjetos: ClienteBase[] = (installed || []).filter((p: any) => {
      return !fromBase.some(c => c.projeto_id === p.id);
    }).map((p: any) => ({
      id: `proj-${p.id}`,
      criado_em: p.criado_em,
      nome_completo: p.nome_completo || p.razao_social,
      cpf: p.cpf || p.cnpj,
      endereco: p.endereco_completo,
      telefone: p.telefone,
      uc: p.unidade_geradora_codigo_uc,
      concessionaria: p.concessionaria,
      sistema: p.sistema,
      dados_paineis: null,
      dados_inversor: null,
      qtd_placas: p.qtd_placas,
      marca_placa: p.marca_placa,
      potencia_placa: p.potencia_placa,
      qtd_inversores: p.qtd_inversores,
      marca_inversor: p.marca_inversor,
      potencia_inversor: p.potencia_inversor,
      tipo_inversor: null,
      fornecedor: p.distribuidor,
      valor: p.preco_venda,
      forma_pagamento: p.forma_pagamento,
      projeto_enviado_em: p.projeto_enviado_em,
      projeto_aprovado: p.projeto_aprovado,
      instalado_em: p.data_instalacao,
      vistoriado_em: p.vistoriado_em,
      nome_planta: null,
      satisfacao: null,
      origem: 'promovido_de_obra',
      projeto_id: p.id,
      telefone_2: null,
      telefone_3: null,
      observacoes: p.objecoes || null,
      kwp: p.qtd_placas && p.potencia_placa ? (p.qtd_placas * parseFloat(p.potencia_placa || '0')) / 1000 : null,
      data_fechamento: p.data_fechamento || null,
    }));

    setClientes([...fromBase, ...fromProjetos]);
    setLoading(false);
  }, []);

  useEffect(() => { loadClientes(); }, [loadClientes]);

  const handlePromoverParaObra = async (cliente: ClienteBase) => {
    if (!session?.user?.id) return;
    const projeto: any = {
      usuario_id: session.user.id,
      tipo_pessoa: 'PF',
      nome_completo: cliente.nome_completo,
      cpf: cliente.cpf,
      endereco_completo: cliente.endereco,
      telefone: cliente.telefone,
      unidade_geradora_codigo_uc: cliente.uc,
      concessionaria: cliente.concessionaria || 'ELEKTRO',
      sistema: cliente.sistema,
      qtd_placas: cliente.qtd_placas,
      marca_placa: cliente.marca_placa,
      potencia_placa: cliente.potencia_placa,
      qtd_inversores: cliente.qtd_inversores,
      marca_inversor: cliente.marca_inversor,
      potencia_inversor: cliente.potencia_inversor,
      preco_venda: cliente.valor,
      forma_pagamento: cliente.forma_pagamento,
      status: 'Vendido',
    };
    const { data, error } = await supabase.from('projetos' as any).insert(projeto).select('id').single();
    if (error) { toast.error('Erro ao criar projeto: ' + error.message); return; }
    if (!cliente.id.startsWith('proj-')) {
      await supabase.from('clientes_base' as any).update({ projeto_id: (data as any).id }).eq('id', cliente.id);
    }
    toast.success('Cliente promovido para obra!');
    loadClientes();
  };

  const instalados = useMemo(() => clientes.filter(c => c.instalado_em), [clientes]);
  const pendentes = useMemo(() => clientes.filter(c => !c.instalado_em), [clientes]);

  const somenteDataList = useMemo(() => {
    return [...clientes].sort((a, b) => {
      const dateA = a.instalado_em || (a as any).data_fechamento || '';
      const dateB = b.instalado_em || (b as any).data_fechamento || '';
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateB.localeCompare(dateA);
    });
  }, [clientes]);

  function monthsSince(dateStr?: string | null): string {
    if (!dateStr) return '—';
    const diff = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    return `${Math.floor(diff)} meses`;
  }

  const handleSaveDate = async (cliente: ClienteBase) => {
    if (!dateValue) return;
    const isProj = cliente.id.startsWith('proj-');
    if (isProj) {
      const realId = cliente.projeto_id || cliente.id.replace('proj-', '');
      const { error } = await supabase.from('projetos' as any).update({ data_instalacao: dateValue }).eq('id', realId);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from('clientes_base' as any).update({ instalado_em: dateValue }).eq('id', cliente.id);
      if (error) { toast.error(error.message); return; }
    }
    toast.success('Data salva!');
    setEditingDateId(null);
    setDateValue('');
    loadClientes();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 px-2 sm:px-0">
      <h1 className="text-lg sm:text-2xl font-bold text-primary">Clientes</h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start gap-1 bg-transparent p-0 overflow-x-auto flex-nowrap">
          <TabsTrigger value="todos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 sm:px-6 py-2 rounded-lg text-xs sm:text-sm whitespace-nowrap">
            Todos ({clientes.length})
          </TabsTrigger>
          <TabsTrigger value="instalados" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 sm:px-6 py-2 rounded-lg text-xs sm:text-sm whitespace-nowrap">
            Instalados ({instalados.length})
          </TabsTrigger>
          <TabsTrigger value="pendentes" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 sm:px-6 py-2 rounded-lg text-xs sm:text-sm whitespace-nowrap">
            Pendentes ({pendentes.length})
          </TabsTrigger>
          <TabsTrigger value="somente-data" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 sm:px-6 py-2 rounded-lg text-xs sm:text-sm whitespace-nowrap flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Somente Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="todos">
          <ClientesList clientes={clientes} loading={loading} onPromover={handlePromoverParaObra} onRefresh={loadClientes} />
        </TabsContent>
        <TabsContent value="instalados">
          <ClientesList clientes={instalados} loading={loading} onPromover={handlePromoverParaObra} onRefresh={loadClientes} />
        </TabsContent>
        <TabsContent value="pendentes">
          <ClientesList clientes={pendentes} loading={loading} onPromover={handlePromoverParaObra} onRefresh={loadClientes} />
        </TabsContent>
        <TabsContent value="somente-data">
          <div className="solar-card p-3 sm:p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 px-2">Nome</th>
                    <th className="py-2 px-2">Data</th>
                    <th className="py-2 px-2">Meses</th>
                  </tr>
                </thead>
                <tbody>
                  {somenteDataList.map(c => {
                    const dateStr = c.instalado_em || (c as any).data_fechamento;
                    return (
                      <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2 px-2 font-medium truncate max-w-[250px]">{c.nome_completo || '—'}</td>
                        <td className="py-2 px-2 text-xs">
                          {editingDateId === c.id ? (
                            <div className="flex items-center gap-1">
                              <input type="date" className="solar-input text-xs px-2 py-1 w-36" value={dateValue} onChange={e => setDateValue(e.target.value)} />
                              <button onClick={() => handleSaveDate(c)} className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded">Salvar</button>
                              <button onClick={() => setEditingDateId(null)} className="text-xs px-2 py-1 text-muted-foreground">✕</button>
                            </div>
                          ) : dateStr ? (
                            new Date(dateStr).toLocaleDateString('pt-BR')
                          ) : (
                            <button onClick={() => { setEditingDateId(c.id); setDateValue(''); }} className="text-xs text-primary hover:underline flex items-center gap-1">
                              📅 Preencher
                            </button>
                          )}
                        </td>
                        <td className="py-2 px-2 text-xs text-muted-foreground">{monthsSince(c.instalado_em)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
