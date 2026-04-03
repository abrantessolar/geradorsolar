import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  BarChart3, ClipboardList, Plus, FileText, Upload, RefreshCw, Users, Wrench, Package,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import GestorDashboard from '@/components/gestor/GestorDashboard';
import ProjetoForm from '@/components/gestor/ProjetoForm';
import ProjetosList from '@/components/gestor/ProjetosList';
import DocumentosModal from '@/components/gestor/DocumentosModal';
import ModelosDocumentos from '@/components/gestor/ModelosDocumentos';
import ImportCSV from '@/components/gestor/ImportCSV';
import ClientesList, { type ClienteBase } from '@/components/gestor/ClientesList';

import MateriaisModule from '@/components/gestor/materiais/MateriaisModule';

export type Projeto = {
  id: string;
  criado_em: string;
  atualizado_em: string;
  usuario_id: string;
  tipo_pessoa: string;
  nome_completo?: string;
  cpf?: string;
  data_nascimento?: string;
  razao_social?: string;
  cnpj?: string;
  nome_representante?: string;
  cpf_representante?: string;
  telefone?: string;
  endereco_completo?: string;
  logradouro?: string;
  complemento?: string;
  cep?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  concessionaria: string;
  placa_id?: string;
  qtd_placas?: number;
  inversor_id?: string;
  qtd_inversores?: number;
  geracao_estimada_kwh?: number;
  sistema?: string;
  marca_placa?: string;
  potencia_placa?: string;
  marca_inversor?: string;
  potencia_inversor?: string;
  preco_venda?: number;
  forma_pagamento?: string;
  unidade_geradora_cep?: string;
  unidade_geradora_endereco?: string;
  unidade_geradora_codigo_uc?: string;
  unidade_geradora_padrao?: string;
  unidade_beneficiaria1_cep?: string;
  unidade_beneficiaria1_endereco?: string;
  unidade_beneficiaria1_codigo_uc?: string;
  unidade_beneficiaria1_percentual?: number;
  unidade_beneficiaria2_cep?: string;
  unidade_beneficiaria2_endereco?: string;
  unidade_beneficiaria2_codigo_uc?: string;
  unidade_beneficiaria2_percentual?: number;
  data_fechamento?: string;
  data_instalacao?: string;
  local_entrega?: string;
  objecoes?: string;
  status: string;
  distribuidor?: string;
  instalador?: string;
  pagamento_status?: string;
  projeto_enviado_em?: string;
  projeto_aprovado?: string;
  vistoriado_em?: string;
  congelado?: boolean;
  congelado_ate?: string;
  motivo_congelamento?: string;
  layout_url?: string;
  wifi_nome?: string;
  wifi_senha?: string;
  nome_planta?: string;
  cabo_usado?: string;
  placa?: { marca: string; modelo: string; potencia_wp: number };
  inversor?: { marca: string; modelo: string; potencia_kw: number; tipo: string };
};

type ObrasSubTab = 'dashboard' | 'projetos' | 'novo' | 'editar' | 'modelos' | 'importar';
type ClientesSubTab = 'lista' | 'importar_clientes';

