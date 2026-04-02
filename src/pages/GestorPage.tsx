import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  BarChart3, ClipboardList, Plus, Filter, FileText, Eye, Edit2,
  AlertTriangle, Clock, Building2, CheckCircle, Wrench, Home,
  Upload, ChevronLeft, ChevronRight, RefreshCw,
} from 'lucide-react';
import GestorDashboard from '@/components/gestor/GestorDashboard';
import ProjetoForm from '@/components/gestor/ProjetoForm';
import ProjetosList from '@/components/gestor/ProjetosList';
import DocumentosModal from '@/components/gestor/DocumentosModal';
import ModelosDocumentos from '@/components/gestor/ModelosDocumentos';
import ImportCSV from '@/components/gestor/ImportCSV';

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
  // Joined
  placa?: { marca: string; modelo: string; potencia_wp: number };
  inversor?: { marca: string; modelo: string; potencia_kw: number; tipo: string };
};

type TabKey = 'dashboard' | 'projetos' | 'novo' | 'editar' | 'modelos' | 'importar';

export default function GestorPage() {
  const { session } = useAuth();
  const [tab, setTab] = useState<TabKey>('dashboard');
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [docProjeto, setDocProjeto] = useState<Projeto | null>(null);

  const loadProjetos = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('projetos' as any)
      .select('*, equipamentos_placas!projetos_placa_id_fkey(marca,modelo,potencia_wp), equipamentos_inversores!projetos_inversor_id_fkey(marca,modelo,potencia_kw,tipo)')
      .order('criado_em', { ascending: false });
    if (error) {
      // Fallback without joins
      const { data: d2 } = await supabase.from('projetos' as any).select('*').order('criado_em', { ascending: false });
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

  useEffect(() => { loadProjetos(); }, [loadProjetos]);

  const handleEdit = (id: string) => {
    setEditId(id);
    setTab('editar');
  };

  const handleSaved = () => {
    loadProjetos();
    setTab('projetos');
    setEditId(null);
  };

  const tabs = [
    { key: 'dashboard' as const, label: 'Dashboard', icon: BarChart3 },
    { key: 'projetos' as const, label: 'Projetos', icon: ClipboardList },
    { key: 'novo' as const, label: 'Novo Projeto', icon: Plus },
    { key: 'modelos' as const, label: 'Modelos de Documentos', icon: FileText },
    { key: 'importar' as const, label: 'Importar CSV', icon: Upload },
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
              toast.success(`Sincronização concluída! ${data?.synced || 0} projetos sincronizados.`);
            } catch (err: any) {
              toast.error('Erro na sincronização: ' + (err.message || err));
            }
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Sincronizar Sheets
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key as TabKey); setEditId(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <GestorDashboard projetos={projetos} loading={loading} />}
      {tab === 'projetos' && (
        <ProjetosList
          projetos={projetos}
          loading={loading}
          onEdit={handleEdit}
          onDocumentos={p => setDocProjeto(p)}
          onRefresh={loadProjetos}
        />
      )}
      {tab === 'novo' && <ProjetoForm onSaved={handleSaved} />}
      {tab === 'editar' && editId && (
        <ProjetoForm projetoId={editId} onSaved={handleSaved} onCancel={() => { setTab('projetos'); setEditId(null); }} />
      )}
      {tab === 'modelos' && <ModelosDocumentos />}
      {tab === 'importar' && <ImportCSV onImported={loadProjetos} />}

      {docProjeto && (
        <DocumentosModal projeto={docProjeto} onClose={() => setDocProjeto(null)} />
      )}
    </div>
  );
}
