import React, { useState, useEffect } from 'react';
import MoneyInput from '@/components/ui/money-input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Plus, X, Save } from 'lucide-react';
import { getPotenciaKey, generateMaterialList, hasExistingList } from './materiais/generateMaterialList';

const STATUS_LIST = ['Vendido', 'Equipamento Comprado', 'Entregue', 'Em Instalação', 'Instalado', 'Projeto Submetido', 'Homologado'];
const CONC_LIST = ['ELEKTRO', 'ENERGISA', 'COPEL', 'OUTRA'];
const PAGAMENTO_STATUS_LIST = ['Pago', 'Pendente', 'Parcial'];
const ESTRUTURA_LIST = ['Fibrocimento', 'Fibrometal', 'Cerâmico Madeira', 'Cerâmico Metal', 'Mini Trilho Elevado', 'Solo', 'Laje', 'Calhetão', 'Sem Estrutura'];

function maskCpf(v: string) {
  return v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2').slice(0, 14);
}
function maskCnpj(v: string) {
  return v.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2').slice(0, 18);
}
function maskCep(v: string) {
  return v.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9);
}
function maskTelefone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}

type PlacaOption = { id: string; marca: string; modelo: string; potencia_wp: number };
type InversorOption = { id: string; marca: string; modelo: string; potencia_kw: number; tipo: string };