export default function GestorPage() {
  const { session, isAdmin } = useAuth();
  const [mainTab, setMainTab] = useState<'obras' | 'clientes' | 'materiais'>('obras');
  const [obrasSubTab, setObrasSubTab] = useState<ObrasSubTab>('dashboard');
  const [clientesSubTab, setClientesSubTab] = useState<ClientesSubTab>('lista');
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [clientes, setClientes] = useState<ClienteBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [docProjeto, setDocProjeto] = useState<Projeto | null>(null);

  // Only non-installed projects for Obras
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
    // Load from clientes_base
    const { data: cb } = await supabase.from('clientes_base' as any).select('*').order('criado_em', { ascending: false });
    // Also load installed projects
    const { data: installed } = await supabase.from('projetos' as any).select('*')
      .in('status', ['Instalado', 'Homologado'])
      .order('criado_em', { ascending: false });

    const fromBase: ClienteBase[] = (cb || []).map((c: any) => ({ ...c }));
    const fromProjetos: ClienteBase[] = (installed || []).filter((p: any) => {
      // Don't duplicate if already in clientes_base
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
    }));

    setClientes([...fromBase, ...fromProjetos]);
    setLoadingClientes(false);
  }, []);

  useEffect(() => { loadProjetos(); loadClientes(); }, [loadProjetos, loadClientes]);

  const handleEdit = (id: string) => { setEditId(id); setObrasSubTab('editar'); };
  const handleSaved = () => { loadProjetos(); loadClientes(); setObrasSubTab('projetos'); setEditId(null); };

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
    // Link cliente to projeto
    if (!cliente.id.startsWith('proj-')) {
      await supabase.from('clientes_base' as any).update({ projeto_id: (data as any).id }).eq('id', cliente.id);
    }
    toast.success('Cliente promovido para obra!');
    loadProjetos();
    loadClientes();
    setMainTab('obras');
    setObrasSubTab('projetos');
  };

  const obrasTabs = [
    { key: 'dashboard' as const, label: 'Dashboard', icon: BarChart3 },
    { key: 'projetos' as const, label: 'Projetos', icon: ClipboardList },
    { key: 'novo' as const, label: 'Novo Projeto', icon: Plus },
    { key: 'modelos' as const, label: 'Modelos', icon: FileText },
    ...(isAdmin ? [{ key: 'importar' as const, label: 'Importar JSON', icon: Upload }] : []),
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Painel do Gestor de Obras</h1>
        <button
          onClick={async () => {
            try {
              toast.info('Sincronizando com Google Sheets...');
              const { data, error } = await supabase.functions.invoke('sync-to-sheets', {
                body: { sync_all: true },
              });
              if (error) throw error;
              toast.success(`Sincronização concluída! ${data?.synced_obras || data?.synced || 0} obras, ${data?.synced_clientes || 0} clientes.`);
            } catch (err: any) {
              toast.error('Erro na sincronização: ' + (err.message || err));
            }
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Sincronizar Sheets
        </button>
      </div>

      {/* Main tabs: Obras / Clientes */}
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as any)}>
        <TabsList className="w-full justify-start gap-1 bg-transparent p-0">
          <TabsTrigger value="obras" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 py-2.5 rounded-lg">
            <Wrench className="w-4 h-4" /> Obras
          </TabsTrigger>
          <TabsTrigger value="clientes" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 py-2.5 rounded-lg">
            <Users className="w-4 h-4" /> Clientes
          </TabsTrigger>
          <TabsTrigger value="materiais" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 py-2.5 rounded-lg">
            <Package className="w-4 h-4" /> Materiais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="obras" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {obrasTabs.map(t => (
              <button key={t.key} onClick={() => { setObrasSubTab(t.key); setEditId(null); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  obrasSubTab === t.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'
                }`}>
                <t.icon className="w-4 h-4" /> {t.label}
              </button>
            ))}
          </div>

          {obrasSubTab === 'dashboard' && <GestorDashboard projetos={projetos} loading={loading} onRefresh={loadProjetos} />}
          {obrasSubTab === 'projetos' && (
            <ProjetosList projetos={projetos} loading={loading} onEdit={handleEdit} onDocumentos={p => setDocProjeto(p)} onRefresh={loadProjetos} />
          )}
          {obrasSubTab === 'novo' && <ProjetoForm onSaved={handleSaved} />}
          {obrasSubTab === 'editar' && editId && (
            <ProjetoForm projetoId={editId} onSaved={handleSaved} onCancel={() => { setObrasSubTab('projetos'); setEditId(null); }} />
          )}
          {obrasSubTab === 'modelos' && <ModelosDocumentos />}
          {obrasSubTab === 'importar' && <ImportCSV onImported={loadProjetos} />}
        </TabsContent>

        <TabsContent value="clientes" className="space-y-4">
          <ClientesList
            clientes={clientes}
            loading={loadingClientes}
            onPromover={handlePromoverParaObra}
            onRefresh={loadClientes}
          />
        </TabsContent>

        <TabsContent value="materiais" className="space-y-4">
          <MateriaisModule />
        </TabsContent>
      </Tabs>

      {docProjeto && (
        <DocumentosModal projeto={docProjeto} onClose={() => setDocProjeto(null)} />
      )}
    </div>
  );
}
