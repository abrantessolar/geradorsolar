/**
 * Renderiza as 4 páginas da proposta em layout HTML estilizado, inspirado
 * na proposta online (cards, badges, gradientes sutis, paleta TLS).
 *
 * Estrutura:
 *   1. Capa — image3.jpg + overlay verde + título + cliente + nº + data
 *   2. Dados + Investimento — Equipamentos, Especificações, Geração×Consumo,
 *      Investimento (à vista + 5 parcelas)
 *   3. Fluxo de caixa (5/10/15/20/25 anos) + 8 cards de diferenciais
 *   4. Portfólio — grade 4×4 (até 16 fotos)
 *
 * Páginas internas (2, 3, 4) têm cabeçalho (logo + nº) e rodapé (CNPJ/contato).
 */
import { forwardRef } from 'react';
import bgCapa from '@/assets/proposta-template/image3.jpg';
import logoTls from '@/assets/logo.png';
import { formatCurrency, formatNumber } from '@/data/calculations';
import {
  Calendar, Shield, FileText, Building2, CreditCard, Zap, BadgeCheck, Plane,
} from 'lucide-react';

export interface CashflowRow {
  year: number;
  semSolar: number;
  comSolar: number;
  economia: number;
}

export interface PropostaTemplateData {
  cliente_nome: string;
  cliente_cidade?: string;
  responsavel_nome: string;
  geracao_mensal: number;
  consumo_mensal: number;
  excedente_kwh: number;
  potencia_kwp: number;
  qtd_inversores: number;
  marca_inversor: string;
  potencia_inversor: string;
  num_placas: number;
  marca_placa: string;
  potencia_placa: string;
  preco_vista: number;
  parcela_24x: number;
  parcela_36x: number;
  parcela_48x: number;
  parcela_60x: number;
  parcela_72x: number;
  numero_proposta: string;
  economia_mensal: number;
  payback_anos: number;
  fluxo_caixa: CashflowRow[];
  fotos_portfolio: string[]; // até 16 URLs já otimizadas
}

// A4 a 150 dpi
const PAGE_W = 1241;
const PAGE_H = 1755;

const OLIVE = '#5b6a2a';
const OLIVE_DARK = '#4A5A2A';
const YELLOW = '#E8B84B';
const GRAY = '#7a7a7a';
const DARK = '#2b2b2b';
const LIGHT = '#f7f7f3';
const BORDER = '#e5e5e0';

const fmtKwh = (n: number) => `${formatNumber(n, 0)} kWh`;
const fmtMoney = (n: number) => formatCurrency(n).replace('R$', '').trim();
const today = () => new Date().toLocaleDateString('pt-BR', {
  day: '2-digit', month: 'long', year: 'numeric',
});

interface PageProps {
  children?: React.ReactNode;
  noChrome?: boolean;
}

function Page({ children, noChrome }: PageProps) {
  return (
    <div
      style={{
        width: `${PAGE_W}px`,
        height: `${PAGE_H}px`,
        position: 'relative',
        background: '#ffffff',
        overflow: 'hidden',
        pageBreakAfter: 'always',
        fontFamily: 'Arial, Helvetica, sans-serif',
        color: DARK,
      }}
    >
      {children}
    </div>
  );
}