export default function ProjetoForm({ projetoId, onSaved, onCancel }: {
  projetoId?: string;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const { session } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [placas, setPlacas] = useState<PlacaOption[]>([]);
  const [inversores, setInversores] = useState<InversorOption[]>([]);
  const [showNewPlaca, setShowNewPlaca] = useState(false);
  const [showNewInversor, setShowNewInversor] = useState(false);
  const [newPlaca, setNewPlaca] = useState({ marca: '', modelo: '', potencia_wp: '' });
  const [newInversor, setNewInversor] = useState({ marca: '', modelo: '', potencia_kw: '', tipo: 'String' });

  const [form, setForm] = useState({
    tipo_pessoa: 'PF',
    nome_completo: '', cpf: '', data_nascimento: '',
    razao_social: '', cnpj: '', nome_representante: '', cpf_representante: '',
    telefone: '',
    logradouro: '', complemento: '', cep: '', bairro: '', cidade: '', estado: '',
    concessionaria: 'ELEKTRO',
    placa_id: '', qtd_placas: '',
    inversor_id: '', qtd_inversores: '',
    geracao_estimada_kwh: '', sistema: '',
    nome_planta: '', wifi_nome: '', wifi_senha: '',
    estrutura: '',
    unidade_geradora_cep: '', unidade_geradora_endereco: '', unidade_geradora_codigo_uc: '', unidade_geradora_padrao: '',
    unidade_beneficiaria1_cep: '', unidade_beneficiaria1_endereco: '', unidade_beneficiaria1_codigo_uc: '', unidade_beneficiaria1_percentual: '',
    unidade_beneficiaria2_cep: '', unidade_beneficiaria2_endereco: '', unidade_beneficiaria2_codigo_uc: '', unidade_beneficiaria2_percentual: '',
    preco_venda: '', forma_pagamento: '',
    data_fechamento: '', objecoes: '',
    data_instalacao: '',
    distribuidor: '', instalador: '', pagamento_status: 'Pendente',
  });

  useEffect(() => {
    supabase.from('equipamentos_placas' as any).select('*').eq('ativo', true).then(({ data }) => setPlacas((data || []) as any));
    supabase.from('equipamentos_inversores' as any).select('*').eq('ativo', true).then(({ data }) => setInversores((data || []) as any));
  }, []);

  useEffect(() => {
    if (!projetoId) return;
    supabase.from('projetos' as any).select('*').eq('id', projetoId).maybeSingle().then(({ data }) => {
      if (!data) return;
      const p = data as any;
      setForm({
        tipo_pessoa: p.tipo_pessoa || 'PF',
        nome_completo: p.nome_completo || '', cpf: p.cpf || '', data_nascimento: p.data_nascimento || '',
        razao_social: p.razao_social || '', cnpj: p.cnpj || '', nome_representante: p.nome_representante || '', cpf_representante: p.cpf_representante || '',
        telefone: p.telefone || '',
        logradouro: p.logradouro || p.endereco_completo || '', complemento: p.complemento || '', cep: p.cep || '', bairro: p.bairro || '', cidade: p.cidade || '', estado: p.estado || '',
        concessionaria: p.concessionaria || 'ELEKTRO',
        placa_id: p.placa_id || '', qtd_placas: p.qtd_placas?.toString() || '',
        inversor_id: p.inversor_id || '', qtd_inversores: p.qtd_inversores?.toString() || '',
        geracao_estimada_kwh: p.geracao_estimada_kwh?.toString() || '', sistema: p.sistema || '',
        nome_planta: p.nome_planta || '', wifi_nome: p.wifi_nome || '', wifi_senha: p.wifi_senha || '',
        estrutura: (p as any).estrutura || '',
        unidade_geradora_cep: p.unidade_geradora_cep || '', unidade_geradora_endereco: p.unidade_geradora_endereco || '', unidade_geradora_codigo_uc: p.unidade_geradora_codigo_uc || '', unidade_geradora_padrao: p.unidade_geradora_padrao || '',
        unidade_beneficiaria1_cep: p.unidade_beneficiaria1_cep || '', unidade_beneficiaria1_endereco: p.unidade_beneficiaria1_endereco || '', unidade_beneficiaria1_codigo_uc: p.unidade_beneficiaria1_codigo_uc || '', unidade_beneficiaria1_percentual: p.unidade_beneficiaria1_percentual?.toString() || '',
        unidade_beneficiaria2_cep: p.unidade_beneficiaria2_cep || '', unidade_beneficiaria2_endereco: p.unidade_beneficiaria2_endereco || '', unidade_beneficiaria2_codigo_uc: p.unidade_beneficiaria2_codigo_uc || '', unidade_beneficiaria2_percentual: p.unidade_beneficiaria2_percentual?.toString() || '',
        preco_venda: p.preco_venda?.toString() || '', forma_pagamento: p.forma_pagamento || '',
        data_fechamento: p.data_fechamento || '',
        objecoes: p.objecoes || '',
        data_instalacao: p.data_instalacao || '',
        distribuidor: p.distribuidor || '', instalador: p.instalador || '', pagamento_status: p.pagamento_status || 'Pendente',
      });
    });
  }, [projetoId]);

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const fetchCep = async (cep: string, prefix: string) => {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (data.erro) return;
      if (prefix === 'main') {
        setForm(f => ({ ...f, logradouro: data.logradouro || '', bairro: data.bairro || '', cidade: data.localidade || '', estado: data.uf || '' }));
      } else {
        setForm(f => ({ ...f, [`${prefix}_endereco`]: `${data.logradouro || ''}, ${data.bairro || ''}, ${data.localidade || ''}-${data.uf || ''}` }));
      }
    } catch {}
  };

  const handleSave = async () => {
    if (!session?.user?.id) { toast.error('Sessão expirada'); return; }
    setSaving(true);
    const selectedPlaca = placas.find(p => p.id === form.placa_id);
    const selectedInversor = inversores.find(i => i.id === form.inversor_id);
    const qtdP = form.qtd_placas ? parseInt(form.qtd_placas) : 0;
    const potWp = selectedPlaca?.potencia_wp || 0;
    const kwpCalc = (qtdP * potWp) / 1000;
    const sistemaCalc = kwpCalc > 0 ? kwpCalc.toFixed(2).replace('.', ',') + 'KWp' : null;
    const row: any = {
      usuario_id: session.user.id,
      tipo_pessoa: form.tipo_pessoa,
      nome_completo: form.nome_completo || null,
      cpf: form.cpf || null,
      data_nascimento: form.data_nascimento || null,
      razao_social: form.razao_social || null,
      cnpj: form.cnpj || null,
      nome_representante: form.nome_representante || null,
      cpf_representante: form.cpf_representante || null,
      telefone: form.telefone || null,
      logradouro: form.logradouro || null,
      complemento: form.complemento || null,
      endereco_completo: [form.logradouro, form.bairro, form.cidade && form.estado ? `${form.cidade}/${form.estado}` : form.cidade || form.estado, form.cep ? `CEP: ${form.cep}` : ''].filter(Boolean).join(', ') || null,
      cep: form.cep || null,
      bairro: form.bairro || null,
      cidade: form.cidade || null,
      estado: form.estado || null,
      concessionaria: form.concessionaria,
      placa_id: form.placa_id || null,
      qtd_placas: qtdP || null,
      inversor_id: form.inversor_id || null,
      qtd_inversores: form.qtd_inversores ? parseInt(form.qtd_inversores) : null,
      marca_placa: selectedPlaca?.marca || null,
      potencia_placa: selectedPlaca ? String(selectedPlaca.potencia_wp) : null,
      marca_inversor: selectedInversor?.marca || null,
      potencia_inversor: selectedInversor ? String(selectedInversor.potencia_kw) : null,
      geracao_estimada_kwh: form.geracao_estimada_kwh ? parseFloat(form.geracao_estimada_kwh) : null,
      sistema: sistemaCalc,
      nome_planta: form.nome_planta || null,
      wifi_nome: form.wifi_nome || null,
      wifi_senha: form.wifi_senha || null,
      estrutura: form.estrutura || null,
      preco_venda: form.preco_venda ? parseFloat(form.preco_venda) : null,
      forma_pagamento: form.forma_pagamento || null,
      unidade_geradora_cep: form.unidade_geradora_cep || null,
      unidade_geradora_endereco: form.unidade_geradora_endereco || null,
      unidade_geradora_codigo_uc: form.unidade_geradora_codigo_uc || null,
      unidade_geradora_padrao: form.unidade_geradora_padrao || null,
      unidade_beneficiaria1_cep: form.unidade_beneficiaria1_cep || null,
      unidade_beneficiaria1_endereco: form.unidade_beneficiaria1_endereco || null,
      unidade_beneficiaria1_codigo_uc: form.unidade_beneficiaria1_codigo_uc || null,
      unidade_beneficiaria1_percentual: form.unidade_beneficiaria1_percentual ? parseFloat(form.unidade_beneficiaria1_percentual) : null,
      unidade_beneficiaria2_cep: form.unidade_beneficiaria2_cep || null,
      unidade_beneficiaria2_endereco: form.unidade_beneficiaria2_endereco || null,
      unidade_beneficiaria2_codigo_uc: form.unidade_beneficiaria2_codigo_uc || null,
      unidade_beneficiaria2_percentual: form.unidade_beneficiaria2_percentual ? parseFloat(form.unidade_beneficiaria2_percentual) : null,
      data_fechamento: form.data_fechamento || null,
      data_instalacao: form.data_instalacao || null,
      objecoes: form.objecoes || null,
      distribuidor: form.distribuidor || null,
      instalador: form.instalador || null,
      pagamento_status: form.pagamento_status || 'Pendente',
    };

    let error;
    let savedId = projetoId;
    if (projetoId) {
      const { usuario_id, ...updateRow } = row;
      ({ error } = await supabase.from('projetos' as any).update(updateRow).eq('id', projetoId));
    } else {
      const result = await supabase.from('projetos' as any).insert(row).select('id').single();
      error = result.error;
      if (result.data) savedId = (result.data as any).id;
    }
    setSaving(false);
    if (error) { toast.error('Erro ao salvar: ' + error.message); return; }
    toast.success(projetoId ? 'Projeto atualizado!' : 'Projeto criado!');
    
    // Auto-generate materials list
    if (savedId && selectedInversor) {
      const potKey = getPotenciaKey({
        potencia_inversor: String(selectedInversor.potencia_kw),
        inversor_tipo: selectedInversor.tipo,
        marca_inversor: selectedInversor.marca,
        qtd_inversores: form.qtd_inversores ? parseInt(form.qtd_inversores) : 1,
      });
      if (potKey) {
        const existing = await hasExistingList(savedId);
        if (!existing) {
          await generateMaterialList(savedId, potKey);
          toast.success(`Lista de materiais gerada (${potKey})!`);
        } else if (projetoId) {
          // Editing: check if inversor/potência changed - ask to regenerate
          const shouldRegenerate = window.confirm(
            'O inversor/potência foi alterado. Deseja regenerar a lista de materiais?'
          );
          if (shouldRegenerate) {
            await generateMaterialList(savedId, potKey);
            toast.success(`Lista de materiais regenerada (${potKey})!`);
          }
        }
      }
    }

    if (savedId) {
      supabase.functions.invoke('sync-to-sheets', {
        body: { project_id: savedId, sync_all: false },
      }).catch(() => {});
    }
    
    onSaved();
  };

  const handleNewPlaca = async () => {
    if (!newPlaca.marca || !newPlaca.modelo || !newPlaca.potencia_wp) { toast.error('Preencha todos os campos'); return; }
    const { data, error } = await supabase.from('equipamentos_placas' as any).insert({
      marca: newPlaca.marca, modelo: newPlaca.modelo, potencia_wp: parseFloat(newPlaca.potencia_wp),
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setPlacas(prev => [...prev, data as any]);
    set('placa_id', (data as any).id);
    setShowNewPlaca(false);
    setNewPlaca({ marca: '', modelo: '', potencia_wp: '' });
    toast.success('Placa cadastrada!');
  };

  const handleNewInversor = async () => {
    if (!newInversor.marca || !newInversor.modelo || !newInversor.potencia_kw) { toast.error('Preencha todos os campos'); return; }
    const { data, error } = await supabase.from('equipamentos_inversores' as any).insert({
      marca: newInversor.marca, modelo: newInversor.modelo, potencia_kw: parseFloat(newInversor.potencia_kw), tipo: newInversor.tipo,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setInversores(prev => [...prev, data as any]);
    set('inversor_id', (data as any).id);
    setShowNewInversor(false);
    setNewInversor({ marca: '', modelo: '', potencia_kw: '', tipo: 'String' });
    toast.success('Inversor cadastrado!');
  };

  const inputClass = "solar-input";
  const labelClass = "block text-sm font-medium mb-1";

  return (
    <div className="solar-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-primary">{projetoId ? 'Editar Projeto' : 'Novo Projeto'}</h2>
        {onCancel && <button onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground">← Voltar</button>}
      </div>

      <div className="flex gap-2">
        {['Dados do Cliente', 'Equipamentos', 'Unidades Consumidoras', 'Comercial'].map((label, i) => (
          <button key={i} onClick={() => setStep(i + 1)}
            className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
              step === i + 1 ? 'bg-primary text-primary-foreground' : i + 1 < step ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
            {i + 1}. {label}
          </button>
        ))}
      </div>

      {/* Step 1 - Cliente */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex gap-2 mb-4">
            <button onClick={() => set('tipo_pessoa', 'PF')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${form.tipo_pessoa === 'PF' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              Pessoa Física
            </button>
            <button onClick={() => set('tipo_pessoa', 'PJ')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${form.tipo_pessoa === 'PJ' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              Pessoa Jurídica
            </button>
          </div>

          {form.tipo_pessoa === 'PF' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelClass}>Nome Completo *</label><input className={inputClass} value={form.nome_completo} onChange={e => set('nome_completo', e.target.value)} /></div>
              <div><label className={labelClass}>CPF *</label><input className={inputClass} value={form.cpf} onChange={e => set('cpf', maskCpf(e.target.value))} placeholder="000.000.000-00" /></div>
              <div><label className={labelClass}>Data de Nascimento</label><input className={inputClass} type="date" value={form.data_nascimento} onChange={e => set('data_nascimento', e.target.value)} /></div>
              <div><label className={labelClass}>Telefone</label><input className={inputClass} value={form.telefone} onChange={e => set('telefone', maskTelefone(e.target.value))} placeholder="(67) 99999-9999" /></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelClass}>Razão Social *</label><input className={inputClass} value={form.razao_social} onChange={e => set('razao_social', e.target.value)} /></div>
              <div><label className={labelClass}>CNPJ *</label><input className={inputClass} value={form.cnpj} onChange={e => set('cnpj', maskCnpj(e.target.value))} placeholder="00.000.000/0000-00" /></div>
              <div><label className={labelClass}>Nome do Representante Legal</label><input className={inputClass} value={form.nome_representante} onChange={e => set('nome_representante', e.target.value)} /></div>
              <div><label className={labelClass}>CPF do Representante</label><input className={inputClass} value={form.cpf_representante} onChange={e => set('cpf_representante', maskCpf(e.target.value))} placeholder="000.000.000-00" /></div>
              <div><label className={labelClass}>Telefone</label><input className={inputClass} value={form.telefone} onChange={e => set('telefone', maskTelefone(e.target.value))} placeholder="(67) 99999-9999" /></div>
            </div>
          )}

          <hr className="border-border" />
          <h3 className="text-sm font-semibold">Endereço (conforme conta de luz)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className={labelClass}>CEP</label><input className={inputClass} value={form.cep} onChange={e => { set('cep', maskCep(e.target.value)); }} onBlur={() => fetchCep(form.cep, 'main')} placeholder="00000-000" /></div>
            <div className="md:col-span-2"><label className={labelClass}>Logradouro (Rua + Número)</label><input className={inputClass} value={form.logradouro} onChange={e => set('logradouro', e.target.value)} placeholder="Rua das Flores, 123" /></div>
            <div><label className={labelClass}>Bairro</label><input className={inputClass} value={form.bairro} onChange={e => set('bairro', e.target.value)} /></div>
            <div><label className={labelClass}>Complemento</label><input className={inputClass} value={form.complemento} onChange={e => set('complemento', e.target.value)} placeholder="Apto, Bloco (opcional)" /></div>
            <div><label className={labelClass}>Cidade</label><input className={inputClass} value={form.cidade} onChange={e => set('cidade', e.target.value)} /></div>
            <div><label className={labelClass}>Estado</label><input className={inputClass} value={form.estado} onChange={e => set('estado', e.target.value)} placeholder="UF" /></div>
          </div>

          <div><label className={labelClass}>Concessionária</label>
            <select className={inputClass} value={form.concessionaria} onChange={e => set('concessionaria', e.target.value)}>
              {CONC_LIST.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Step 2 - Equipamentos */}
      {step === 2 && (() => {
        const selectedPlaca = placas.find(p => p.id === form.placa_id);
        const qtdPlacas = parseInt(form.qtd_placas) || 0;
        const potenciaWp = selectedPlaca?.potencia_wp || 0;
        const kwp = (qtdPlacas * potenciaWp) / 1000;
        const HSP = 4.8;
        const geracaoAuto = Math.round(kwp * HSP * 30 * 0.75);
        return (
        <div className="space-y-4">

          <h3 className="text-sm font-semibold">Placas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2">
              <label className={labelClass}>Modelo da Placa</label>
              <div className="flex gap-2">
                <select className={`${inputClass} flex-1`} value={form.placa_id} onChange={e => set('placa_id', e.target.value)}>
                  <option value="">Selecione...</option>
                  {placas.map(p => <option key={p.id} value={p.id}>{p.marca} {p.modelo} — {p.potencia_wp}Wp</option>)}
                </select>
                <button onClick={() => setShowNewPlaca(true)} className="solar-btn-primary py-2 px-3 text-sm"><Plus className="w-4 h-4" /></button>
              </div>
            </div>
            <div><label className={labelClass}>Quantidade</label><input className={inputClass} type="number" value={form.qtd_placas} onChange={e => {
              set('qtd_placas', e.target.value);
              const newQtd = parseInt(e.target.value) || 0;
              const newKwp = (newQtd * potenciaWp) / 1000;
              const newGen = Math.round(newKwp * HSP * 30 * 0.75);
              if (!form.geracao_estimada_kwh || form.geracao_estimada_kwh === String(geracaoAuto)) {
                set('geracao_estimada_kwh', String(newGen));
              }
            }} /></div>
          </div>

          {showNewPlaca && (
            <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="flex justify-between items-center"><h4 className="text-sm font-semibold">Nova Placa</h4><button onClick={() => setShowNewPlaca(false)}><X className="w-4 h-4" /></button></div>
              <div className="grid grid-cols-3 gap-3">
                <input className={inputClass} placeholder="Marca" value={newPlaca.marca} onChange={e => setNewPlaca(p => ({ ...p, marca: e.target.value }))} />
                <input className={inputClass} placeholder="Modelo" value={newPlaca.modelo} onChange={e => setNewPlaca(p => ({ ...p, modelo: e.target.value }))} />
                <input className={inputClass} placeholder="Potência (Wp)" type="number" value={newPlaca.potencia_wp} onChange={e => setNewPlaca(p => ({ ...p, potencia_wp: e.target.value }))} />
              </div>
              <button className="solar-btn-primary text-sm py-2 px-4" onClick={handleNewPlaca}>Cadastrar e Selecionar</button>
            </div>
          )}

          <hr className="border-border" />
          <h3 className="text-sm font-semibold">Inversores</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2">
              <label className={labelClass}>Modelo do Inversor</label>
              <div className="flex gap-2">
                <select className={`${inputClass} flex-1`} value={form.inversor_id} onChange={e => set('inversor_id', e.target.value)}>
                  <option value="">Selecione...</option>
                  {inversores.map(i => <option key={i.id} value={i.id}>{i.marca} {i.modelo} — {i.potencia_kw}kW ({i.tipo})</option>)}
                </select>
                <button onClick={() => setShowNewInversor(true)} className="solar-btn-primary py-2 px-3 text-sm"><Plus className="w-4 h-4" /></button>
              </div>
            </div>
            <div><label className={labelClass}>Quantidade</label><input className={inputClass} type="number" value={form.qtd_inversores} onChange={e => set('qtd_inversores', e.target.value)} /></div>
          </div>

          {showNewInversor && (
            <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="flex justify-between items-center"><h4 className="text-sm font-semibold">Novo Inversor</h4><button onClick={() => setShowNewInversor(false)}><X className="w-4 h-4" /></button></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <input className={inputClass} placeholder="Marca" value={newInversor.marca} onChange={e => setNewInversor(p => ({ ...p, marca: e.target.value }))} />
                <input className={inputClass} placeholder="Modelo" value={newInversor.modelo} onChange={e => setNewInversor(p => ({ ...p, modelo: e.target.value }))} />
                <input className={inputClass} placeholder="Potência (kW)" type="number" value={newInversor.potencia_kw} onChange={e => setNewInversor(p => ({ ...p, potencia_kw: e.target.value }))} />
                <select className={inputClass} value={newInversor.tipo} onChange={e => setNewInversor(p => ({ ...p, tipo: e.target.value }))}>
                  <option value="String">String</option>
                  <option value="Micro">Micro</option>
                </select>
              </div>
              <button className="solar-btn-primary text-sm py-2 px-4" onClick={handleNewInversor}>Cadastrar e Selecionar</button>
            </div>
          )}

          <hr className="border-border" />
          <h3 className="text-sm font-semibold">Geração</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>KWp (calculado)</label>
              <input className={`${inputClass} bg-muted/50 font-semibold`} readOnly value={kwp > 0 ? kwp.toFixed(2).replace('.', ',') + ' kWp' : '—'} />
              {kwp > 0 && <p className="text-xs text-muted-foreground mt-1">{qtdPlacas} × {potenciaWp}Wp ÷ 1000</p>}
            </div>
            <div>
              <label className={labelClass}>Geração Estimada (kWh/mês)</label>
              <input className={inputClass} type="number" value={form.geracao_estimada_kwh} onChange={e => set('geracao_estimada_kwh', e.target.value)} />
              {kwp > 0 && <p className="text-xs text-muted-foreground mt-1">Sugestão: {geracaoAuto} kWh (HSP 4,8 × 30d × 0,75)</p>}
            </div>
          </div>

          <hr className="border-border" />
          <h3 className="text-sm font-semibold">Estrutura de Fixação</h3>
          <div>
            <label className={labelClass}>Tipo de Estrutura</label>
            <select className={inputClass} value={form.estrutura} onChange={e => set('estrutura', e.target.value)}>
              <option value="">Selecione...</option>
              {ESTRUTURA_LIST.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        </div>
        );
      })()}

      {/* Step 3 - Unidades Consumidoras */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold mb-3">Unidade Geradora</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelClass}>CEP</label><input className={inputClass} value={form.unidade_geradora_cep} onChange={e => set('unidade_geradora_cep', maskCep(e.target.value))} onBlur={() => fetchCep(form.unidade_geradora_cep, 'unidade_geradora')} /></div>
              <div><label className={labelClass}>Endereço</label><input className={inputClass} value={form.unidade_geradora_endereco} onChange={e => set('unidade_geradora_endereco', e.target.value)} /></div>
              <div><label className={labelClass}>Código UC</label><input className={inputClass} value={form.unidade_geradora_codigo_uc} onChange={e => set('unidade_geradora_codigo_uc', e.target.value)} /></div>
              <div><label className={labelClass}>Padrão de Entrada</label><input className={inputClass} value={form.unidade_geradora_padrao} onChange={e => set('unidade_geradora_padrao', e.target.value)} /></div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">Unidade Beneficiária 1 (opcional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelClass}>CEP</label><input className={inputClass} value={form.unidade_beneficiaria1_cep} onChange={e => set('unidade_beneficiaria1_cep', maskCep(e.target.value))} onBlur={() => fetchCep(form.unidade_beneficiaria1_cep, 'unidade_beneficiaria1')} /></div>
              <div><label className={labelClass}>Endereço</label><input className={inputClass} value={form.unidade_beneficiaria1_endereco} onChange={e => set('unidade_beneficiaria1_endereco', e.target.value)} /></div>
              <div><label className={labelClass}>Código UC</label><input className={inputClass} value={form.unidade_beneficiaria1_codigo_uc} onChange={e => set('unidade_beneficiaria1_codigo_uc', e.target.value)} /></div>
              <div><label className={labelClass}>Percentual (%)</label><input className={inputClass} type="number" value={form.unidade_beneficiaria1_percentual} onChange={e => set('unidade_beneficiaria1_percentual', e.target.value)} /></div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">Unidade Beneficiária 2 (opcional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelClass}>CEP</label><input className={inputClass} value={form.unidade_beneficiaria2_cep} onChange={e => set('unidade_beneficiaria2_cep', maskCep(e.target.value))} onBlur={() => fetchCep(form.unidade_beneficiaria2_cep, 'unidade_beneficiaria2')} /></div>
              <div><label className={labelClass}>Endereço</label><input className={inputClass} value={form.unidade_beneficiaria2_endereco} onChange={e => set('unidade_beneficiaria2_endereco', e.target.value)} /></div>
              <div><label className={labelClass}>Código UC</label><input className={inputClass} value={form.unidade_beneficiaria2_codigo_uc} onChange={e => set('unidade_beneficiaria2_codigo_uc', e.target.value)} /></div>
              <div><label className={labelClass}>Percentual (%)</label><input className={inputClass} type="number" value={form.unidade_beneficiaria2_percentual} onChange={e => set('unidade_beneficiaria2_percentual', e.target.value)} /></div>
            </div>
          </div>
        </div>
      )}

      {/* Step 4 - Comercial */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className={labelClass}>Preço de Venda (R$)</label><MoneyInput className={inputClass} value={form.preco_venda ? parseFloat(form.preco_venda) : 0} onChange={v => set('preco_venda', String(v))} /></div>
            <div><label className={labelClass}>Forma de Pagamento</label><input className={inputClass} value={form.forma_pagamento} onChange={e => set('forma_pagamento', e.target.value)} placeholder="Ex: À Vista, Financ Solfacil, 70% assinatura 30% término" /></div>
            <div><label className={labelClass}>Distribuidor</label><input className={inputClass} value={form.distribuidor} onChange={e => set('distribuidor', e.target.value)} placeholder="Ex: BELENUS, AVT, SOLFACIL" /></div>
            <div><label className={labelClass}>Instalador</label><input className={inputClass} value={form.instalador} onChange={e => set('instalador', e.target.value)} placeholder="Ex: GUSTAVO, MATHEUS" /></div>
            <div><label className={labelClass}>Pagamento Status</label>
              <select className={inputClass} value={form.pagamento_status} onChange={e => set('pagamento_status', e.target.value)}>
                {PAGAMENTO_STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><label className={labelClass}>Data de Fechamento</label><input className={inputClass} type="date" value={form.data_fechamento} onChange={e => set('data_fechamento', e.target.value)} /></div>
            <div><label className={labelClass}>Data de Instalação</label><input className={inputClass} type="date" value={form.data_instalacao} onChange={e => set('data_instalacao', e.target.value)} /></div>
          </div>
          <hr className="border-border" />
          <h3 className="text-sm font-semibold">Informações de Instalação</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><label className={labelClass}>Nome da Planta</label><input className={inputClass} value={form.nome_planta} onChange={e => set('nome_planta', e.target.value)} placeholder="Nome da planta de monitoramento" /></div>
            <div><label className={labelClass}>WiFi — Nome da Rede</label><input className={inputClass} value={form.wifi_nome} onChange={e => set('wifi_nome', e.target.value)} /></div>
            <div><label className={labelClass}>WiFi — Senha</label><input className={inputClass} value={form.wifi_senha} onChange={e => set('wifi_senha', e.target.value)} /></div>
          </div>
          <div>
            <label className={labelClass}>Observações</label>
            <textarea className={`${inputClass} min-h-[80px]`} value={form.objecoes} onChange={e => set('objecoes', e.target.value)} placeholder="Observações gerais sobre a obra..." />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <button onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}
          className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground disabled:opacity-40">
          <ChevronLeft className="w-4 h-4" /> Anterior
        </button>
        {step < 4 ? (
          <button onClick={() => setStep(s => s + 1)}
            className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground">
            Próximo <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? 'Salvando...' : projetoId ? 'Atualizar' : 'Criar Projeto'}
          </button>
        )}
      </div>
    </div>
  );
}
