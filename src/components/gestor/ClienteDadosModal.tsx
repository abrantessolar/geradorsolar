import React from 'react';
import { X, Copy, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import WhatsAppLink, { formatWhatsAppUrl } from './WhatsAppLink';
import type { ClienteBase } from './ClientesList';

function fmt(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === '') return '';
  return String(val);
}

function fmtDate(val: string | null | undefined): string {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR');
}

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

function FieldRow({ label, value, isPhone }: FieldDef) {
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
          {isPhone ? <WhatsAppLink phone={value} /> : <span>{value}</span>}
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

  // Build full address from parts if endereco is empty
  const enderecoCompleto = (() => {
    if (c.endereco) return c.endereco;
    const parts = [c.logradouro, c.numero, c.complemento, c.bairro, c.cidade, c.estado].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '';
  })();

  const blocks: { title: string; fields: FieldDef[] }[] = [
    {
      title: 'Identificação',
      fields: [
        { label: 'Nome completo', value: fmt(c.nome_completo) },
        { label: 'CPF', value: fmt(c.cpf) },
        { label: 'Data de nascimento', value: fmtDate(c.data_nascimento) },
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
        { label: 'Data de instalação', value: fmtDate(c.instalado_em) },
        { label: 'Data de vistoria', value: fmtDate(c.vistoriado_em) },
      ],
    },
    {
      title: 'Equipamentos',
      fields: [
        { label: 'Placas', value: c.qtd_placas && c.marca_placa && c.potencia_placa ? `${c.qtd_placas}x ${c.marca_placa} ${c.potencia_placa}W` : '' },
        { label: 'Inversor', value: c.marca_inversor && c.potencia_inversor ? `${c.qtd_inversores || 1}x ${c.marca_inversor} ${c.potencia_inversor}kW` : '' },
        { label: 'KWp total', value: calcKwp(c) ? `${calcKwp(c)} kWp` : '' },
        { label: 'Sistema', value: fmt(c.sistema) },
      ],
    },
    {
      title: 'Financeiro',
      fields: [
        { label: 'Valor do sistema', value: fmtMoney(c.valor) },
        { label: 'Forma de pagamento', value: fmt(c.forma_pagamento) },
      ],
    },
  ];

  const buildCopyAll = () => {
    const lines: string[] = [];
    const add = (label: string, value: string) => { if (value) lines.push(`${label}: ${value}`); };
    add('NOME', fmt(c.nome_completo));
    add('CPF', fmt(c.cpf));
    add('DATA NASCIMENTO', fmtDate(c.data_nascimento));
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
    const sys = sistemaStr(c);
    if (sys) add('SISTEMA', sys);
    add('DATA INSTALAÇÃO', fmtDate(c.instalado_em));
    add('DATA VISTORIA', fmtDate(c.vistoriado_em));
    add('VALOR', fmtMoney(c.valor));
    add('FORMA PAGAMENTO', fmt(c.forma_pagamento));
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
          {/* Pessoas Relacionadas */}
          {Array.isArray(c.outros_nomes) && c.outros_nomes.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-primary border-b border-border pb-1 mb-1">Pessoas Relacionadas</h3>
              {(c.outros_nomes as any[]).map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-1.5 px-2 hover:bg-muted/30 rounded">
                  <div className="text-sm">
                    <span className="font-medium">{p.nome || '—'}</span>
                    {p.relacao && <span className="text-muted-foreground ml-1">({p.relacao})</span>}
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
