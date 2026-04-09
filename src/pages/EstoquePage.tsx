import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Package, Send, RotateCcw, BarChart3, RefreshCw, ArrowLeft,
  Check, AlertTriangle, Loader2, X, Phone, MapPin, Wrench, Plus, Trash2, FileDown
} from 'lucide-react';
import { CATEGORIA_ICONS } from '@/components/gestor/materiais/types';
import { generateFichaInstalacao } from '@/lib/generateFichaInstalacao';
import MoneyInput, { formatBRL } from '@/components/ui/money-input';
import MateriaisModule from '@/components/gestor/materiais/MateriaisModule';
import { Settings } from 'lucide-react';

/* ─── Types ─── */
type ObraCard = {
  id: string;
  nome: string;
  telefone?: string;
  endereco?: string;
  data_instalacao?: string;
  instalador?: string;
  status: string;
  marca_placa?: string;
  potencia_placa?: string;
  qtd_placas?: number;
  marca_inversor?: string;
  potencia_inversor?: string;
  qtd_inversores?: number;
  sistema?: string;
  criado_em: string;
  separados: number;
  total_materiais: number;
  materiais_faltantes: string[];
};

type EstoqueRow = {
  material_id: string;
  nome: string;
  categoria: string;
  quantidade_atual: number;
  quantidade_minima: number | null;
  preco_unitario: number | null;
};

type MatItem = {
  id: string;
  material_id: string;
  nome: string;
  categoria: string;
  quantidade_necessaria: number;
  quantidade_separada: number;
  separado: boolean;
  estoque_atual: number;
  qtd_retirar: number; // editable
};

type CaboItem = {
  id: string;
  tipo_cabo: string;
  quantidade_metros: number;
  metros_retirar: number; // editable
  observacao: string | null;
};

type AllMaterial = { id: string; nome: string; categoria: string };

