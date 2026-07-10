import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, X, Star, Search } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import WhatsAppLink from './WhatsAppLink';
import type { ClienteBase } from './ClientesList';
import { sincronizarDiaLeitura } from '@/lib/posvendaTarefas';

export default function ClienteEditModal({ cliente, onClose, onSaved }: {
  cliente: ClienteBase;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isFromProjeto = cliente.id.startsWith('proj-');
  const [form, setForm] = useState({
    nome_completo: cliente.nome_completo || '',
    cpf: cliente.cpf || '',
    data_nascimento: (cliente as any).data_nascimento || '',
    telefone: cliente.telefone || '',
    telefone_2: (cliente as any).telefone_2 || '',
    telefone_3: (cliente as any).telefone_3 || '',
    email: (cliente as any).email || '',
    observacoes: (cliente as any).observacoes || '',
    // Endereço
    logradouro: (cliente as any).logradouro || '',
    numero: (cliente as any).numero || '',
    complemento: (cliente as any).complemento || '',
    bairro: (cliente as any).bairro || '',
    cidade: (cliente as any).cidade || '',
    estado: (cliente as any).estado || '',
    cep: (cliente as any).cep || '',
    endereco: cliente.endereco || '',
    // Equipamentos
    tipo_inversor: cliente.tipo_inversor || 'String',
    marca_inversor: cliente.marca_inversor || '',
    modelo_inversor: (cliente as any).modelo_inversor || '',
    potencia_inversor: cliente.potencia_inversor || '',
    qtd_inversores: cliente.qtd_inversores?.toString() || '',
    marca_placa: cliente.marca_placa || '',
    modelo_placa: (cliente as any).modelo_placa || '',
    potencia_placa: cliente.potencia_placa || '',
    qtd_placas: cliente.qtd_placas?.toString() || '',
    sistema: (cliente as any).sistema || '',
    dados_paineis: (cliente as any).dados_paineis || '',
    dados_inversor: (cliente as any).dados_inversor || '',
    // Instalação
    concessionaria: cliente.concessionaria || 'ELEKTRO',
    uc: cliente.uc || '',
    nome_planta: (cliente as any).nome_planta || '',
    instalado_em: cliente.instalado_em || '',
    dia_leitura: (cliente as any).dia_leitura?.toString() || '',
    vistoriado_em: cliente.vistoriado_em || '',
    projeto_enviado_em: (cliente as any).projeto_enviado_em || '',
    projeto_aprovado: (cliente as any).projeto_aprovado || '',
    fornecedor: (cliente as any).fornecedor || '',
    forma_pagamento: cliente.forma_pagamento || '',
    valor: cliente.valor?.toString() || '',
    wifi_nome: (cliente as any).wifi_nome || '',
    wifi_senha: (cliente as any).wifi_senha || '',
    cabo_usado: (cliente as any).cabo_usado || '',
    // Histórico
    satisfacao: (cliente as any).satisfacao || '',
  });
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const kwp = (() => {
    const qtd = parseInt(form.qtd_placas);
    const pot = parseFloat(form.potencia_placa);
    if (!isNaN(qtd) && !isNaN(pot) && qtd > 0 && pot > 0) return ((qtd * pot) / 1000).toFixed(2);
    return '—';
  })();

  const buscarCep = async () => {
    const cep = form.cep.replace(/\D/g, '');
    if (cep.length !== 8) { toast.error('CEP inválido'); return; }
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) { toast.error('CEP não encontrado'); return; }
      setForm(f => ({
        ...f,
        logradouro: data.logradouro || f.logradouro,
        bairro: data.bairro || f.bairro,
        cidade: data.localidade || f.cidade,
        estado: data.uf || f.estado,
        complemento: data.complemento || f.complemento,
      }));
      toast.success('Endereço preenchido!');
    } catch { toast.error('Erro ao buscar CEP'); }
    finally { setCepLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    const enderecoFull = [form.logradouro, form.numero, form.complemento, form.bairro, form.cidade, form.estado, form.cep].filter(Boolean).join(', ');

    if (isFromProjeto) {
      const realId = cliente.id.replace('proj-', '');
      const { error } = await supabase.from('projetos' as any).update({
        nome_completo: form.nome_completo || null,
        cpf: form.cpf || null,
        email: form.email || null,
        endereco_completo: enderecoFull || form.endereco || null,
        telefone: form.telefone || null,
        unidade_geradora_codigo_uc: form.uc || null,
        concessionaria: form.concessionaria,
        preco_venda: form.valor ? parseFloat(form.valor) : null,
        forma_pagamento: form.forma_pagamento || null,
        data_instalacao: form.instalado_em || null,
        dia_leitura: form.dia_leitura ? parseInt(form.dia_leitura) : null,
        objecoes: form.observacoes || null,
        marca_inversor: form.marca_inversor || null,
        potencia_inversor: form.potencia_inversor || null,
        qtd_inversores: form.qtd_inversores ? parseInt(form.qtd_inversores) : null,
        marca_placa: form.marca_placa || null,
        potencia_placa: form.potencia_placa || null,
        qtd_placas: form.qtd_placas ? parseInt(form.qtd_placas) : null,
        sistema: form.sistema || null,
        nome_planta: form.nome_planta || null,
        wifi_nome: form.wifi_nome || null,
        wifi_senha: form.wifi_senha || null,
        cabo_usado: form.cabo_usado || null,
        satisfacao: form.satisfacao || null,
        projeto_enviado_em: form.projeto_enviado_em || null,
        projeto_aprovado: form.projeto_aprovado || null,
        vistoriado_em: form.vistoriado_em || null,
        distribuidor: form.fornecedor || null,
        logradouro: form.logradouro || null,
        complemento: form.complemento || null,
        bairro: form.bairro || null,
        cidade: form.cidade || null,
        estado: form.estado || null,
        cep: form.cep || null,
        data_nascimento: form.data_nascimento || null,
      }).eq('id', realId);
      setSaving(false);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from('clientes_base' as any).update({
        nome_completo: form.nome_completo || null,
        cpf: form.cpf || null,
        data_nascimento: form.data_nascimento || null,
        telefone: form.telefone || null,
        telefone_2: form.telefone_2 || null,
        telefone_3: form.telefone_3 || null,
        email: form.email || null,
        observacoes: form.observacoes || null,
        endereco: enderecoFull || form.endereco || null,
        logradouro: form.logradouro || null,
        numero: form.numero || null,
        complemento: form.complemento || null,
        bairro: form.bairro || null,
        cidade: form.cidade || null,
        estado: form.estado || null,
        cep: form.cep || null,
        tipo_inversor: form.tipo_inversor || 'String',
        marca_inversor: form.marca_inversor || null,
        modelo_inversor: form.modelo_inversor || null,
        potencia_inversor: form.potencia_inversor || null,
        qtd_inversores: form.qtd_inversores ? parseInt(form.qtd_inversores) : null,
        marca_placa: form.marca_placa || null,
        modelo_placa: form.modelo_placa || null,
        potencia_placa: form.potencia_placa || null,
        qtd_placas: form.qtd_placas ? parseInt(form.qtd_placas) : null,
        kwp: kwp !== '—' ? parseFloat(kwp) : null,
        sistema: form.sistema || null,
        dados_paineis: form.dados_paineis || null,
        dados_inversor: form.dados_inversor || null,
        concessionaria: form.concessionaria,
        uc: form.uc || null,
        nome_planta: form.nome_planta || null,
        instalado_em: form.instalado_em || null,
        dia_leitura: form.dia_leitura ? parseInt(form.dia_leitura) : null,
        vistoriado_em: form.vistoriado_em || null,
        projeto_enviado_em: form.projeto_enviado_em || null,
        projeto_aprovado: form.projeto_aprovado || null,
        fornecedor: form.fornecedor || null,
        forma_pagamento: form.forma_pagamento || null,
        valor: form.valor ? parseFloat(form.valor) : null,
        wifi_nome: form.wifi_nome || null,
        wifi_senha: form.wifi_senha || null,
        cabo_usado: form.cabo_usado || null,
        satisfacao: form.satisfacao || null,
      }).eq('id', cliente.id);
      setSaving(false);
      if (error) { toast.error(error.message); return; }
    }
    // Recalcula lembretes de pós-venda que aguardavam o dia de leitura
    const diaLeituraNum = form.dia_leitura ? parseInt(form.dia_leitura) : null;
    if (diaLeituraNum != null && form.instalado_em) {
      try {
        const realId = isFromProjeto ? cliente.id.replace('proj-', '') : cliente.id;
        const n = await sincronizarDiaLeitura({
          projetoId: isFromProjeto ? realId : null,
          clienteBaseId: isFromProjeto ? null : realId,
          dataInstalacao: new Date(form.instalado_em + 'T00:00:00'),
          diaLeitura: diaLeituraNum,
        });
        if (n > 0) toast.success(`${n} lembrete(s) de pós-venda reagendado(s).`);
      } catch { /* silencioso */ }
    }
    toast.success('Cliente atualizado!');
    onSaved();
    onClose();
  };

  const ic = 'solar-input';
  const lb = 'block text-sm font-medium mb-1';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background rounded-xl shadow-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-primary">Editar Cliente</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <Tabs defaultValue="pessoais" className="w-full">
          <TabsList className="w-full justify-start gap-1 bg-muted p-1 flex-wrap">
            <TabsTrigger value="pessoais" className="text-xs">Dados Pessoais</TabsTrigger>
            <TabsTrigger value="endereco" className="text-xs">Endereço</TabsTrigger>
            <TabsTrigger value="equipamentos" className="text-xs">Equipamentos</TabsTrigger>
            <TabsTrigger value="instalacao" className="text-xs">Instalação</TabsTrigger>
            <TabsTrigger value="historico" className="text-xs">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="pessoais" className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={lb}>Nome completo</label><input className={ic} value={form.nome_completo} onChange={e => set('nome_completo', e.target.value)} /></div>
              <div><label className={lb}>CPF</label><input className={ic} value={form.cpf} onChange={e => set('cpf', e.target.value)} /></div>
              <div><label className={lb}>Data de Nascimento</label><input className={ic} type="date" value={form.data_nascimento} onChange={e => set('data_nascimento', e.target.value)} /></div>
              <div><label className={lb}>Email</label><input className={ic} type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
              <div>
                <label className={lb}>Telefone 1</label>
                <div className="flex items-center gap-2">
                  <input className={`${ic} flex-1`} value={form.telefone} onChange={e => set('telefone', e.target.value)} />
                  {form.telefone && <WhatsAppLink phone={form.telefone} />}
                </div>
              </div>
              <div><label className={lb}>Telefone 2 {isFromProjeto && <span className="text-[10px] text-muted-foreground">(salvo só na base)</span>}</label><input className={ic} value={form.telefone_2} onChange={e => set('telefone_2', e.target.value)} disabled={isFromProjeto} /></div>
              <div><label className={lb}>Telefone 3 {isFromProjeto && <span className="text-[10px] text-muted-foreground">(salvo só na base)</span>}</label><input className={ic} value={form.telefone_3} onChange={e => set('telefone_3', e.target.value)} disabled={isFromProjeto} /></div>
              <div className="md:col-span-2">
                <label className={lb}>Observações</label>
                <textarea className={`${ic} min-h-[80px]`} value={form.observacoes} onChange={e => set('observacoes', e.target.value)} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="endereco" className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={lb}>CEP</label>
                <div className="flex gap-2">
                  <input className={`${ic} flex-1`} value={form.cep} onChange={e => set('cep', e.target.value)} placeholder="00000-000" />
                  <button onClick={buscarCep} disabled={cepLoading} className="px-3 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-50">
                    <Search className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div><label className={lb}>Logradouro</label><input className={ic} value={form.logradouro} onChange={e => set('logradouro', e.target.value)} /></div>
              <div><label className={lb}>Número {isFromProjeto && <span className="text-[10px] text-muted-foreground">(salvo só na base)</span>}</label><input className={ic} value={form.numero} onChange={e => set('numero', e.target.value)} disabled={isFromProjeto} /></div>
              <div><label className={lb}>Complemento</label><input className={ic} value={form.complemento} onChange={e => set('complemento', e.target.value)} /></div>
              <div><label className={lb}>Bairro</label><input className={ic} value={form.bairro} onChange={e => set('bairro', e.target.value)} /></div>
              <div><label className={lb}>Cidade</label><input className={ic} value={form.cidade} onChange={e => set('cidade', e.target.value)} /></div>
              <div><label className={lb}>Estado (UF)</label><input className={ic} value={form.estado} onChange={e => set('estado', e.target.value)} maxLength={2} /></div>
              <div className="md:col-span-2">
                <label className={lb}>Endereço completo (legado)</label>
                <input className={ic} value={form.endereco} onChange={e => set('endereco', e.target.value)} />
                <p className="text-[11px] text-muted-foreground mt-1">Campo antigo — preenchido automaticamente pelos campos acima ao salvar.</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="equipamentos" className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={lb}>Tipo de Inversor {isFromProjeto && <span className="text-[10px] text-muted-foreground">(salvo só na base)</span>}</label>
                <select className={ic} value={form.tipo_inversor} onChange={e => set('tipo_inversor', e.target.value)} disabled={isFromProjeto}>
                  <option value="String">String</option>
                  <option value="Micro">Micro</option>
                </select>
              </div>
              <div><label className={lb}>Marca do Inversor</label><input className={ic} value={form.marca_inversor} onChange={e => set('marca_inversor', e.target.value)} /></div>
              <div><label className={lb}>Modelo do Inversor {isFromProjeto && <span className="text-[10px] text-muted-foreground">(salvo só na base)</span>}</label><input className={ic} value={form.modelo_inversor} onChange={e => set('modelo_inversor', e.target.value)} disabled={isFromProjeto} /></div>
              <div><label className={lb}>Potência Inversor (kW)</label><input className={ic} value={form.potencia_inversor} onChange={e => set('potencia_inversor', e.target.value)} /></div>
              <div><label className={lb}>Qtd Inversores</label><input className={ic} type="number" min="1" value={form.qtd_inversores} onChange={e => set('qtd_inversores', e.target.value)} /></div>
              <div className="border-t pt-4 md:col-span-2"><h3 className="text-sm font-semibold text-primary">Placas</h3></div>
              <div><label className={lb}>Marca da Placa</label><input className={ic} value={form.marca_placa} onChange={e => set('marca_placa', e.target.value)} /></div>
              <div><label className={lb}>Modelo da Placa {isFromProjeto && <span className="text-[10px] text-muted-foreground">(salvo só na base)</span>}</label><input className={ic} value={form.modelo_placa} onChange={e => set('modelo_placa', e.target.value)} disabled={isFromProjeto} /></div>
              <div><label className={lb}>Potência da Placa (W)</label><input className={ic} value={form.potencia_placa} onChange={e => set('potencia_placa', e.target.value)} /></div>
              <div><label className={lb}>Qtd Placas</label><input className={ic} type="number" min="1" value={form.qtd_placas} onChange={e => set('qtd_placas', e.target.value)} /></div>
              <div>
                <label className={lb}>KWp (calculado)</label>
                <div className="solar-input bg-muted/50 cursor-not-allowed">{kwp}</div>
              </div>
              <div><label className={lb}>Sistema</label><input className={ic} value={form.sistema} onChange={e => set('sistema', e.target.value)} placeholder="Ex: 5,75KWp" /></div>
              <div className="md:col-span-2"><label className={lb}>Dados Painéis (original) {isFromProjeto && <span className="text-[10px] text-muted-foreground">(salvo só na base)</span>}</label><textarea className={`${ic} min-h-[60px]`} value={form.dados_paineis} onChange={e => set('dados_paineis', e.target.value)} disabled={isFromProjeto} /></div>
              <div className="md:col-span-2"><label className={lb}>Dados Inversor (original) {isFromProjeto && <span className="text-[10px] text-muted-foreground">(salvo só na base)</span>}</label><textarea className={`${ic} min-h-[60px]`} value={form.dados_inversor} onChange={e => set('dados_inversor', e.target.value)} disabled={isFromProjeto} /></div>
            </div>
          </TabsContent>

          <TabsContent value="instalacao" className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={lb}>Concessionária</label>
                <select className={ic} value={form.concessionaria} onChange={e => set('concessionaria', e.target.value)}>
                  {['ELEKTRO', 'ENERGISA', 'COPEL', 'OUTRA'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div><label className={lb}>UC (Unidade Consumidora)</label><input className={ic} value={form.uc} onChange={e => set('uc', e.target.value)} /></div>
              <div><label className={lb}>Nome da Planta</label><input className={ic} value={form.nome_planta} onChange={e => set('nome_planta', e.target.value)} /></div>
              <div><label className={lb}>Instalado em</label><input className={ic} type="date" value={form.instalado_em} onChange={e => set('instalado_em', e.target.value)} /></div>
              <div><label className={lb}>📅 Dia de leitura aproximado da conta (1 a 31)</label><input className={ic} type="number" min={1} max={31} value={form.dia_leitura} onChange={e => set('dia_leitura', e.target.value)} placeholder="Ex.: 15" /></div>
              <div><label className={lb}>Vistoriado em</label><input className={ic} type="date" value={form.vistoriado_em} onChange={e => set('vistoriado_em', e.target.value)} /></div>
              <div><label className={lb}>Projeto enviado em</label><input className={ic} type="date" value={form.projeto_enviado_em} onChange={e => set('projeto_enviado_em', e.target.value)} /></div>
              <div><label className={lb}>Projeto aprovado em</label><input className={ic} type="date" value={form.projeto_aprovado} onChange={e => set('projeto_aprovado', e.target.value)} /></div>
              <div><label className={lb}>Fornecedor</label><input className={ic} value={form.fornecedor} onChange={e => set('fornecedor', e.target.value)} /></div>
              <div><label className={lb}>Forma de Pagamento</label><input className={ic} value={form.forma_pagamento} onChange={e => set('forma_pagamento', e.target.value)} /></div>
              <div><label className={lb}>Valor (R$)</label><input className={ic} type="number" step="0.01" value={form.valor} onChange={e => set('valor', e.target.value)} /></div>
              <div><label className={lb}>WiFi — Nome da rede</label><input className={ic} value={form.wifi_nome} onChange={e => set('wifi_nome', e.target.value)} /></div>
              <div><label className={lb}>WiFi — Senha</label><input className={ic} value={form.wifi_senha} onChange={e => set('wifi_senha', e.target.value)} /></div>
              <div className="md:col-span-2"><label className={lb}>Cabo utilizado</label><input className={ic} value={form.cabo_usado} onChange={e => set('cabo_usado', e.target.value)} /></div>
            </div>
          </TabsContent>

          <TabsContent value="historico" className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={lb}>Satisfação</label>
                <div className="flex gap-1 items-center">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} type="button" onClick={() => set('satisfacao', n.toString())}
                      className="p-1 hover:scale-110 transition-transform">
                      <Star className={`w-6 h-6 ${parseInt(form.satisfacao) >= n ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                    </button>
                  ))}
                  {form.satisfacao && <button onClick={() => set('satisfacao', '')} className="text-xs text-muted-foreground ml-2 hover:text-foreground">Limpar</button>}
                </div>
              </div>
              <div>
                <label className={lb}>Origem</label>
                <div className="solar-input bg-muted/50 cursor-not-allowed text-sm">
                  {cliente.origem === 'importacao' ? 'Importação' : cliente.origem === 'promovido_de_obra' ? 'Via Obra' : cliente.origem}
                </div>
              </div>
              <div>
                <label className={lb}>Data de cadastro</label>
                <div className="solar-input bg-muted/50 cursor-not-allowed text-sm">
                  {new Date(cliente.criado_em).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