function Header({ numero }: { numero: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '24px 50px',
        background: OLIVE_DARK,
        color: '#fff',
        height: 90,
        boxSizing: 'border-box',
      }}
    >
      <img
        src={logoTls}
        alt="Três Lagoas Solar"
        crossOrigin="anonymous"
        style={{ height: 56, objectFit: 'contain' }}
      />
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 11, letterSpacing: 1, opacity: 0.8, textTransform: 'uppercase' }}>
          Proposta
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: YELLOW, letterSpacing: 0.5 }}>
          {numero}
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: OLIVE_DARK,
        color: '#fff',
        fontSize: 12,
        padding: '14px 40px',
        textAlign: 'center',
        boxSizing: 'border-box',
      }}
    >
      <strong>(67) 9 9895-5576</strong> &nbsp;|&nbsp; contato@treslagoassolar.com.br &nbsp;|&nbsp;{' '}
      <em>CNPJ: 39.369.943/0001-21</em> &nbsp;|&nbsp; www.treslagoassolar.com.br &nbsp;|&nbsp; @treslagoassolar
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-block',
        background: YELLOW,
        color: DARK,
        fontWeight: 700,
        fontSize: 13,
        padding: '5px 14px',
        borderRadius: 999,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
      }}
    >
      {children}
    </span>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: '#fff',
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        padding: 18,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      style={{
        background: accent ? OLIVE_DARK : '#fff',
        color: accent ? '#fff' : DARK,
        border: accent ? 'none' : `1px solid ${BORDER}`,
        borderRadius: 10,
        padding: '14px 18px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          color: accent ? 'rgba(255,255,255,0.85)' : GRAY,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}

const DIFF_ICONS = [
  { Icon: Calendar, title: 'Acompanhamento por 3 anos', text: 'Monitoramos sua usina no pós-venda para mais segurança e tranquilidade.' },
  { Icon: Shield, title: '3 anos de garantia da instalação', text: 'Garantia do nosso serviço, com montagem segura e acabamento profissional.' },
  { Icon: FileText, title: 'Geração garantida em contrato', text: 'Dimensionamento técnico com compromisso formal de geração.' },
  { Icon: Building2, title: 'Empresa sólida', text: 'Atendimento responsável, estrutura profissional e relação de longo prazo.' },
  { Icon: CreditCard, title: 'Financiamento facilitado', text: 'Você financia com a nossa ajuda, sem precisar ir ao banco.' },
  { Icon: Zap, title: 'Sistema solar completo', text: 'Entregamos todos os equipamentos e componentes da solução.' },
  { Icon: BadgeCheck, title: 'Materiais selecionados', text: 'Estrutura, proteções e acessórios com padrão de qualidade.' },
  { Icon: Plane, title: 'Análise 3D com drone', text: 'Estudo técnico de sombreamento para máxima eficiência do projeto.' },
];

export const PropostaTemplatePages = forwardRef<HTMLDivElement, { data: PropostaTemplateData }>(
  ({ data }, ref) => {
    const parcelas = [
      { label: '24x', value: data.parcela_24x },
      { label: '36x', value: data.parcela_36x },
      { label: '48x', value: data.parcela_48x },
      { label: '60x', value: data.parcela_60x },
      { label: '72x', value: data.parcela_72x },
    ];

    // Garantir 16 slots de fotos (preenche com vazios para não quebrar grid)
    const fotos = data.fotos_portfolio.slice(0, 16);
    while (fotos.length < 16) fotos.push('');

    return (
      <div ref={ref} style={{ width: `${PAGE_W}px`, background: '#fff' }}>
        {/* ============ PÁGINA 1 — CAPA ============ */}
        <Page>
          <img
            src={bgCapa}
            alt=""
            crossOrigin="anonymous"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          {/* overlay verde gradiente */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(135deg, rgba(74,90,42,0.85) 0%, rgba(74,90,42,0.55) 60%, rgba(0,0,0,0.55) 100%)`,
            }}
          />
          {/* Conteúdo */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '80px 80px',
              color: '#fff',
            }}
          >
            <img
              src={logoTls}
              alt="Três Lagoas Solar"
              crossOrigin="anonymous"
              style={{ height: 110, objectFit: 'contain', alignSelf: 'flex-start', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))' }}
            />

            <div>
              <div
                style={{
                  display: 'inline-block',
                  background: YELLOW,
                  color: DARK,
                  fontWeight: 700,
                  fontSize: 14,
                  padding: '6px 16px',
                  borderRadius: 999,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  marginBottom: 24,
                }}
              >
                {data.numero_proposta}
              </div>
              <h1
                style={{
                  fontSize: 72,
                  fontWeight: 700,
                  margin: 0,
                  lineHeight: 1.05,
                  letterSpacing: -1,
                  textShadow: '0 2px 12px rgba(0,0,0,0.4)',
                }}
              >
                Proposta<br />Comercial
              </h1>
              <div style={{ fontSize: 22, marginTop: 18, opacity: 0.95 }}>
                Sistema de Energia Solar Fotovoltaica
              </div>

              <div
                style={{
                  marginTop: 50,
                  paddingTop: 28,
                  borderTop: '2px solid rgba(255,255,255,0.4)',
                  maxWidth: 700,
                }}
              >
                <div style={{ fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.8 }}>
                  Cliente
                </div>
                <div style={{ fontSize: 38, fontWeight: 700, marginTop: 6, lineHeight: 1.1 }}>
                  {data.cliente_nome}
                </div>
                {data.cliente_cidade && (
                  <div style={{ fontSize: 18, opacity: 0.9, marginTop: 6 }}>{data.cliente_cidade}</div>
                )}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                fontSize: 14,
                opacity: 0.9,
              }}
            >
              <div>
                <div style={{ opacity: 0.75, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Emitida em
                </div>
                <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>{today()}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ opacity: 0.75, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Consultor
                </div>
                <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>
                  {data.responsavel_nome || '—'}
                </div>
              </div>
            </div>
          </div>
        </Page>

        {/* ============ PÁGINA 2 — DADOS + INVESTIMENTO ============ */}
        <Page>
          <Header numero={data.numero_proposta} />
          <div style={{ padding: '32px 50px 100px', display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div>
              <Badge>Especificações do Projeto</Badge>
              <h1 style={{ fontSize: 34, color: OLIVE_DARK, margin: '10px 0 0', fontWeight: 700, letterSpacing: -0.5 }}>
                Seu sistema solar
              </h1>
              <div style={{ fontSize: 15, color: GRAY, marginTop: 4 }}>
                Cliente: <strong style={{ color: DARK }}>{data.cliente_nome}</strong>
              </div>
            </div>

            {/* Métricas principais */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <MetricCard label="Potência" value={`${formatNumber(data.potencia_kwp, 2)} kWp`} accent />
              <MetricCard label="Geração mensal" value={fmtKwh(data.geracao_mensal)} />
              <MetricCard label="Consumo mensal" value={fmtKwh(data.consumo_mensal)} />
              <MetricCard label="Excedente" value={fmtKwh(Math.max(0, data.excedente_kwh))} />
            </div>

            {/* Equipamentos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Card>
                <div style={{ fontSize: 11, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
                  Inversor
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: OLIVE_DARK }}>
                  {data.qtd_inversores}× {data.marca_inversor}
                </div>
                <div style={{ fontSize: 14, color: DARK, marginTop: 4 }}>
                  Potência: <strong>{data.potencia_inversor}</strong>
                </div>
              </Card>
              <Card>
                <div style={{ fontSize: 11, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
                  Placas Solares
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: OLIVE_DARK }}>
                  {data.num_placas}× {data.marca_placa}
                </div>
                <div style={{ fontSize: 14, color: DARK, marginTop: 4 }}>
                  Potência: <strong>{data.potencia_placa}</strong>
                </div>
              </Card>
            </div>

            {/* Escopo */}
            <div
              style={{
                background: LIGHT,
                borderLeft: `4px solid ${YELLOW}`,
                padding: '14px 18px',
                fontSize: 13,
                color: DARK,
                lineHeight: 1.6,
                borderRadius: 6,
              }}
            >
              <strong>Escopo:</strong> Sistema solar + Material de instalação + Análise 3D com drone +
              Homologação na concessionária + <strong>3 anos de garantia</strong> de instalação e
              acompanhamento pós-venda.
            </div>

            {/* Investimento */}
            <div>
              <Badge>Investimento</Badge>
              <h2 style={{ fontSize: 26, color: OLIVE_DARK, margin: '10px 0 14px', fontWeight: 700 }}>
                Sistema completo de energia solar
              </h2>

              {/* À vista */}
              <div
                style={{
                  background: `linear-gradient(135deg, ${OLIVE_DARK} 0%, ${OLIVE} 100%)`,
                  color: '#fff',
                  padding: '18px 26px',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 12px rgba(74,90,42,0.25)',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.85 }}>
                    À vista
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 700, marginTop: 2 }}>
                    R$ {fmtMoney(data.preco_vista)}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 12, opacity: 0.85, lineHeight: 1.4 }}>
                  Pix, transferência<br />ou boleto
                </div>
              </div>

              {/* Parcelas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginTop: 12 }}>
                {parcelas.map((p) => (
                  <div
                    key={p.label}
                    style={{
                      background: '#fff',
                      border: `2px solid ${OLIVE_DARK}`,
                      borderRadius: 10,
                      padding: '14px 8px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 22, fontWeight: 700, color: GRAY, lineHeight: 1 }}>
                      {p.label}
                    </div>
                    <div style={{ fontSize: 10, color: GRAY, marginTop: 2 }}>de</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: OLIVE_DARK, marginTop: 2 }}>
                      R$ {fmtMoney(p.value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Economia + Payback */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Card style={{ background: LIGHT }}>
                <div style={{ fontSize: 11, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  Economia mensal estimada
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: OLIVE_DARK, marginTop: 4 }}>
                  R$ {fmtMoney(data.economia_mensal)}
                </div>
              </Card>
              <Card style={{ background: LIGHT }}>
                <div style={{ fontSize: 11, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  Retorno do investimento
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: OLIVE_DARK, marginTop: 4 }}>
                  {formatNumber(data.payback_anos, 1)} anos
                </div>
              </Card>
            </div>

            <div style={{ fontSize: 11, color: GRAY, fontStyle: 'italic', textAlign: 'center', marginTop: 4 }}>
              Proposta válida por 10 dias a partir da data de emissão. Valores sujeitos a alteração
              conforme variação cambial e disponibilidade de equipamentos.
            </div>
          </div>
          <Footer />
        </Page>

        {/* ============ PÁGINA 3 — FLUXO DE CAIXA + DIFERENCIAIS ============ */}
        <Page>
          <Header numero={data.numero_proposta} />
          <div style={{ padding: '32px 50px 100px', display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div>
              <Badge>Projeção Financeira</Badge>
              <h1 style={{ fontSize: 30, color: OLIVE_DARK, margin: '10px 0 0', fontWeight: 700, letterSpacing: -0.5 }}>
                Fluxo de caixa acumulado
              </h1>
              <div style={{ fontSize: 13, color: GRAY, marginTop: 4 }}>
                Comparação entre continuar pagando a conta atual de luz × investir em energia solar
              </div>
            </div>

            {/* Tabela */}
            <div
              style={{
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                overflow: 'hidden',
                fontSize: 14,
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1.4fr 1.4fr 1.2fr',
                  background: OLIVE_DARK,
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                <div style={{ padding: '12px 16px' }}>Período</div>
                <div style={{ padding: '12px 16px' }}>Sem energia solar</div>
                <div style={{ padding: '12px 16px' }}>Com energia solar</div>
                <div style={{ padding: '12px 16px' }}>Economia acumulada</div>
              </div>
              {data.fluxo_caixa.map((row, i) => (
                <div
                  key={row.year}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1.4fr 1.4fr 1.2fr',
                    background: i % 2 === 0 ? '#fff' : LIGHT,
                    borderTop: i === 0 ? 'none' : `1px solid ${BORDER}`,
                  }}
                >
                  <div style={{ padding: '12px 16px', fontWeight: 700, color: OLIVE_DARK }}>
                    {row.year} anos
                  </div>
                  <div style={{ padding: '12px 16px', color: '#a13a3a' }}>
                    R$ {fmtMoney(row.semSolar)}
                  </div>
                  <div style={{ padding: '12px 16px' }}>
                    R$ {fmtMoney(row.comSolar)}
                  </div>
                  <div style={{ padding: '12px 16px', fontWeight: 700, color: OLIVE_DARK }}>
                    R$ {fmtMoney(row.economia)}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <Badge>Nossos Diferenciais</Badge>
              <h2 style={{ fontSize: 24, color: OLIVE_DARK, margin: '10px 0 14px', fontWeight: 700 }}>
                Por que escolher a Três Lagoas Solar
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {DIFF_ICONS.map(({ Icon, title, text }, i) => (
                  <div
                    key={i}
                    style={{
                      background: '#fff',
                      border: `1px solid ${BORDER}`,
                      borderRadius: 10,
                      padding: 14,
                      textAlign: 'center',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 999,
                        background: YELLOW,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 8px',
                      }}
                    >
                      <Icon size={22} color={OLIVE_DARK} strokeWidth={2.2} />
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: OLIVE_DARK, marginBottom: 4, lineHeight: 1.2 }}>
                      {title}
                    </div>
                    <div style={{ fontSize: 10.5, color: GRAY, lineHeight: 1.4 }}>{text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <Footer />
        </Page>

        {/* ============ PÁGINA 4 — PORTFÓLIO ============ */}
        <Page>
          <Header numero={data.numero_proposta} />
          <div style={{ padding: '32px 50px 100px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <Badge>Nossos Projetos</Badge>
              <h1 style={{ fontSize: 30, color: OLIVE_DARK, margin: '10px 0 0', fontWeight: 700, letterSpacing: -0.5 }}>
                Alguns dos nossos projetos
              </h1>
              <div style={{ fontSize: 13, color: GRAY, marginTop: 4 }}>
                Mais de uma década entregando energia limpa em Três Lagoas e região
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 10,
              }}
            >
              {fotos.map((url, i) => (
                <div
                  key={i}
                  style={{
                    aspectRatio: '1 / 1',
                    width: '100%',
                    background: LIGHT,
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: `1px solid ${BORDER}`,
                  }}
                >
                  {url && (
                    <img
                      src={url}
                      alt={`Projeto ${i + 1}`}
                      crossOrigin="anonymous"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          <Footer />
        </Page>
      </div>
    );
  },
);

PropostaTemplatePages.displayName = 'PropostaTemplatePages';