/* ─── Main Page ─── */
export default function EstoquePage() {
  const { session } = useAuth();
  const navigate = useNavigate();

  const [obras, setObras] = useState<ObraCard[]>([]);
  const [estoque, setEstoque] = useState<EstoqueRow[]>([]);
  const [allMaterials, setAllMaterials] = useState<AllMaterial[]>([]);
  const [selectedObra, setSelectedObra] = useState<ObraCard | null>(null);
  const [obraDetails, setObraDetails] = useState<{ materiais: MatItem[]; cabos: CaboItem[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const [activeAction, setActiveAction] = useState<'entrada' | 'retorno' | 'estoque' | 'materiais' | null>(null);

  // Entrada em lote
  const [entradaRows, setEntradaRows] = useState<{ id: string; nome: string; categoria: string; estoque_atual: number; entrada: string; preco_unitario: string }[]>([]);
  const [entradaNota, setEntradaNota] = useState('');
  const [savingEntrada, setSavingEntrada] = useState(false);

  // Retorno
  const [retornoObra, setRetornoObra] = useState('');
  const [retornoItems, setRetornoItems] = useState<{ material_id: string; nome: string; quantidade: string }[]>([]);
  const [savingRetorno, setSavingRetorno] = useState(false);

  // Retirada
  const [savingRetirada, setSavingRetirada] = useState(false);

  // New items
  const [newCabo, setNewCabo] = useState({ tipo_cabo: '', quantidade_metros: '' });
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [addMaterialId, setAddMaterialId] = useState('');
  const [addMaterialQtd, setAddMaterialQtd] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [{ data: projs }, { data: estoqueData }, { data: listaMats }, { data: matsAll }] = await Promise.all([
      supabase.from('projetos')
        .select('id, nome_completo, razao_social, telefone, endereco_completo, logradouro, bairro, cidade, data_instalacao, instalador, status, marca_placa, potencia_placa, qtd_placas, marca_inversor, potencia_inversor, qtd_inversores, sistema, congelado, criado_em')
        .neq('status', 'Instalado')
        .eq('congelado', false)
        .order('data_instalacao', { ascending: true, nullsFirst: false }),
      supabase.from('estoque')
        .select('material_id, quantidade_atual, quantidade_minima, materiais(nome, categoria, preco_unitario)')
        .order('quantidade_atual', { ascending: true }),
      supabase.from('lista_materiais_obra')
        .select('projeto_id, separado, material_id, quantidade_necessaria'),
      supabase.from('materiais').select('id, nome, categoria').eq('ativo', true).order('categoria').order('nome'),
    ]);

    setAllMaterials((matsAll || []) as AllMaterial[]);

    const estoqueMap: Record<string, number> = {};
    const estoqueList: EstoqueRow[] = (estoqueData || []).map((e: any) => {
      estoqueMap[e.material_id] = e.quantidade_atual || 0;
      return {
        material_id: e.material_id, nome: e.materiais?.nome || '—', categoria: e.materiais?.categoria || 'Outros',
        quantidade_atual: e.quantidade_atual, quantidade_minima: e.quantidade_minima, preco_unitario: e.materiais?.preco_unitario,
      };
    });
    setEstoque(estoqueList);

    const matsByProjeto: Record<string, { total: number; separados: number; faltantes: string[] }> = {};
    (listaMats || []).forEach((m: any) => {
      if (!matsByProjeto[m.projeto_id]) matsByProjeto[m.projeto_id] = { total: 0, separados: 0, faltantes: [] };
      matsByProjeto[m.projeto_id].total++;
      if (m.separado) matsByProjeto[m.projeto_id].separados++;
      if (!m.separado && (estoqueMap[m.material_id] || 0) < m.quantidade_necessaria) {
        const mat = estoqueList.find(e => e.material_id === m.material_id);
        matsByProjeto[m.projeto_id].faltantes.push(mat?.nome || 'Item desconhecido');
      }
    });

    setObras((projs || []).map((p: any) => {
      const info = matsByProjeto[p.id] || { total: 0, separados: 0, faltantes: [] };
      return {
        id: p.id, nome: p.nome_completo || p.razao_social || 'Sem nome', telefone: p.telefone,
        endereco: p.endereco_completo || [p.logradouro, p.bairro, p.cidade].filter(Boolean).join(', ') || undefined,
        data_instalacao: p.data_instalacao, instalador: p.instalador, status: p.status,
        marca_placa: p.marca_placa, potencia_placa: p.potencia_placa, qtd_placas: p.qtd_placas,
        marca_inversor: p.marca_inversor, potencia_inversor: p.potencia_inversor, qtd_inversores: p.qtd_inversores,
        sistema: p.sistema, criado_em: p.criado_em, separados: info.separados,
        total_materiais: info.total, materiais_faltantes: info.faltantes,
      };
    }));
    setLastUpdate(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { const i = setInterval(loadAll, 120000); return () => clearInterval(i); }, [loadAll]);

  // Load obra details
  useEffect(() => {
    if (!selectedObra) { setObraDetails(null); return; }
    (async () => {
      const [{ data: mats }, { data: cbs }, { data: estoqueSnap }] = await Promise.all([
        supabase.from('lista_materiais_obra').select('*, materiais(nome, categoria)').eq('projeto_id', selectedObra.id),
        supabase.from('cabos_obra').select('*').eq('projeto_id', selectedObra.id),
        supabase.from('estoque').select('material_id, quantidade_atual'),
      ]);
      const estoqueMap: Record<string, number> = {};
      (estoqueSnap || []).forEach((e: any) => { estoqueMap[e.material_id] = e.quantidade_atual || 0; });

      setObraDetails({
        materiais: (mats || []).map((m: any) => ({
          id: m.id, material_id: m.material_id,
          nome: m.materiais?.nome || '—', categoria: m.materiais?.categoria || 'Outros',
          quantidade_necessaria: m.quantidade_necessaria, quantidade_separada: m.quantidade_separada,
          separado: m.separado, estoque_atual: estoqueMap[m.material_id] || 0,
          qtd_retirar: m.quantidade_necessaria, // default to full qty
        })),
        cabos: (cbs || []).map((c: any) => ({
          id: c.id, tipo_cabo: c.tipo_cabo, quantidade_metros: c.quantidade_metros,
          metros_retirar: c.quantidade_metros, observacao: c.observacao,
        })),
      });
    })();
  }, [selectedObra]);

  // Alert for next 4 obras - compute from lista_materiais_obra data
  const next4 = obras.slice(0, 4);
  const faltantesNext4 = next4.flatMap(o => o.materiais_faltantes.map(nome => nome))
    .filter((v, i, a) => a.indexOf(v) === i);

  // Toggle separado
  const toggleSeparado = async (item: MatItem) => {
    const userId = session?.user?.id;
    if (!userId || !selectedObra) return;
    const newSep = !item.separado;
    await supabase.from('lista_materiais_obra').update({ separado: newSep, quantidade_separada: newSep ? item.qtd_retirar : 0 }).eq('id', item.id);
    if (newSep) {
      await supabase.from('movimentacoes_estoque').insert({ material_id: item.material_id, tipo: 'saida', quantidade: item.qtd_retirar, obra_id: selectedObra.id, observacao: `Separação: ${selectedObra.nome}`, usuario_id: userId });
      const { data: est } = await supabase.from('estoque').select('quantidade_atual').eq('material_id', item.material_id).maybeSingle();
      if (est) await supabase.from('estoque').update({ quantidade_atual: Math.max(0, (est as any).quantidade_atual - item.qtd_retirar), atualizado_em: new Date().toISOString() }).eq('material_id', item.material_id);
    } else {
      await supabase.from('movimentacoes_estoque').insert({ material_id: item.material_id, tipo: 'retorno', quantidade: item.quantidade_separada || item.quantidade_necessaria, obra_id: selectedObra.id, observacao: `Estorno: ${selectedObra.nome}`, usuario_id: userId });
      const { data: est } = await supabase.from('estoque').select('quantidade_atual').eq('material_id', item.material_id).maybeSingle();
      if (est) await supabase.from('estoque').update({ quantidade_atual: (est as any).quantidade_atual + (item.quantidade_separada || item.quantidade_necessaria), atualizado_em: new Date().toISOString() }).eq('material_id', item.material_id);
    }
    if (newSep) { try { const ctx = new AudioContext(); const osc = ctx.createOscillator(); osc.frequency.value = 800; osc.connect(ctx.destination); osc.start(); setTimeout(() => { osc.stop(); ctx.close(); }, 150); } catch {} }
    setSelectedObra({ ...selectedObra });
    loadAll();
  };

  // Confirm full retirada
  const confirmRetirada = async () => {
    if (!obraDetails || !selectedObra) return;
    const userId = session?.user?.id;
    if (!userId) return;
    const naoSep = obraDetails.materiais.filter(m => !m.separado);
    if (naoSep.length === 0) { toast.info('Todos os materiais já foram separados'); return; }
    const alertas = naoSep.filter(m => m.estoque_atual < m.qtd_retirar);
    if (alertas.length > 0) {
      const msg = alertas.map(a => `${a.nome}: estoque ${a.estoque_atual}, retirar ${a.qtd_retirar}`).join('\n');
      if (!window.confirm(`⚠️ Estoque insuficiente:\n\n${msg}\n\nDeseja continuar?`)) return;
    }
    setSavingRetirada(true);
    try {
      for (const item of naoSep) {
        await supabase.from('lista_materiais_obra').update({ separado: true, quantidade_separada: item.qtd_retirar }).eq('id', item.id);
        await supabase.from('movimentacoes_estoque').insert({ material_id: item.material_id, tipo: 'saida', quantidade: item.qtd_retirar, obra_id: selectedObra.id, observacao: `Retirada: ${selectedObra.nome}`, usuario_id: userId });
        const { data: est } = await supabase.from('estoque').select('quantidade_atual').eq('material_id', item.material_id).maybeSingle();
        if (est) await supabase.from('estoque').update({ quantidade_atual: Math.max(0, (est as any).quantidade_atual - item.qtd_retirar), atualizado_em: new Date().toISOString() }).eq('material_id', item.material_id);
      }
      // Update cables with actual metros_retirar
      for (const cabo of obraDetails.cabos) {
        if (cabo.metros_retirar !== cabo.quantidade_metros) {
          await supabase.from('cabos_obra').update({ quantidade_metros: cabo.metros_retirar }).eq('id', cabo.id);
        }
      }
      try { const ctx = new AudioContext(); const osc = ctx.createOscillator(); osc.frequency.value = 600; osc.connect(ctx.destination); osc.start(); setTimeout(() => { osc.stop(); ctx.close(); }, 300); } catch {}
      toast.success(`✅ ${naoSep.length} itens retirados para ${selectedObra.nome}!`);
      setSelectedObra({ ...selectedObra });
      loadAll();
    } catch (err: any) { toast.error('Erro: ' + err.message); }
    setSavingRetirada(false);
  };

  // Add extra material to obra list
  const addExtraMaterial = async () => {
    if (!addMaterialId || !selectedObra) return;
    const qtd = parseInt(addMaterialQtd) || 1;
    await supabase.from('lista_materiais_obra').insert({ projeto_id: selectedObra.id, material_id: addMaterialId, quantidade_necessaria: qtd, quantidade_separada: 0, separado: false });
    setAddMaterialId(''); setAddMaterialQtd(''); setShowAddMaterial(false);
    setSelectedObra({ ...selectedObra }); // trigger reload
    toast.success('Material adicionado!');
  };

  // Remove material from obra list (not from estoque)
  const removeMaterialFromList = async (itemId: string) => {
    await supabase.from('lista_materiais_obra').delete().eq('id', itemId);
    setSelectedObra({ ...selectedObra! });
  };

  // Add cabo
  const addCabo = async () => {
    if (!newCabo.tipo_cabo || !selectedObra) return;
    await supabase.from('cabos_obra').insert({ projeto_id: selectedObra.id, tipo_cabo: newCabo.tipo_cabo, quantidade_metros: parseFloat(newCabo.quantidade_metros) || 0 });
    setNewCabo({ tipo_cabo: '', quantidade_metros: '' });
    setSelectedObra({ ...selectedObra });
  };

  const removeCabo = async (caboId: string) => {
    await supabase.from('cabos_obra').delete().eq('id', caboId);
    setSelectedObra({ ...selectedObra! });
  };

  // Update editable qty
  const updateQtdRetirar = (itemId: string, val: number) => {
    if (!obraDetails) return;
    setObraDetails({
      ...obraDetails,
      materiais: obraDetails.materiais.map(m => m.id === itemId ? { ...m, qtd_retirar: val } : m),
    });
  };

  const updateMetrosRetirar = (caboId: string, val: number) => {
    if (!obraDetails) return;
    setObraDetails({
      ...obraDetails,
      cabos: obraDetails.cabos.map(c => c.id === caboId ? { ...c, metros_retirar: val } : c),
    });
  };

  // ─── Entrada em Lote ───
  const openEntrada = async () => {
    setActiveAction('entrada');
    const [{ data: mats }, { data: estoqueSnap }] = await Promise.all([
      supabase.from('materiais').select('id, nome, categoria').eq('ativo', true).order('categoria').order('nome'),
      supabase.from('estoque').select('material_id, quantidade_atual'),
    ]);
    const estoqueMap: Record<string, number> = {};
    (estoqueSnap || []).forEach((e: any) => { estoqueMap[e.material_id] = e.quantidade_atual || 0; });
    // Also fetch prices
    const { data: matsWithPrice } = await supabase.from('materiais').select('id, preco_unitario').eq('ativo', true);
    const priceMap: Record<string, number | null> = {};
    (matsWithPrice || []).forEach((m: any) => { priceMap[m.id] = m.preco_unitario; });
    setEntradaRows((mats || []).map((m: any) => ({ id: m.id, nome: m.nome, categoria: m.categoria, estoque_atual: estoqueMap[m.id] || 0, entrada: '', preco_unitario: priceMap[m.id] != null ? String(priceMap[m.id]) : '' })));
  };

  const confirmEntrada = async () => {
    const userId = session?.user?.id;
    if (!userId) { toast.error('Sessão expirada'); return; }
    const entradas = entradaRows.filter(r => r.entrada && parseInt(r.entrada) > 0);
    if (entradas.length === 0) { toast.error('Nenhuma quantidade informada'); return; }
    setSavingEntrada(true);
    try {
      // Update prices for all rows that have a price set (even without entrada)
      const priceUpdates = entradaRows.filter(r => r.preco_unitario !== '');
      for (const row of priceUpdates) {
        const price = parseFloat(row.preco_unitario);
        if (!isNaN(price) && price >= 0) {
          await supabase.from('materiais').update({ preco_unitario: price }).eq('id', row.id);
        }
      }
      for (const row of entradas) {
        const qtd = parseInt(row.entrada);
        await supabase.from('movimentacoes_estoque').insert({ material_id: row.id, tipo: 'entrada', quantidade: qtd, observacao: entradaNota || null, usuario_id: userId });
        const { data: est } = await supabase.from('estoque').select('quantidade_atual').eq('material_id', row.id).maybeSingle();
        if (est) await supabase.from('estoque').update({ quantidade_atual: (est as any).quantidade_atual + qtd, atualizado_em: new Date().toISOString() }).eq('material_id', row.id);
        else await supabase.from('estoque').insert({ material_id: row.id, quantidade_atual: qtd });
      }
      toast.success(`${entradas.length} entradas registradas!`);
      setActiveAction(null); setEntradaNota(''); loadAll();
    } catch (err: any) { toast.error('Erro: ' + err.message); }
    setSavingEntrada(false);
  };

  // ─── Retorno ───
  const openRetorno = async () => {
    setActiveAction('retorno');
    const { data: mats } = await supabase.from('materiais').select('id, nome').eq('ativo', true).order('nome');
    setRetornoItems((mats || []).map((m: any) => ({ material_id: m.id, nome: m.nome, quantidade: '' })));
  };

  const confirmRetorno = async () => {
    const userId = session?.user?.id;
    if (!userId) return;
    const retornos = retornoItems.filter(r => r.quantidade && parseInt(r.quantidade) > 0);
    if (retornos.length === 0) { toast.error('Nenhuma quantidade informada'); return; }
    setSavingRetorno(true);
    try {
      for (const r of retornos) {
        const qtd = parseInt(r.quantidade);
        await supabase.from('movimentacoes_estoque').insert({ material_id: r.material_id, tipo: 'retorno', quantidade: qtd, obra_id: retornoObra || null, observacao: 'Retorno de material', usuario_id: userId });
        const { data: est } = await supabase.from('estoque').select('quantidade_atual').eq('material_id', r.material_id).maybeSingle();
        if (est) await supabase.from('estoque').update({ quantidade_atual: (est as any).quantidade_atual + qtd, atualizado_em: new Date().toISOString() }).eq('material_id', r.material_id);
        else await supabase.from('estoque').insert({ material_id: r.material_id, quantidade_atual: qtd });
      }
      toast.success(`${retornos.length} itens devolvidos ao estoque!`);
      setActiveAction(null); setRetornoObra(''); loadAll();
    } catch (err: any) { toast.error('Erro: ' + err.message); }
    setSavingRetorno(false);
  };

  const criticalItems = estoque.filter(e => e.quantidade_atual === 0 && e.quantidade_minima && e.quantidade_minima > 0);

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-muted/30"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="h-screen flex flex-col bg-muted/30 overflow-hidden">
      {/* Critical banner */}
      {criticalItems.length > 0 && (
        <div className="bg-destructive text-destructive-foreground px-4 py-2 text-sm font-medium flex items-center gap-2 flex-shrink-0">
          <AlertTriangle className="w-4 h-4" />
          🚨 {criticalItems.length} itens com estoque ZERO: {criticalItems.slice(0, 3).map(c => c.nome).join(', ')}
          {criticalItems.length > 3 && ` e mais ${criticalItems.length - 3}...`}
        </div>
      )}

      {/* Header */}
      <header className="bg-background border-b border-border px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">Operação de Estoque</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Atualizado: {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button onClick={loadAll} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-muted hover:bg-muted/70 h-[48px]">
            <RefreshCw className="w-4 h-4" /> Atualizar
          </button>
          <button onClick={() => navigate('/clientes')} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground h-[48px]">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
        </div>
      </header>

      {/* 3-column layout */}
      <div className="flex flex-1 min-h-0 gap-0">

        {/* ─── LEFT: 280px ─── */}
        <div className="w-[280px] flex-shrink-0 border-r border-border p-4 flex flex-col gap-3 overflow-y-auto">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações Rápidas</h2>

          <button onClick={openEntrada}
            className="w-full flex items-center gap-3 px-4 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors h-[64px] text-left font-medium text-base">
            <Package className="w-6 h-6 flex-shrink-0" /> 📦 Entrada de Material
          </button>
          <button onClick={() => { setActiveAction(null); setSelectedObra(null); }}
            className="w-full flex items-center gap-3 px-4 rounded-xl bg-accent/50 text-accent-foreground hover:bg-accent transition-colors h-[64px] text-left font-medium text-base">
            <Send className="w-6 h-6 flex-shrink-0" /> 📤 Retirada para Obra
          </button>
          <button onClick={openRetorno}
            className="w-full flex items-center gap-3 px-4 rounded-xl bg-secondary/50 text-secondary-foreground hover:bg-secondary transition-colors h-[64px] text-left font-medium text-base">
            <RotateCcw className="w-6 h-6 flex-shrink-0" /> ↩️ Retorno de Material
          </button>
          <button onClick={() => setActiveAction('estoque')}
            className="w-full flex items-center gap-3 px-4 rounded-xl bg-muted text-foreground hover:bg-muted/70 transition-colors h-[64px] text-left font-medium text-base">
            <BarChart3 className="w-6 h-6 flex-shrink-0" /> 📊 Ver Estoque
          </button>
          <button onClick={() => setActiveAction('materiais')}
            className="w-full flex items-center gap-3 px-4 rounded-xl bg-muted text-foreground hover:bg-muted/70 transition-colors h-[64px] text-left font-medium text-base">
            <Settings className="w-6 h-6 flex-shrink-0" /> ⚙️ Materiais
          </button>

          {/* Alert card for next 4 obras */}
          <div className="mt-2">
            {faltantesNext4.length > 0 ? (
              <div className="rounded-xl p-3 bg-destructive/10 border border-destructive/20">
                <p className="text-sm font-semibold text-destructive mb-1">⚠️ Próximas 4 obras:</p>
                <ul className="text-xs text-destructive/80 space-y-0.5">
                  {faltantesNext4.slice(0, 8).map((nome, i) => <li key={i}>• {nome}</li>)}
                  {faltantesNext4.length > 8 && <li>+ {faltantesNext4.length - 8} mais...</li>}
                </ul>
              </div>
            ) : (
              <div className="rounded-xl p-3 bg-primary/10 border border-primary/20">
                <p className="text-sm font-semibold text-primary">✅ Estoque ok para as próximas 4 obras</p>
              </div>
            )}
          </div>
        </div>

        {/* ─── CENTER: flex ─── */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden border-r border-border">
          {activeAction === 'entrada' ? (
            <EntradaPanel rows={entradaRows} setRows={setEntradaRows} nota={entradaNota} setNota={setEntradaNota} saving={savingEntrada} onConfirm={confirmEntrada} onClose={() => setActiveAction(null)} />
          ) : activeAction === 'retorno' ? (
            <RetornoPanel items={retornoItems} setItems={setRetornoItems} obras={obras} obraId={retornoObra} setObraId={setRetornoObra} saving={savingRetorno} onConfirm={confirmRetorno} onClose={() => setActiveAction(null)} />
          ) : activeAction === 'estoque' ? (
            <EstoquePanel estoque={estoque} onClose={() => setActiveAction(null)} />
          ) : activeAction === 'materiais' ? (
            <div className="flex-1 overflow-y-auto p-4">
              <button onClick={() => setActiveAction(null)} className="text-xs text-primary hover:underline mb-3">← Voltar</button>
              <MateriaisModule />
            </div>
          ) : (
            <div className="flex flex-col overflow-hidden p-4">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Fila de Obras ({obras.length})
              </h2>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {obras.map(obra => (
                  <button key={obra.id} onClick={() => { setSelectedObra(obra); setActiveAction(null); }}
                    className={`w-full text-left p-4 rounded-xl border transition-colors h-auto min-h-[64px] ${
                      selectedObra?.id === obra.id ? 'bg-primary/10 border-primary' : 'bg-background border-border hover:border-primary/30'
                    }`}>
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-base truncate">{obra.nome}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
                          {obra.data_instalacao && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                              📅 {new Date(obra.data_instalacao + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </span>
                          )}
                          {obra.instalador && <span className="text-xs">🔧 {obra.instalador}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 ml-2 flex-shrink-0">
                        {obra.total_materiais > 0 && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            obra.separados === obra.total_materiais ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                          }`}>
                            {obra.separados}/{obra.total_materiais}
                          </span>
                        )}
                        {obra.materiais_faltantes.length > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">
                            ⚠ {obra.materiais_faltantes.length} falta
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
                {obras.length === 0 && <p className="text-center py-12 text-muted-foreground">Nenhuma obra pendente.</p>}
              </div>
            </div>
          )}
        </div>

        {/* ─── RIGHT: 420px ─── */}
        <div className="w-[420px] flex-shrink-0 flex flex-col overflow-hidden">
          {selectedObra && !activeAction ? (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Client info */}
                <div>
                  <h2 className="text-lg font-bold">{selectedObra.nome}</h2>
                  {selectedObra.telefone && (
                    <a href={`tel:${selectedObra.telefone}`} className="flex items-center gap-1.5 text-sm text-primary hover:underline mt-1">
                      <Phone className="w-4 h-4" /> {selectedObra.telefone}
                    </a>
                  )}
                  {selectedObra.endereco && (
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                      <MapPin className="w-4 h-4 flex-shrink-0" /> {selectedObra.endereco}
                    </p>
                  )}
                  {selectedObra.instalador && (
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                      <Wrench className="w-4 h-4" /> {selectedObra.instalador}
                    </p>
                  )}
                </div>

                {/* Equipment */}
                <div className="bg-muted/30 rounded-lg p-3 space-y-1 text-sm">
                  <p className="font-semibold text-xs text-muted-foreground uppercase">Equipamentos</p>
                  {selectedObra.qtd_placas && <p>☀️ {selectedObra.qtd_placas}× {selectedObra.marca_placa} {selectedObra.potencia_placa}W</p>}
                  {selectedObra.marca_inversor && <p>⚡ {selectedObra.qtd_inversores || 1}× {selectedObra.marca_inversor} {selectedObra.potencia_inversor}kW</p>}
                  {selectedObra.sistema && <p className="font-medium text-primary">KWp: {selectedObra.sistema}</p>}
                </div>

                {/* Material list */}
                {obraDetails ? (
                  <>
                    {obraDetails.materiais.length > 0 ? (
                      <div className="space-y-1">
                        <p className="font-semibold text-xs text-muted-foreground uppercase">
                          Materiais ({obraDetails.materiais.filter(m => m.separado).length}/{obraDetails.materiais.length})
                        </p>
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-muted">
                              <tr className="text-xs text-muted-foreground">
                                <th className="py-2 px-2 text-left w-8">✓</th>
                                <th className="py-2 px-2 text-left">Material</th>
                                <th className="py-2 px-2 text-center w-12">Nec.</th>
                                <th className="py-2 px-2 text-center w-12">Est.</th>
                                <th className="py-2 px-2 text-center w-16">Retirar</th>
                                <th className="py-2 px-2 w-8"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {obraDetails.materiais.map(item => {
                                const insuf = !item.separado && item.estoque_atual < item.qtd_retirar;
                                return (
                                  <tr key={item.id} className={`border-t border-border/30 ${item.separado ? 'bg-primary/5' : insuf ? 'bg-destructive/5' : ''}`}>
                                    <td className="py-2 px-2">
                                      <button onClick={() => toggleSeparado(item)}
                                        className={`w-7 h-7 rounded flex items-center justify-center border-2 transition-colors ${
                                          item.separado ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground'
                                        }`}>
                                        {item.separado && <Check className="w-4 h-4" />}
                                      </button>
                                    </td>
                                    <td className={`py-2 px-2 text-sm ${item.separado ? 'line-through text-muted-foreground' : ''}`}>
                                      <span className="mr-1">{CATEGORIA_ICONS[item.categoria] || '📦'}</span>
                                      {item.nome}
                                    </td>
                                    <td className="py-2 px-2 text-center font-medium">{item.quantidade_necessaria}</td>
                                    <td className={`py-2 px-2 text-center font-medium ${insuf ? 'text-destructive' : ''}`}>{item.estoque_atual}</td>
                                    <td className="py-2 px-2 text-center">
                                      {item.separado ? (
                                        <span className="text-xs text-primary">✅</span>
                                      ) : (
                                        <input type="number" min="0" className="w-14 rounded border border-input bg-background px-1 py-1 text-center text-sm"
                                          value={item.qtd_retirar} onChange={e => updateQtdRetirar(item.id, parseInt(e.target.value) || 0)} />
                                      )}
                                    </td>
                                    <td className="py-2 px-2">
                                      {!item.separado && (
                                        <button onClick={() => removeMaterialFromList(item.id)} className="text-muted-foreground hover:text-destructive">
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Add material */}
                        {showAddMaterial ? (
                          <div className="flex gap-1 items-end">
                            <select className="flex-1 rounded border border-input bg-background px-2 py-1.5 text-sm"
                              value={addMaterialId} onChange={e => setAddMaterialId(e.target.value)}>
                              <option value="">Selecionar material...</option>
                              {allMaterials.filter(m => !obraDetails.materiais.some(om => om.material_id === m.id))
                                .map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                            </select>
                            <input type="number" min="1" className="w-14 rounded border border-input bg-background px-2 py-1.5 text-sm text-center"
                              placeholder="Qtd" value={addMaterialQtd} onChange={e => setAddMaterialQtd(e.target.value)} />
                            <button onClick={addExtraMaterial} className="px-2 py-1.5 rounded bg-primary text-primary-foreground text-sm"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setShowAddMaterial(false)} className="px-2 py-1.5 rounded bg-muted text-sm"><X className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <button onClick={() => setShowAddMaterial(true)} className="text-sm text-primary hover:underline flex items-center gap-1">
                            <Plus className="w-3.5 h-3.5" /> Adicionar item
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhuma lista gerada.</p>
                    )}

                    {/* Cabos */}
                    <div className="space-y-2">
                      <p className="font-semibold text-xs text-muted-foreground uppercase">Cabos</p>
                      {obraDetails.cabos.map(c => (
                        <div key={c.id} className="flex items-center gap-2 text-sm px-3 py-2 bg-muted/30 rounded-lg">
                          <span className="font-medium flex-1">🔌 {c.tipo_cabo}</span>
                          <span className="text-xs text-muted-foreground">Padrão: {c.quantidade_metros}m</span>
                          <input type="number" min="0" className="w-16 rounded border border-input bg-background px-1 py-1 text-center text-sm"
                            value={c.metros_retirar} onChange={e => updateMetrosRetirar(c.id, parseFloat(e.target.value) || 0)} />
                          <span className="text-xs text-muted-foreground">m</span>
                          <button onClick={() => removeCabo(c.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                          placeholder="Tipo de cabo" value={newCabo.tipo_cabo} onChange={e => setNewCabo(f => ({ ...f, tipo_cabo: e.target.value }))} />
                        <input className="w-20 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                          type="number" placeholder="Metros" value={newCabo.quantidade_metros} onChange={e => setNewCabo(f => ({ ...f, quantidade_metros: e.target.value }))} />
                        <button onClick={addCabo} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground"><Plus className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                )}
              </div>

              {/* Fixed footer actions */}
              <div className="p-4 border-t border-border bg-background flex-shrink-0 space-y-2">
                {obraDetails && obraDetails.materiais.some(m => !m.separado) && (
                  <button onClick={confirmRetirada} disabled={savingRetirada}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-base h-[56px] disabled:opacity-50">
                    {savingRetirada ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                    ✅ Confirmar Retirada ({obraDetails.materiais.filter(m => !m.separado).length} itens)
                  </button>
                )}
                <button onClick={async () => {
                  // Fetch full project data for complete ficha
                  const { data: fullProjeto } = await supabase.from('projetos')
                    .select('*')
                    .eq('id', selectedObra.id)
                    .maybeSingle();
                  if (fullProjeto) {
                    generateFichaInstalacao(fullProjeto as any);
                  } else {
                    toast.error('Não foi possível carregar dados do projeto');
                  }
                }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-primary text-primary font-medium text-base h-[56px]">
                  <FileDown className="w-5 h-5" /> 📋 Ficha de Instalação
                </button>
              </div>
            </div>
          ) : !activeAction ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-base p-8">
              <p>← Selecione uma obra para ver os detalhes</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ─── Entrada Panel ─── */
function EntradaPanel({ rows, setRows, nota, setNota, saving, onConfirm, onClose }: {
  rows: { id: string; nome: string; categoria: string; estoque_atual: number; entrada: string; preco_unitario: string }[];
  setRows: React.Dispatch<React.SetStateAction<typeof rows>>;
  nota: string; setNota: (v: string) => void; saving: boolean; onConfirm: () => void; onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const qtdItens = rows.filter(r => r.entrada && parseInt(r.entrada) > 0).length;
  const filtered = rows.filter(r => !search || r.nome.toLowerCase().includes(search.toLowerCase()));
  const totalValor = rows.reduce((sum, r) => {
    const qtd = parseInt(r.entrada) || 0;
    const preco = parseFloat(r.preco_unitario) || 0;
    return sum + (qtd * preco);
  }, 0);
  return (
    <div className="flex flex-col overflow-hidden h-full p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-primary">📦 Entrada de Material</h2>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
      </div>
      <input className="rounded-lg border border-input bg-background px-3 py-2 text-base mb-2 h-[48px]" placeholder="Nota/Referência (ex: NF 1234)" value={nota} onChange={e => setNota(e.target.value)} />
      <input className="rounded-lg border border-input bg-background px-3 py-2 text-base mb-2 h-[48px]" placeholder="🔍 Filtrar material..." value={search} onChange={e => setSearch(e.target.value)} />
      <div className="flex-1 overflow-y-auto border rounded-lg">
        <table className="w-full text-base">
          <thead className="sticky top-0 bg-muted">
            <tr className="text-sm text-muted-foreground">
              <th className="py-3 px-3 text-left">Material</th>
              <th className="py-3 px-3 text-center w-20">Atual</th>
              <th className="py-3 px-3 text-center w-24">R$ Unit.</th>
              <th className="py-3 px-3 text-center w-24">+ Entrada</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(row => {
              const origIdx = rows.findIndex(r => r.id === row.id);
              return (
                <tr key={row.id} className="border-t border-border/30 hover:bg-muted/20">
                  <td className="py-2 px-3"><span className="mr-1">{CATEGORIA_ICONS[row.categoria] || '📦'}</span>{row.nome}</td>
                  <td className="py-2 px-3 text-center font-medium">{row.estoque_atual}</td>
                  <td className="py-2 px-3 text-center">
                    <MoneyInput className="w-24 rounded-lg border border-input bg-background px-2 py-2 text-center text-sm h-[44px]"
                      value={parseFloat(row.preco_unitario) || 0} placeholder="0,00"
                      onChange={v => { const n = [...rows]; n[origIdx] = { ...n[origIdx], preco_unitario: String(v) }; setRows(n); }} />
                  </td>
                  <td className="py-2 px-3 text-center">
                    <input className="w-20 rounded-lg border border-input bg-background px-2 py-2 text-center text-base h-[44px]"
                      type="number" min="0" inputMode="numeric" value={row.entrada} placeholder="0"
                      onChange={e => { const n = [...rows]; n[origIdx] = { ...n[origIdx], entrada: e.target.value }; setRows(n); }} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between pt-3">
        <div className="text-sm text-muted-foreground">
          {qtdItens} itens · <span className="font-bold text-foreground">R$ {formatBRL(totalValor)}</span>
        </div>
        <button onClick={onConfirm} disabled={saving || qtdItens === 0}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-base h-[48px] disabled:opacity-50">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null} Confirmar {qtdItens} entradas
        </button>
      </div>
    </div>
  );
}

/* ─── Retorno Panel ─── */
function RetornoPanel({ items, setItems, obras, obraId, setObraId, saving, onConfirm, onClose }: {
  items: { material_id: string; nome: string; quantidade: string }[];
  setItems: React.Dispatch<React.SetStateAction<typeof items>>;
  obras: ObraCard[]; obraId: string; setObraId: (v: string) => void; saving: boolean; onConfirm: () => void; onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const qtdItens = items.filter(r => r.quantidade && parseInt(r.quantidade) > 0).length;
  const filtered = items.filter(r => !search || r.nome.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="flex flex-col overflow-hidden h-full p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">↩️ Retorno de Material</h2>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
      </div>
      <select className="rounded-lg border border-input bg-background px-3 py-2 text-base mb-2 h-[48px]" value={obraId} onChange={e => setObraId(e.target.value)}>
        <option value="">Sem vínculo com obra</option>
        {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
      </select>
      <input className="rounded-lg border border-input bg-background px-3 py-2 text-base mb-2 h-[48px]" placeholder="🔍 Filtrar material..." value={search} onChange={e => setSearch(e.target.value)} />
      <div className="flex-1 overflow-y-auto border rounded-lg">
        <table className="w-full text-base">
          <thead className="sticky top-0 bg-muted">
            <tr className="text-sm text-muted-foreground">
              <th className="py-3 px-3 text-left">Material</th>
              <th className="py-3 px-3 text-center w-28">Qtd Retorno</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(row => {
              const origIdx = items.findIndex(r => r.material_id === row.material_id);
              return (
                <tr key={row.material_id} className="border-t border-border/30 hover:bg-muted/20">
                  <td className="py-2 px-3">{row.nome}</td>
                  <td className="py-2 px-3 text-center">
                    <input className="w-20 rounded-lg border border-input bg-background px-2 py-2 text-center text-base h-[44px]"
                      type="number" min="0" inputMode="numeric" value={row.quantidade} placeholder="0"
                      onChange={e => { const n = [...items]; n[origIdx] = { ...n[origIdx], quantidade: e.target.value }; setItems(n); }} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between pt-3">
        <span className="text-sm text-muted-foreground">{qtdItens} itens</span>
        <button onClick={onConfirm} disabled={saving || qtdItens === 0}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-base h-[48px] disabled:opacity-50">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null} Confirmar Retorno
        </button>
      </div>
    </div>
  );
}

/* ─── Estoque Panel ─── */
function EstoquePanel({ estoque, onClose }: { estoque: EstoqueRow[]; onClose: () => void }) {
  const [catFilter, setCatFilter] = useState('');
  const categorias = [...new Set(estoque.map(e => e.categoria))].sort();
  const filtered = estoque.filter(e => !catFilter || e.categoria === catFilter);
  const totalValor = filtered.reduce((sum, e) => sum + (e.quantidade_atual * (e.preco_unitario || 0)), 0);
  return (
    <div className="flex flex-col overflow-hidden h-full p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">📊 Estoque Atual</h2>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
      </div>
      <div className="flex items-center gap-3 mb-2">
        <select className="rounded-lg border border-input bg-background px-3 py-2 text-base h-[48px]" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">Todas categorias</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="ml-auto text-sm text-muted-foreground">
          Valor: <span className="font-bold text-foreground">R$ {totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto border rounded-lg">
        <table className="w-full text-base">
          <thead className="sticky top-0 bg-muted">
            <tr className="text-sm text-muted-foreground">
              <th className="py-3 px-3 text-left">Material</th>
              <th className="py-3 px-3 text-center w-24">Qtd</th>
              <th className="py-3 px-3 text-center w-24">Mín.</th>
              <th className="py-3 px-3 text-right w-28">Valor</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => {
              const lowStock = item.quantidade_minima != null && item.quantidade_atual <= item.quantidade_minima;
              const valor = item.quantidade_atual * (item.preco_unitario || 0);
              return (
                <tr key={item.material_id} className={`border-t border-border/30 ${lowStock ? 'bg-destructive/5' : ''}`}>
                  <td className="py-3 px-3"><span className="mr-1">{CATEGORIA_ICONS[item.categoria] || '📦'}</span>{item.nome}</td>
                  <td className={`py-3 px-3 text-center font-bold ${item.quantidade_atual === 0 ? 'text-destructive' : lowStock ? 'text-amber-600' : ''}`}>
                    {item.quantidade_atual}{lowStock && <span className="ml-1 text-xs">⚠</span>}
                  </td>
                  <td className="py-3 px-3 text-center text-muted-foreground">{item.quantidade_minima ?? '—'}</td>
                  <td className="py-3 px-3 text-right text-muted-foreground">{valor > 0 ? `R$ ${valor.toFixed(2)}` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
