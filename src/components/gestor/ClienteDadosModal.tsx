import React, { useEffect, useState } from 'react';
import { X, Copy, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import WhatsAppLink, { formatWhatsAppUrl } from './WhatsAppLink';
import type { ClienteBase } from './ClientesList';

function fmt(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === '') return '';
  return String(val);
}

import { fmtDateBR as fmtDate } from '@/lib/dateUtils';

function fmtMoney(val: number | null | undefined): string {
  if (val === null || val === undefined) return '';
  return `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function calcKwp(c: ClienteBase): string {
  if (c.kwp) return Number(c.kwp).toFixed(2);
  if (c.qtd_placas && c.potencia_placa) {
    const pot = parseFloat(c.potencia_placa);
    if (!isNaN(pot)) return ((c.qtd_placas * pot) / 1000).toFixed(2);
  }
  return '';
}

function sistemaStr(c: ClienteBase): string {
  const parts: string[] = [];
  if (c.qtd_placas && c.marca_placa && c.potencia_placa) {
    parts.push(`${c.qtd_placas}x ${c.marca_placa} ${c.potencia_placa}W`);
  }
  if (c.marca_inversor && c.potencia_inversor) {
    const qty = c.qtd_inversores || 1;
    parts.push(`${qty}x ${c.marca_inversor} ${c.potencia_inversor}kW`);
  }
  const kwp = calcKwp(c);
  if (kwp) parts.push(`${kwp}KWp`);
  return parts.join(' | ');
}

interface FieldDef {
  label: string;
  value: string;
  isPhone?: boolean;
  href?: string;
}

function estrelas(n: number): string {
  const v = Math.max(0, Math.min(5, Math.round(n)));
  return '★'.repeat(v) + '☆'.repeat(5 - v);
}

function CopyButton({ text }: { text: string }) {
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); toast.success('Copiado!', { duration: 2000 }); }}
      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      title="Copiar"
    >
      <Copy className="w-3.5 h-3.5" />
    </button>
  );
}

function FieldRow({ label, value, isPhone, href }: FieldDef) {
  if (!value) {
    return (
      <div className="flex items-center justify-between py-1.5 px-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm text-muted-foreground">—</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between py-1.5 px-2 hover:bg-muted/30 rounded">
      <div className="min-w-0 flex-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="text-sm font-medium flex items-center gap-2">
          {isPhone ? (
            <WhatsAppLink phone={value} />
          ) : href ? (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{value}</a>
          ) : (
            <span>{value}</span>
          )}
        </div>
      </div>
      <CopyButton text={value} />
    </div>
  );
}

function Block({ title, fields }: { title: string; fields: FieldDef[] }) {
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold text-primary border-b border-border pb-1 mb-1">{title}</h3>
      {fields.map(f => <FieldRow key={f.label} {...f} />)}
    </div>
  );
}

export default function ClienteDadosModal({ cliente, onClose }: { cliente: ClienteBase; onClose: () => void }) {
  const c = cliente as any;

  // Load UCs from new table
  const [ucsData, setUcsData] = useState<any[]>([]);
  const [avaliacao, setAvaliacao] = useState<{ nota: number; comentario: string | null; criado_em: string } | null>(null);
  useEffect(() => {
    const projetoId = c.projeto_id || (c.id?.startsWith?.('proj-') ? c.id.replace('proj-', '') : null) || c.id;
    if (!projetoId) return;
    supabase.from('unidades_consumidoras' as any).select('*').eq('projeto_id', projetoId).order('prioridade', { ascending: true }).then(({ data }) => {
      if (data && data.length > 0) setUcsData(data as any[]);
    });
    supabase.from('avaliacoes_clientes' as any).select('nota, comentario, criado_em').eq('projeto_id', projetoId).order('criado_em', { ascending: false }).limit(1).maybeSingle().then(({ data }) => {
      if (data) setAvaliacao(data as any);
    });
  }, [c]);

  // Build full address from parts if endereco is empty
  const enderecoCompleto = (() => {
    if (c.endereco) return c.endereco;
    const parts = [c.logradouro, c.numero, c.complemento, c.bairro, c.cidade, c.estado].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '';
  })();

  const isPJ = (c.tipo_pessoa === 'PJ') || (!!c.razao_social && !c.nome_completo) || !!c.cnpj;

  const blocks: { title: string; fields: FieldDef[] }[] = [
    {
      title: 'Identificação',
      fields: [
        { label: 'Nome completo', value: fmt(c.nome_completo) },
        { label: 'CPF', value: fmt(c.cpf) },
        { label: 'Data de nascimento', value: fmtDate(c.data_nascimento) },
        ...(isPJ ? [
          { label: 'Razão Social', value: fmt(c.razao_social) },
          { label: 'CNPJ', value: fmt(c.cnpj) },
          { label: 'Representante', value: fmt(c.nome_representante) },
          { label: 'CPF do representante', value: fmt(c.cpf_representante) },
        ] : []),
      ],
    },
    {
      title: 'Contato',
      fields: [
        { label: 'Telefone 1', value: fmt(c.telefone), isPhone: true },
        { label: 'Telefone 2', value: fmt(c.telefone_2), isPhone: true },
        { label: 'Telefone 3', value: fmt(c.telefone_3), isPhone: true },
        { label: 'Email', value: fmt((c as any).email) },
      ],
    },
    {
      title: 'Endereço',
      fields: [
        { label: 'Endereço completo', value: fmt(c.endereco) },
        { label: 'Logradouro', value: fmt((c as any).logradouro) },
        { label: 'Número', value: fmt((c as any).numero) },
        { label: 'Complemento', value: fmt((c as any).complemento) },
        { label: 'Bairro', value: fmt((c as any).bairro) },
        { label: 'Cidade', value: fmt((c as any).cidade) },
        { label: 'Estado', value: fmt((c as any).estado) },
        { label: 'CEP', value: fmt((c as any).cep) },
      ],
    },
    {
      title: 'Dados da Instalação',
      fields: [
        { label: 'Concessionária', value: fmt(c.concessionaria) },
        { label: 'UC (Unidade Consumidora)', value: fmt(c.uc) },
        { label: 'Nome da Planta', value: fmt(c.nome_planta) },
        { label: '📅 Dia de leitura da conta', value: fmt((c as any).dia_leitura) },
        { label: 'WiFi — Rede', value: fmt((c as any).wifi_nome) },
        { label: 'WiFi — Senha', value: fmt((c as any).wifi_senha) },
        { label: 'Estrutura', value: fmt((c as any).estrutura) },
        { label: 'Data de instalação', value: fmtDate(c.instalado_em) },
        { label: 'Instalador responsável', value: fmt(c.instalador) },
        { label: 'Data de vistoria', value: fmtDate(c.vistoriado_em) },
      ],
    },
    {
      title: 'Equipamentos',
      fields: [
        { label: 'Placas', value: c.qtd_placas && c.marca_placa && c.potencia_placa ? `${c.qtd_placas}x ${c.marca_placa} ${c.potencia_placa}W` : '' },
        { label: 'Inversor', value: c.marca_inversor && c.potencia_inversor ? `${c.qtd_inversores || 1}x ${c.marca_inversor} ${c.potencia_inversor}kW` : '' },
        { label: 'KWp total', value: calcKwp(c) ? `${calcKwp(c)} kWp` : '' },
        { label: 'Geração estimada (kWh)', value: fmt((c as any).geracao_estimada_kwh) },
        { label: 'Sistema', value: fmt(c.sistema) },
      ],
    },
    {
      title: 'Financeiro',
      fields: [
        { label: 'Valor do sistema', value: fmtMoney(c.valor) },
        { label: 'Forma de pagamento', value: fmt(c.forma_pagamento) },
        { label: 'Distribuidor', value: fmt((c as any).distribuidor) },
        { label: 'Status de pagamento', value: fmt((c as any).pagamento_status) },
        { label: 'Data de fechamento', value: fmtDate((c as any).data_fechamento) },
      ],
    },
  ];

  const buildCopyAll = () => {
    const lines: string[] = [];
    const add = (label: string, value: string) => { if (value) lines.push(`${label}: ${value}`); };
    add('NOME', fmt(c.nome_completo));
    add('CPF', fmt(c.cpf));
    add('DATA NASCIMENTO', fmtDate(c.data_nascimento));
    if (isPJ) {
      add('RAZÃO SOCIAL', fmt(c.razao_social));
      add('CNPJ', fmt(c.cnpj));
      add('REPRESENTANTE', fmt(c.nome_representante));
      add('CPF REPRESENTANTE', fmt(c.cpf_representante));
    }
    add('TELEFONE', fmt(c.telefone));
    if (c.telefone_2) add('TELEFONE 2', c.telefone_2);
    if (c.telefone_3) add('TELEFONE 3', c.telefone_3);
    if (c.email) add('EMAIL', c.email);
    add('ENDEREÇO', enderecoCompleto);
    add('LOGRADOURO', fmt(c.logradouro));
    add('BAIRRO', fmt(c.bairro));
    add('CIDADE', fmt(c.cidade));
    add('ESTADO', fmt(c.estado));
    add('CEP', fmt(c.cep));
    add('UC', fmt(c.uc));
    add('CONCESSIONÁRIA', fmt(c.concessionaria));
    add('NOME PLANTA', fmt(c.nome_planta));
    add('DIA DE LEITURA', fmt(c.dia_leitura));
    add('WIFI REDE', fmt(c.wifi_nome));
    add('WIFI SENHA', fmt(c.wifi_senha));
    add('ESTRUTURA', fmt(c.estrutura));
    const sys = sistemaStr(c);
    if (sys) add('SISTEMA', sys);
    add('GERAÇÃO ESTIMADA (kWh)', fmt(c.geracao_estimada_kwh));
    add('DATA INSTALAÇÃO', fmtDate(c.instalado_em));
    add('INSTALADOR', fmt(c.instalador));
    add('DATA VISTORIA', fmtDate(c.vistoriado_em));
    add('VALOR', fmtMoney(c.valor));
    add('FORMA PAGAMENTO', fmt(c.forma_pagamento));
    add('DISTRIBUIDOR', fmt(c.distribuidor));
    add('STATUS PAGAMENTO', fmt(c.pagamento_status));
    add('DATA FECHAMENTO', fmtDate(c.data_fechamento));
    return lines.join('\n');
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div
        className="bg-background rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between z-10">
          <h2 className="text-base sm:text-lg font-bold text-primary truncate">
            Dados de {c.nome_completo || 'Cliente'}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { navigator.clipboard.writeText(buildCopyAll()); toast.success('Todos os dados copiados!', { duration: 2000 }); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <ClipboardList className="w-3.5 h-3.5" /> Copiar tudo
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-5">
          {blocks.map(b => <Block key={b.title} title={b.title} fields={b.fields} />)}

          {/* Unidades Consumidoras */}
          {ucsData.length > 0 && (() => {
            const modo = ucsData[0]?.modo_distribuicao || 'percentual';
            const geradora = ucsData.find((u: any) => u.tipo === 'geradora');
            const beneficiarias = ucsData.filter((u: any) => u.tipo === 'beneficiaria');
            const totalPercent = beneficiarias.reduce((s: number, u: any) => s + (u.percentual || 0), 0);
            return (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-primary border-b border-border pb-1 mb-1">Unidades Consumidoras</h3>
                <div className="text-xs text-muted-foreground mb-2">
                  Modo: <span className="font-medium text-foreground">{modo === 'percentual' ? 'Por Percentual' : 'Por Prioridade'}</span>
                </div>
                <div className="space-y-2">
                  {geradora && (
                    <div className="bg-muted/30 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">🏠 UC Geradora — {geradora.codigo_uc || '—'}</span>
                        {modo === 'prioridade' && <span className="text-xs text-muted-foreground">1ª prioridade</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {geradora.endereco || '—'}
                        {geradora.padrao_entrada && ` — ${geradora.padrao_entrada}`}
                      </p>
                    </div>
                  )}
                  {beneficiarias.map((uc: any, i: number) => (
                    <div key={uc.id} className="bg-muted/30 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">🏢 UC Beneficiária {i + 1} — {uc.codigo_uc || '—'}</span>
                        {modo === 'percentual' && <span className="text-sm font-semibold">{uc.percentual || 0}%</span>}
                        {modo === 'prioridade' && <span className="text-xs text-muted-foreground">{uc.prioridade}ª prioridade</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{uc.endereco || '—'}</p>
                    </div>
                  ))}
                </div>
                {modo === 'percentual' && beneficiarias.length > 0 && (
                  <div className={`text-xs font-medium mt-1 ${Math.abs(totalPercent - 100) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                    Total distribuído: {totalPercent}% {Math.abs(totalPercent - 100) < 0.01 ? '✅' : '⚠️'}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Pessoas Relacionadas */}
          {Array.isArray(c.outros_nomes) && c.outros_nomes.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-primary border-b border-border pb-1 mb-1">Pessoas Relacionadas</h3>
              {(c.outros_nomes as any[]).map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-1.5 px-2 hover:bg-muted/30 rounded">
                  <div className="text-sm">
                    <span className="font-medium">{p.nome || '—'}</span>
                    {p.relacao && <span className="text-muted-foreground ml-1">({p.relacao})</span>}
                    {p.telefone && <span className="text-muted-foreground ml-2">📞 {p.telefone}</span>}
                    {p.cpf && <span className="text-muted-foreground ml-2">CPF: {p.cpf}</span>}
                  </div>
                  <CopyButton text={[p.nome, p.relacao, p.cpf].filter(Boolean).join(' - ')} />
                </div>
              ))}
            </div>
          )}

          {c.observacoes && (
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-primary border-b border-border pb-1 mb-1">Observações</h3>
              <div className="flex items-start justify-between py-1.5 px-2">
                <p className="text-sm whitespace-pre-wrap flex-1">{c.observacoes}</p>
                <CopyButton text={c.observacoes} />
              </div>
            </div>
          )}

          {/* Histórico de Observações */}
          {Array.isArray(c.observacoes_historico) && c.observacoes_historico.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-primary border-b border-border pb-1 mb-1">Histórico de Observações</h3>
              <div className="space-y-2 px-2">
                {(c.observacoes_historico as any[]).map((h: any, i: number) => (
                  <div key={i} className="py-1.5 border-b border-border/30 last:border-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{h.data ? new Date(h.data).toLocaleDateString('pt-BR') : `#${i + 1}`}</span>
                      <CopyButton text={h.texto || h.observacao || ''} />
                    </div>
                    <p className="text-sm whitespace-pre-wrap mt-0.5">{h.texto || h.observacao || '—'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
