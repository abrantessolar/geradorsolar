import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import ClientesList, { type ClienteBase } from '@/components/gestor/ClientesList';

export default function ClientesPage() {
  const { session } = useAuth();
  const [clientes, setClientes] = useState<ClienteBase[]>([]);
  const [loading, setLoading] = useState(true);

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
      numero: p.complemento ? null : null,
      complemento: p.complemento || null,
      bairro: p.bairro || null,
      cidade: p.cidade || null,
      estado: p.estado || null,
      cep: p.cep || null,
      data_nascimento: p.data_nascimento || null,
      email: null,
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

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 px-2 sm:px-0">
      <h1 className="text-lg sm:text-2xl font-bold text-primary">Clientes</h1>
      <ClientesList
        clientes={clientes}
        loading={loading}
        onPromover={handlePromoverParaObra}
        onRefresh={loadClientes}
      />
    </div>
  );
}
