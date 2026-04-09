import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { BarChart3, ClipboardList, Zap, Plus, RefreshCw, Package, FileText, FileDown, Cpu, Upload } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import ClientesDashboard from '@/components/gestor/ClientesDashboard';
import ProjetosUnificados from '@/components/gestor/ProjetosUnificados';
import ProjetoForm from '@/components/gestor/ProjetoForm';
import DocumentosModal from '@/components/gestor/DocumentosModal';
import ModelosDocumentos from '@/components/gestor/ModelosDocumentos';
import MateriaisModule from '@/components/gestor/materiais/MateriaisModule';
import EquipmentDashboard from '@/components/gestor/EquipmentDashboard';
import ImportCSV from '@/components/gestor/ImportCSV';
import type { Projeto } from '@/pages/GestorPage';
import type { ClienteBase } from '@/components/gestor/ClientesList';

type MainTab = 'dashboard' | 'projetos' | 'acoes';
type AcoesView = 'menu' | 'novo_projeto' | 'editar_projeto' | 'modelos_docs' | 'materiais' | 'equipamentos' | 'importar';

export default function ClientesPage() {
  const navigate = useNavigate();
  const { session, isAdmin, permissions } = useAuth();
  const [mainTab, setMainTab] = useState<MainTab>('projetos');
  const [acoesView, setAcoesView] = useState<AcoesView>('menu');
  const [editId, setEditId] = useState<string | null>(null);

  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [clientes, setClientes] = useState<ClienteBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [docProjeto, setDocProjeto] = useState<Projeto | null>(null);

  const loadProjetos = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('projetos' as any)
      .select('*, equipamentos_placas!projetos_placa_id_fkey(marca,modelo,potencia_wp), equipamentos_inversores!projetos_inversor_id_fkey(marca,modelo,potencia_kw,tipo)')
      .not('status', 'eq', 'Instalado')
      .not('status', 'eq', 'Homologado')
      .order('criado_em', { ascending: false });
    if (error) {
      const { data: d2 } = await supabase.from('projetos' as any).select('*')
        .not('status', 'eq', 'Instalado').not('status', 'eq', 'Homologado')
        .order('criado_em', { ascending: false });
      setProjetos((d2 || []).map((p: any) => ({ ...p })));
    } else {
      setProjetos((data || []).map((p: any) => ({
        ...p,
        placa: p.equipamentos_placas || undefined,
        inversor: p.equipamentos_inversores || undefined,
      })));
    }
    setLoading(false);
  }, []);

  const loadClientes = useCallback(async () => {
    setLoadingClientes(true);
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
      nome_planta: p.nome_planta || null,
      satisfacao: null,
      origem: 'promovido_de_obra',
      projeto_id: p.id,
      telefone_2: null,
      telefone_3: null,
      observacoes: p.objecoes || null,
      kwp: p.qtd_placas && p.potencia_placa ? (p.qtd_placas * parseFloat(p.potencia_placa || '0')) / 1000 : null,
      data_fechamento: p.data_fechamento || null,
      logradouro: p.logradouro || null,
      complemento: p.complemento || null,
      bairro: p.bairro || null,
      cidade: p.cidade || null,
      estado: p.estado || null,
      cep: p.cep || null,
    }));

    setClientes([...fromBase, ...fromProjetos]);
    setLoadingClientes(false);
  }, []);

  useEffect(() => { loadProjetos(); loadClientes(); }, [loadProjetos, loadClientes]);

  const refreshAll = useCallback(() => { loadProjetos(); loadClientes(); }, [loadProjetos, loadClientes]);

  const handleEdit = (id: string) => {
    setEditId(id);
    setAcoesView('editar_projeto');
    setMainTab('acoes');
  };

  const handleSaved = () => {
    refreshAll();
    setAcoesView('menu');
    setMainTab('projetos');
    setEditId(null);
  };

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
    refreshAll();
  };

  const syncSheets = async () => {
    try {
      toast.info('Sincronizando com Google Sheets...');
      const { data, error } = await supabase.functions.invoke('sync-to-sheets', { body: { sync_all: true } });
      if (error) throw error;
      toast.success(`Sincronização concluída! ${data?.synced_obras || data?.synced || 0} obras, ${data?.synced_clientes || 0} clientes.`);
    } catch (err: any) {
      toast.error('Erro na sincronização: ' + (err.message || err));
    }
  };

  // Ações menu cards
  const acoesCards = [
    { key: 'novo_projeto' as const, icon: Plus, label: 'Novo Cliente/Projeto', desc: 'Cadastrar novo cliente e projeto', color: 'text-primary' },
    { key: 'modelos_docs' as const, icon: FileText, label: 'Modelos de Documentos', desc: 'Gerar contratos e procurações', color: 'text-blue-600' },
    ...(permissions.gestor_materiais ? [{ key: 'materiais' as const, icon: Package, label: 'Materiais', desc: 'Gerenciar produtos e fornecedores', color: 'text-amber-600' }] : []),
    ...(permissions.gestor_equipamentos ? [{ key: 'equipamentos' as const, icon: Cpu, label: 'Equipamentos', desc: 'Placas, inversores e kits', color: 'text-purple-600' }] : []),
    ...(permissions.importar_dados ? [{ key: 'importar' as const, icon: Upload, label: 'Importar CSV', desc: 'Importar projetos via arquivo', color: 'text-muted-foreground' }] : []),
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h1 className="text-lg sm:text-2xl font-bold text-primary">Clientes</h1>
        <div className="flex items-center gap-2">
          <button onClick={refreshAll} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/70 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
          </button>
          {permissions.sincronizar_sheets && (
            <button onClick={syncSheets} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Sync Sheets
            </button>
          )}
        </div>
      </div>

      <Tabs value={mainTab} onValueChange={(v) => { setMainTab(v as MainTab); if (v === 'acoes') setAcoesView('menu'); }}>
        <TabsList className="w-full justify-start gap-1 bg-transparent p-0 overflow-x-auto flex-nowrap">
          <TabsTrigger value="dashboard" className="flex items-center gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm whitespace-nowrap">
            <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="projetos" className="flex items-center gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm whitespace-nowrap">
            <ClipboardList className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Projetos
          </TabsTrigger>
          <TabsTrigger value="acoes" className="flex items-center gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm whitespace-nowrap">
            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Ações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <ClientesDashboard projetos={projetos} clientes={clientes} loading={loading || loadingClientes} onRefresh={refreshAll} />
        </TabsContent>

        <TabsContent value="projetos" className="space-y-4">
          <ProjetosUnificados
            projetos={projetos}
            clientes={clientes}
            loading={loading || loadingClientes}
            onEdit={handleEdit}
            onDocumentos={p => setDocProjeto(p)}
            onPromover={handlePromoverParaObra}
            onRefresh={refreshAll}
          />
        </TabsContent>

        <TabsContent value="acoes" className="space-y-4">
          {acoesView === 'menu' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {acoesCards.map(card => (
                <button
                  key={card.key}
                  onClick={() => setAcoesView(card.key)}
                  className="solar-card p-5 text-left hover:border-primary/30 transition-colors group"
                >
                  <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-3 ${card.color} group-hover:scale-110 transition-transform`}>
                    <card.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-sm">{card.label}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{card.desc}</p>
                </button>
              ))}
              {permissions.estoque && (
                <button
                  onClick={() => navigate('/estoque')}
                  className="solar-card p-5 text-left hover:border-primary/30 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-3 text-green-600 group-hover:scale-110 transition-transform">
                    <Package className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-sm">Estoque</h3>
                  <p className="text-xs text-muted-foreground mt-1">Entrada, retirada e retorno de materiais</p>
                </button>
              )}
            </div>
          )}

          {acoesView === 'novo_projeto' && (
            <div>
              <button onClick={() => setAcoesView('menu')} className="text-xs text-primary hover:underline mb-3">← Voltar</button>
              <ProjetoForm onSaved={handleSaved} />
            </div>
          )}

          {acoesView === 'editar_projeto' && editId && (
            <div>
              <button onClick={() => { setAcoesView('menu'); setEditId(null); }} className="text-xs text-primary hover:underline mb-3">← Voltar</button>
              <ProjetoForm projetoId={editId} onSaved={handleSaved} onCancel={() => { setAcoesView('menu'); setEditId(null); }} />
            </div>
          )}

          {acoesView === 'modelos_docs' && (
            <div>
              <button onClick={() => setAcoesView('menu')} className="text-xs text-primary hover:underline mb-3">← Voltar</button>
              <ModelosDocumentos />
            </div>
          )}

          {acoesView === 'materiais' && (
            <div>
              <button onClick={() => setAcoesView('menu')} className="text-xs text-primary hover:underline mb-3">← Voltar</button>
              <MateriaisModule />
            </div>
          )}

          {acoesView === 'equipamentos' && (
            <div>
              <button onClick={() => setAcoesView('menu')} className="text-xs text-primary hover:underline mb-3">← Voltar</button>
              <EquipmentDashboard clientes={clientes} />
            </div>
          )}

          {acoesView === 'importar' && (
            <div>
              <button onClick={() => setAcoesView('menu')} className="text-xs text-primary hover:underline mb-3">← Voltar</button>
              <ImportCSV onImported={refreshAll} />
            </div>
          )}
        </TabsContent>
      </Tabs>

      {docProjeto && (
        <DocumentosModal projeto={docProjeto} onClose={() => setDocProjeto(null)} />
      )}
    </div>
  );
}
