/**
 * Renderiza as 4 páginas da proposta em layout HTML estilizado, inspirado
 * na proposta online (cards, badges, gradientes sutis, paleta TLS).
 *
 * RESTRIÇÕES html2canvas:
 * - Apenas estilos inline (sem CSS externo, sem Tailwind, sem fontes web)
 * - Ícones lucide-react e logo @/assets/logo-tls-pdf.png mantidos como referência
 * - Tamanho fixo: 1241 × 1755 px por página (A4 a 150 dpi)
 * - Paleta: verde #4A5A2A, amarelo #E8B84B
 */
import { forwardRef } from 'react';
import logoTls from '@/assets/logo-tls-pdf.png';

import emp1 from '@/assets/proposta-template/empresa/emp1.jpg';
import emp2 from '@/assets/proposta-template/empresa/emp2.jpg';
import emp3 from '@/assets/proposta-template/empresa/emp3.jpg';
import emp4 from '@/assets/proposta-template/empresa/emp4.jpg';
import inversorImg from '@/assets/proposta-template/inversor.png';
import moduloImg from '@/assets/proposta-template/modulo.png';
import instalacoesImg from '@/assets/proposta-template/instalacoes.png';

const EMPRESA_FOTOS = [emp1, emp2, emp3, emp4];
import { formatCurrency, formatNumber } from '@/data/calculations';
import {
  Calendar, Shield, FileText, Building2, CreditCard, Zap, BadgeCheck, Plane, Check, X,
} from 'lucide-react';

export interface CashflowRow {
  year: number;
  semSolar: number;
  comSolar: number;
  economia: number;
}

export interface MonthlyRow {
  mes: string;
  geracao: number;
  consumo: number;
}

export interface PropostaTemplateData {
  cliente_nome: string;
  cliente_cidade?: string;
  responsavel_nome: string;
  responsavel_telefone?: string;
  responsavel_email?: string;
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
  cartao_parcelas: { meses: number; valor: number }[];
  numero_proposta: string;
  economia_mensal: number;
  payback_anos: number;
  tarifa_kwh: number;
  dados_mensais: MonthlyRow[];
  fluxo_caixa: CashflowRow[];
  fotos_portfolio: string[];
  observacoes?: string;
  escopo_incluso?: string[];
  escopo_excluido?: string[];
}

// A4 a 150 dpi
const PAGE_W = 1241;
const PAGE_H = 1755;

const OLIVE      = '#5b6a2a';
const OLIVE_DARK = '#4A5A2A';
const OLIVE_MID  = '#6b7c34';
const YELLOW     = '#E8B84B';
const YELLOW_LIGHT = '#FDF3D8';
const GRAY       = '#4a4a4a';
const GRAY_LIGHT = '#6a6a6a';
const DARK       = '#1e1e1e';
const LIGHT      = '#f7f7f3';
const LIGHT2     = '#f0f0ea';
const BORDER     = '#e2e2db';
const WHITE      = '#ffffff';

const fmtKwh   = (n: number) => `${formatNumber(n, 0)} kWh`;
const fmtMoney = (n: number) => formatCurrency(n).replace('R$', '').trim();
const today    = () => new Date().toLocaleDateString('pt-BR', {
  day: '2-digit', month: 'long', year: 'numeric',
});

// ────────────────────────────────────────────────────────────
// Layout base
// ────────────────────────────────────────────────────────────
function Page({ children }: { children?: React.ReactNode }) {
  return (
    <div
      style={{
        width: `${PAGE_W}px`,
        height: `${PAGE_H}px`,
        position: 'relative',
        background: WHITE,
        overflow: 'hidden',
        pageBreakAfter: 'always',
        fontFamily: 'Inter, Arial, sans-serif',
        color: DARK,
      }}
    >
      {children}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Header com acento lateral amarelo
// ────────────────────────────────────────────────────────────
function Header({ numero }: { numero: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: OLIVE_DARK,
        color: WHITE,
        height: 110,
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'visible',
      }}
    >
      {/* faixa decorativa lateral esquerda */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 6,
        background: YELLOW,
      }} />
      <div style={{ paddingLeft: 56, paddingRight: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', height: '100%' }}>
        <img
          src={logoTls}
          alt="Três Lagoas Solar"
          crossOrigin="anonymous"
          style={{ height: 200, objectFit: 'contain', position: 'relative', zIndex: 2 }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.25)' }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, letterSpacing: 2, opacity: 0.7, textTransform: 'uppercase', fontFamily: 'Inter, Arial, sans-serif', fontWeight: 600 }}>
              Proposta Comercial
            </div>
            <div style={{ fontSize: 21, fontWeight: 700, color: YELLOW, letterSpacing: 0.5, fontFamily: 'Inter, Arial, sans-serif', marginTop: 2 }}>
              {numero}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Footer
// ────────────────────────────────────────────────────────────
function Footer() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: OLIVE_DARK,
        color: 'rgba(255,255,255,0.85)',
        fontSize: 13,
        padding: '15px 50px',
        textAlign: 'center',
        boxSizing: 'border-box',
        fontFamily: 'Inter, Arial, sans-serif',
        letterSpacing: 0.3,
      }}
    >
      <span style={{ color: YELLOW, fontWeight: 700 }}>(67) 99644-8995</span>
      {' '}·{' '}
      contato@treslagoassolar.com.br
      {' '}·{' '}
      CNPJ: 39.369.943/0001-21
      {' '}·{' '}
      <span style={{ color: YELLOW }}>www.treslagoassolar.com.br</span>
      {' '}·{' '}
      @treslagoassolar
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Componentes auxiliares
// ────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <div style={{ width: 4, height: 22, background: YELLOW, borderRadius: 2, flexShrink: 0 }} />
      <span style={{
        fontSize: 11, fontWeight: 700, letterSpacing: 2,
        textTransform: 'uppercase', color: OLIVE_DARK,
        fontFamily: 'Inter, Arial, sans-serif',
      }}>
        {children}
      </span>
    </div>
  );
}

function MetricCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div
      style={{
        background: accent ? OLIVE_DARK : WHITE,
        color: accent ? WHITE : DARK,
        border: accent ? 'none' : `1.5px solid ${BORDER}`,
        borderRadius: 12,
        padding: '18px 20px',
        boxShadow: accent ? '0 6px 20px rgba(74,90,42,0.22)' : '0 2px 6px rgba(0,0,0,0.04)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {accent && (
        <div style={{
          position: 'absolute', bottom: -8, right: -8,
          width: 60, height: 60, borderRadius: '50%',
          background: 'rgba(232,184,75,0.18)',
        }} />
      )}
      <div style={{
        fontSize: 14,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color: accent ? 'rgba(255,255,255,0.9)' : GRAY,
        marginBottom: 7,
        fontFamily: 'Inter, Arial, sans-serif',
        fontWeight: 600,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1, fontFamily: 'Inter, Arial, sans-serif' }}>{value}</div>
      {sub && (
        <div style={{ fontSize: 15, marginTop: 7, color: accent ? 'rgba(255,255,255,0.75)' : GRAY, fontFamily: 'Inter, Arial, sans-serif' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Ícones SVG inline
// ────────────────────────────────────────────────────────────
function PanelIcon({ size = 80 }: { size?: number }) {
  return (
    <img
      src={moduloImg}
      alt="Módulo Fotovoltaico"
      crossOrigin="anonymous"
      style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
    />
  );
}

function InverterIcon({ size = 80 }: { size?: number }) {
  return (
    <img
      src={inversorImg}
      alt="Inversor"
      crossOrigin="anonymous"
      style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
    />
  );
}

// ────────────────────────────────────────────────────────────
// Gráfico barras Geração × Consumo (SVG puro)
// ────────────────────────────────────────────────────────────
function GeracaoConsumoChart({ data }: { data: MonthlyRow[] }) {
  const W = 1100;
  const H = 480;
  const PAD_L = 58;
  const PAD_R = 20;
  const PAD_T = 28;
  const PAD_B = 44;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const max = Math.max(...data.flatMap((d) => [d.geracao, d.consumo]), 1);
  const niceMax = Math.ceil(max / 100) * 100;
  const groupW = innerW / data.length;
  const barW = (groupW - 10) / 2;

  const yTicks = 5;
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => Math.round((niceMax / yTicks) * i));

  return (
    <svg width={W} height={H} xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      {/* faixa de fundo alternada */}
      {data.map((_, i) => (
        i % 2 === 0 ? null :
        <rect key={`bg-${i}`} x={PAD_L + i * groupW} y={PAD_T} width={groupW} height={innerH} fill="#f9f9f5" />
      ))}
      {/* grid horizontal */}
      {ticks.map((t, i) => {
        const y = PAD_T + innerH - (t / niceMax) * innerH;
        return (
          <g key={i}>
            <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
              stroke={i === 0 ? DARK : BORDER} strokeWidth={i === 0 ? '1.5' : '1'} />
            <text x={PAD_L - 8} y={y + 5} fontSize="16" textAnchor="end"
              fill={GRAY_LIGHT} fontFamily="Arial, sans-serif">
              {t}
            </text>
          </g>
        );
      })}
      {/* barras */}
      {data.map((d, i) => {
        const xBase = PAD_L + i * groupW + 5;
        const hG = (d.geracao / niceMax) * innerH;
        const hC = (d.consumo / niceMax) * innerH;
        const yG = PAD_T + innerH - hG;
        const yC = PAD_T + innerH - hC;
        return (
          <g key={i}>
            {/* barra geração com topo arredondado simulado */}
            <rect x={xBase} y={yG} width={barW} height={hG} fill={OLIVE_DARK} rx="3" />
            <text x={xBase + barW / 2} y={yG - 7} fontSize="15" fontWeight="700"
              textAnchor="middle" fill={OLIVE_DARK} fontFamily="Arial, sans-serif">
              {Math.round(d.geracao)}
            </text>
            {/* barra consumo */}
            <rect x={xBase + barW + 4} y={yC} width={barW} height={hC} fill={YELLOW} rx="3" />
            <text x={xBase + barW + 4 + barW / 2} y={yC - 7} fontSize="15" fontWeight="700"
              textAnchor="middle" fill={OLIVE_MID} fontFamily="Arial, sans-serif">
              {Math.round(d.consumo)}
            </text>
            {/* label mês */}
            <text x={xBase + barW + 2} y={H - PAD_B + 24} fontSize="15" fontWeight="600"
              textAnchor="middle" fill={DARK} fontFamily="Arial, sans-serif">
              {d.mes}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ────────────────────────────────────────────────────────────
// Diferenciais
// ────────────────────────────────────────────────────────────
const DIFF_ICONS = [
  { Icon: Calendar,   title: 'Acompanhamento 3 anos', text: 'Monitoramos sua usina no pós-venda para segurança e tranquilidade.' },
  { Icon: Shield,     title: 'Garantia de instalação', text: 'Montagem segura e acabamento profissional com 3 anos de garantia.' },
  { Icon: FileText,   title: 'Geração em contrato',   text: 'Dimensionamento técnico com compromisso formal de geração.' },
  { Icon: Building2,  title: 'Empresa sólida',        text: 'Estrutura profissional e relação de longo prazo com cada cliente.' },
  { Icon: CreditCard, title: 'Financiamento fácil',   text: 'Você financia com a nossa ajuda, sem precisar ir ao banco.' },
  { Icon: Zap,        title: 'Sistema completo',      text: 'Todos os equipamentos e componentes da solução entregues.' },
  { Icon: BadgeCheck, title: 'Materiais selecionados',text: 'Estrutura, proteções e acessórios com padrão de qualidade.' },
  { Icon: Plane,      title: 'Análise 3D com drone',  text: 'Estudo técnico de sombreamento para máxima eficiência.' },
];

// ────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ────────────────────────────────────────────────────────────
export const PropostaTemplatePages = forwardRef<HTMLDivElement, { data: PropostaTemplateData }>(
  ({ data }, ref) => {
    const parcelas = [
      { label: '24x', value: data.parcela_24x },
      { label: '36x', value: data.parcela_36x },
      { label: '48x', value: data.parcela_48x },
      { label: '60x', value: data.parcela_60x },
      { label: '72x', value: data.parcela_72x },
    ];

    const fotos = data.fotos_portfolio.slice(0, 16);
    while (fotos.length < 16) fotos.push('');

    return (
      <div ref={ref} style={{ width: `${PAGE_W}px`, background: WHITE }}>

        {/* ══════════════════════════════════════════════════════
            PÁGINA 1 — CAPA (foto real + tipografia editorial, 100% código)
        ══════════════════════════════════════════════════════ */}
        <Page>
          <img
            src={emp1}
            alt=""
            crossOrigin="anonymous"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {/* gradiente escurecendo de cima (leve) para baixo (forte) — legibilidade do texto */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(30,36,18,0.20) 0%, rgba(43,52,22,0.55) 48%, rgba(27,33,14,0.94) 82%, rgba(20,25,10,0.98) 100%)',
          }} />

          {/* topo: logo + número da proposta */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '44px 56px',
          }}>
            <img src={logoTls} alt="Três Lagoas Solar" crossOrigin="anonymous" style={{ height: 108, objectFit: 'contain' }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, letterSpacing: 3, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', fontFamily: 'Inter, Arial, sans-serif', fontWeight: 600 }}>
                Proposta Comercial
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: YELLOW, fontFamily: 'Inter, Arial, sans-serif', marginTop: 4 }}>
                {data.numero_proposta}
              </div>
            </div>
          </div>

          {/* headline editorial */}
          <div style={{ position: 'absolute', left: 56, right: 56, top: '38%' }}>
            <div style={{ width: 56, height: 4, background: YELLOW, borderRadius: 2, marginBottom: 22 }} />
            <h1 style={{
              fontFamily: 'Fraunces, Georgia, serif', fontWeight: 600, fontSize: 58, lineHeight: 1.08,
              color: WHITE, margin: 0, maxWidth: 780, letterSpacing: -0.5,
            }}>
              Seu projeto de<br />energia solar fotovoltaica
            </h1>
          </div>

          {/* rodapé de identificação: cliente + representante */}
          <div style={{
            position: 'absolute', left: 56, right: 56, bottom: 96,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
            borderTop: '1px solid rgba(255,255,255,0.22)', paddingTop: 22,
          }}>
            <div>
              <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 600, fontSize: 34, color: WHITE, lineHeight: 1.1 }}>
                {data.cliente_nome}
              </div>
              <div style={{ fontFamily: 'Inter, Arial, sans-serif', fontSize: 16, color: YELLOW, marginTop: 6, fontWeight: 600 }}>
                {fmtKwh(data.geracao_mensal)} por mês {data.cliente_cidade ? `· ${data.cliente_cidade}` : ''}
              </div>
            </div>
            <div style={{ textAlign: 'right', fontFamily: 'Inter, Arial, sans-serif' }}>
              <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
                Representante
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: WHITE }}>{data.responsavel_nome || '—'}</div>
              {data.responsavel_telefone && (
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>{data.responsavel_telefone}</div>
              )}
            </div>
          </div>

          <Footer />
        </Page>


        {/* ══════════════════════════════════════════════════════
            PÁGINA 2 — PORTFÓLIO
        ══════════════════════════════════════════════════════ */}
        <Page>
          <Header numero={data.numero_proposta} />
          <div style={{ padding: '32px 52px 100px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            <div>
              <SectionLabel>Nossos Projetos</SectionLabel>
              <h1 style={{ fontSize: 32, color: OLIVE_DARK, margin: '4px 0 4px', fontWeight: 700, letterSpacing: -0.5, fontFamily: 'Fraunces, Georgia, serif' }}>
                Alguns dos nossos projetos
              </h1>
              <div style={{ fontSize: 13, color: GRAY, fontFamily: 'Inter, Arial, sans-serif' }}>
                Projetos entregues com excelência técnica, como você merece
              </div>
            </div>

            {/* grid de fotos */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {fotos.map((url, i) => (
                <div
                  key={i}
                  style={{
                    aspectRatio: '1 / 1',
                    width: '100%',
                    background: LIGHT2,
                    borderRadius: 10,
                    overflow: 'hidden',
                    border: `1.5px solid ${BORDER}`,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                    position: 'relative',
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
                  {/* numeração discreta */}
                  {!url && (
                    <div style={{
                      position: 'absolute', inset: 0, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      color: BORDER, fontSize: 32, fontWeight: 700, fontFamily: 'Inter, Arial, sans-serif',
                    }}>
                      {i + 1}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Nossa empresa — linha 1x4 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {EMPRESA_FOTOS.map((url, i) => (
                  <div
                    key={i}
                    style={{
                      aspectRatio: '1 / 1',
                      width: '100%',
                      background: LIGHT2,
                      borderRadius: 10,
                      overflow: 'hidden',
                      border: `1.5px solid ${BORDER}`,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                    }}
                  >
                    <img
                      src={url}
                      alt={`Empresa ${i + 1}`}
                      crossOrigin="anonymous"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  </div>
                ))}
            </div>
          </div>
          <Footer />
        </Page>


        {/* ══════════════════════════════════════════════════════
            PÁGINA 3 — ESPECIFICAÇÕES + GRÁFICO + DIFERENCIAIS
        ══════════════════════════════════════════════════════ */}
        <Page>
          <Header numero={data.numero_proposta} />
          <div style={{ padding: '30px 52px 100px', display: 'flex', flexDirection: 'column', gap: 22 }}>

            {/* título */}
            <div>
              <SectionLabel>Especificações do Projeto</SectionLabel>
              <h1 style={{ fontSize: 42, color: OLIVE_DARK, margin: 0, fontWeight: 700, letterSpacing: -0.5, fontFamily: 'Fraunces, Georgia, serif' }}>
                Seu sistema solar
              </h1>
            </div>

            {/* métricas principais */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              <MetricCard label="Potência do Sistema" value={`${formatNumber(data.potencia_kwp, 2)} kWp`} accent />
              <MetricCard label="Geração Mensal" value={fmtKwh(data.geracao_mensal)} sub="estimada" />
              <MetricCard label="Consumo Mensal" value={fmtKwh(data.consumo_mensal)} sub="médio" />
              <MetricCard label="Excedente Injetado" value={fmtKwh(Math.max(0, data.excedente_kwh))} />
            </div>

            {/* equipamentos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                {
                  Icon: <InverterIcon size={90} />,
                  tipo: 'Inversor Solar',
                  modelo: `${data.qtd_inversores}× ${data.marca_inversor}`,
                  detalhe: `Potência: ${data.potencia_inversor}`,
                },
                {
                  Icon: <PanelIcon size={90} />,
                  tipo: 'Módulos Fotovoltaicos',
                  modelo: `${data.num_placas}× ${data.marca_placa}`,
                  detalhe: `Potência: ${data.potencia_placa}`,
                },
              ].map((eq, i) => (
                <div
                  key={i}
                  style={{
                    background: WHITE,
                    border: `1.5px solid ${BORDER}`,
                    borderRadius: 12,
                    padding: '20px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 20,
                    boxShadow: '0 3px 10px rgba(0,0,0,0.05)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* acento lateral */}
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: YELLOW, borderRadius: '12px 0 0 12px' }} />
                  <div style={{ flexShrink: 0, paddingLeft: 8 }}>{eq.Icon}</div>
                  <div>
                  <div style={{ fontSize: 14, color: GRAY, textTransform: 'uppercase', letterSpacing: 1.3, fontFamily: 'Inter, Arial, sans-serif', fontWeight: 600, marginBottom: 6 }}>
                      {eq.tipo}
                    </div>
                    <div style={{ fontSize: 31, fontWeight: 700, color: OLIVE_DARK, lineHeight: 1.1, fontFamily: 'Fraunces, Georgia, serif' }}>
                      {eq.modelo}
                    </div>
                    <div style={{ fontSize: 18, color: GRAY, marginTop: 8, fontFamily: 'Inter, Arial, sans-serif' }}>
                      {eq.detalhe}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* gráfico */}
            <div style={{
              background: WHITE,
              border: `1.5px solid ${BORDER}`,
              borderRadius: 12,
              padding: '18px 20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <SectionLabel>Geração × Consumo — 12 meses</SectionLabel>
                  <div style={{ fontSize: 16, color: GRAY, marginTop: -2, fontFamily: 'Inter, Arial, sans-serif' }}>
                    Estimativa mensal com base na irradiância da sua cidade
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 18, fontSize: 16, fontFamily: 'Inter, Arial, sans-serif', paddingTop: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 14, height: 14, background: OLIVE_DARK, borderRadius: 3 }} />
                    <span style={{ color: GRAY }}>Geração</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 14, height: 14, background: YELLOW, borderRadius: 3 }} />
                    <span style={{ color: GRAY }}>Consumo</span>
                  </div>
                </div>
              </div>
              <GeracaoConsumoChart data={data.dados_mensais} />
            </div>

            {/* diferenciais */}
            <div>
              <SectionLabel>Nossos Diferenciais</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 4 }}>
                {DIFF_ICONS.map(({ Icon, title, text }, i) => (
                  <div
                    key={i}
                    style={{
                      background: i < 4 ? LIGHT : WHITE,
                      border: `1.5px solid ${BORDER}`,
                      borderRadius: 12,
                      padding: '18px 16px',
                      textAlign: 'center',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div style={{
                      width: 52, height: 52, borderRadius: '50%',
                      background: YELLOW, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 10px',
                      boxShadow: '0 3px 10px rgba(232,184,75,0.35)',
                    }}>
                      <Icon size={27} color={OLIVE_DARK} strokeWidth={2.2} />
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: OLIVE_DARK, marginBottom: 6, lineHeight: 1.3, fontFamily: 'Inter, Arial, sans-serif' }}>
                      {title}
                    </div>
                    <div style={{ fontSize: 14, color: GRAY, lineHeight: 1.5, fontFamily: 'Inter, Arial, sans-serif' }}>{text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <Footer />
        </Page>


        {/* ══════════════════════════════════════════════════════
            PÁGINA 3.5 — ESCOPO & OBSERVAÇÕES (só aparece se houver conteúdo)
        ══════════════════════════════════════════════════════ */}
        {((data.escopo_incluso && data.escopo_incluso.length > 0) ||
          (data.escopo_excluido && data.escopo_excluido.length > 0) ||
          data.observacoes) && (
          <Page>
            <Header numero={data.numero_proposta} />
            <div style={{ padding: '30px 52px 100px', display: 'flex', flexDirection: 'column', gap: 26 }}>
              {(data.escopo_incluso?.length || data.escopo_excluido?.length) ? (
                <div>
                  <SectionLabel>Escopo do Fornecimento</SectionLabel>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 4 }}>
                    <div style={{ border: `1.5px solid ${BORDER}`, borderRadius: 12, padding: '18px 20px', background: LIGHT }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: OLIVE_DARK, marginBottom: 10, fontFamily: 'Inter, Arial, sans-serif', textTransform: 'uppercase', letterSpacing: 1 }}>
                        Incluso
                      </div>
                      {(data.escopo_incluso || []).map((item, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                          <Check size={15} color={OLIVE_DARK} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 2 }} />
                          <span style={{ fontSize: 14, color: GRAY, fontFamily: 'Inter, Arial, sans-serif', lineHeight: 1.4 }}>{item}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ border: `1.5px solid ${BORDER}`, borderRadius: 12, padding: '18px 20px', background: WHITE }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: GRAY_LIGHT, marginBottom: 10, fontFamily: 'Inter, Arial, sans-serif', textTransform: 'uppercase', letterSpacing: 1 }}>
                        Não Incluso
                      </div>
                      {(data.escopo_excluido || []).map((item, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                          <X size={15} color={GRAY_LIGHT} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 2 }} />
                          <span style={{ fontSize: 14, color: GRAY_LIGHT, fontFamily: 'Inter, Arial, sans-serif', lineHeight: 1.4 }}>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {data.observacoes && (
                <div>
                  <SectionLabel>Observações e Condições Especiais</SectionLabel>
                  <div style={{
                    fontSize: 14, color: GRAY, fontFamily: 'Fraunces, Georgia, serif', lineHeight: 1.7,
                    whiteSpace: 'pre-wrap', border: `1.5px solid ${BORDER}`, borderRadius: 12, padding: '18px 20px',
                  }}>
                    {data.observacoes}
                  </div>
                </div>
              )}
            </div>
            <Footer />
          </Page>
        )}

        {/* ══════════════════════════════════════════════════════
            PÁGINA 4 — INVESTIMENTO + FLUXO DE CAIXA
        ══════════════════════════════════════════════════════ */}
        <Page>
          <Header numero={data.numero_proposta} />
          <div style={{ padding: '30px 52px 100px', display: 'flex', flexDirection: 'column', gap: 22 }}>

            {/* condições de pagamento */}
            <div>
              <SectionLabel>Investimento</SectionLabel>
              <h1 style={{ fontSize: 30, color: OLIVE_DARK, margin: '0 0 16px', fontWeight: 700, letterSpacing: -0.5, fontFamily: 'Fraunces, Georgia, serif' }}>
                Condições de pagamento
              </h1>

              {/* à vista */}
              <div style={{
                background: `linear-gradient(135deg, ${OLIVE_DARK} 0%, ${OLIVE} 100%)`,
                color: WHITE,
                padding: '22px 30px',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 6px 20px rgba(74,90,42,0.28)',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', right: -20, bottom: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(232,184,75,0.15)' }} />
                <div>
                  <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.8, fontFamily: 'Inter, Arial, sans-serif', fontWeight: 600 }}>
                    Pagamento à Vista
                  </div>
                  <div style={{ fontSize: 46, fontWeight: 700, marginTop: 4, fontFamily: 'Inter, Arial, sans-serif', letterSpacing: -0.5 }}>
                    R$ {fmtMoney(data.preco_vista)}
                  </div>
                </div>
                <div style={{
                  background: YELLOW,
                  color: DARK,
                  padding: '10px 22px',
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: 'Inter, Arial, sans-serif',
                  letterSpacing: 0.5,
                }}>
                  Pix · Transferência · Boleto
                </div>
              </div>

              {/* financiamento */}
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <SectionLabel>Financiamento Bancário</SectionLabel>
                  <span style={{ fontSize: 11, color: GRAY_LIGHT, fontStyle: 'italic', fontFamily: 'Inter, Arial, sans-serif' }}>*valores aproximados</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                  {parcelas.map((p) => (
                    <div
                      key={p.label}
                      style={{
                        background: LIGHT,
                        border: `2px solid ${OLIVE_DARK}`,
                        borderRadius: 12,
                        padding: '14px 10px',
                        textAlign: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: OLIVE_DARK }} />
                      <div style={{ fontSize: 28, fontWeight: 700, color: OLIVE_DARK, lineHeight: 1, fontFamily: 'Inter, Arial, sans-serif' }}>
                        {p.label}
                      </div>
                      <div style={{ fontSize: 11, color: GRAY_LIGHT, margin: '3px 0', fontFamily: 'Inter, Arial, sans-serif' }}>de</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: DARK, fontFamily: 'Inter, Arial, sans-serif' }}>
                        R$ {fmtMoney(p.value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* cartão de crédito — resumo compacto (evita grade de 18 caixinhas) */}
              {data.cartao_parcelas && data.cartao_parcelas.length > 0 && (() => {
                const destaque = [3, 6, 12, 18]
                  .map(n => data.cartao_parcelas.find(c => c.meses === n))
                  .filter((c): c is { meses: number; valor: number } => !!c);
                const lista = destaque.length > 0 ? destaque : data.cartao_parcelas.slice(0, 4);
                return (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ marginBottom: 10 }}>
                      <SectionLabel>Cartão de Crédito</SectionLabel>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${lista.length}, 1fr)`, gap: 12 }}>
                      {lista.map((c) => (
                        <div
                          key={c.meses}
                          style={{
                            background: YELLOW_LIGHT,
                            border: `1.5px solid ${YELLOW}`,
                            borderRadius: 10,
                            padding: '14px 10px',
                            textAlign: 'center',
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                        >
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: YELLOW }} />
                          <div style={{ fontSize: 24, fontWeight: 700, color: DARK, lineHeight: 1, fontFamily: 'Fraunces, Georgia, serif' }}>
                            {c.meses}x
                          </div>
                          <div style={{ fontSize: 11, color: GRAY_LIGHT, margin: '4px 0', fontFamily: 'Inter, Arial, sans-serif' }}>de</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: OLIVE_DARK, fontFamily: 'Inter, Arial, sans-serif' }}>
                            R$ {fmtMoney(c.valor)}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: 11.5, color: GRAY_LIGHT, marginTop: 8, fontFamily: 'Inter, Arial, sans-serif' }}>
                      Outras opções de parcelamento (1x a 18x) disponíveis — consulte seu representante.
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* payback destaque */}
            <div style={{
              background: `linear-gradient(135deg, ${OLIVE_DARK} 0%, ${OLIVE_MID} 100%)`,
              borderRadius: 14,
              padding: '26px 36px',
              color: WHITE,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 8px 28px rgba(74,90,42,0.28)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* círculo decorativo */}
              <div style={{ position: 'absolute', right: -30, top: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(232,184,75,0.12)' }} />
              <div style={{ position: 'absolute', right: 40, bottom: -50, width: 120, height: 120, borderRadius: '50%', background: 'rgba(232,184,75,0.08)' }} />
              <div>
                <div style={{ fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', opacity: 0.75, fontFamily: 'Inter, Arial, sans-serif', fontWeight: 600 }}>
                  Retorno do Investimento
                </div>
                <div style={{ fontSize: 52, fontWeight: 700, marginTop: 4, lineHeight: 1, fontFamily: 'Inter, Arial, sans-serif', transform: 'translateY(-22px)' }}>
                  {formatNumber(data.payback_anos, 1)} <span style={{ fontSize: 26, fontWeight: 400 }}>anos</span>
                </div>
                <div style={{ fontSize: 13, opacity: 0.75, marginTop: 6, fontFamily: 'Inter, Arial, sans-serif' }}>
                  Payback estimado do sistema
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.7, fontFamily: 'Inter, Arial, sans-serif', fontWeight: 600 }}>
                  Economia Mensal
                </div>
                <div style={{ fontSize: 36, fontWeight: 700, color: YELLOW, marginTop: 4, fontFamily: 'Inter, Arial, sans-serif' }}>
                  R$ {fmtMoney(data.economia_mensal)}
                </div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4, fontFamily: 'Inter, Arial, sans-serif' }}>
                  Tarifa: R$ {formatNumber(data.tarifa_kwh, 4)}/kWh
                </div>
              </div>
            </div>


            {/* fluxo de caixa */}
            <div>
              <SectionLabel>Projeção Financeira</SectionLabel>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <h2 style={{ fontSize: 22, color: OLIVE_DARK, margin: 0, fontWeight: 700, fontFamily: 'Fraunces, Georgia, serif' }}>
                  Fluxo de caixa acumulado
                </h2>
                <div style={{ fontSize: 11, color: GRAY, fontFamily: 'Inter, Arial, sans-serif', fontStyle: 'italic' }}>
                  Conta atual de luz × investir em energia solar
                </div>
              </div>

              <div style={{ border: `1.5px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden', fontSize: 13, fontFamily: 'Inter, Arial, sans-serif' }}>
                {/* cabeçalho */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1.4fr 1.4fr 1.3fr',
                  background: OLIVE_DARK,
                  color: WHITE,
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: 0.5,
                }}>
                  {['Período', 'Sem energia solar', 'Com energia solar', 'Economia acumulada'].map((h, i) => (
                    <div key={i} style={{ padding: '14px 18px', borderRight: i < 3 ? '1px solid rgba(255,255,255,0.12)' : 'none' }}>
                      {h}
                    </div>
                  ))}
                </div>
                {/* linhas */}
                {data.fluxo_caixa.map((row, i) => (
                  <div
                    key={row.year}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1.4fr 1.4fr 1.3fr',
                      background: i % 2 === 0 ? WHITE : LIGHT,
                      borderTop: `1px solid ${BORDER}`,
                    }}
                  >
                    <div style={{ padding: '13px 18px', fontWeight: 700, color: OLIVE_DARK, borderRight: `1px solid ${BORDER}` }}>
                      {row.year} anos
                    </div>
                    <div style={{ padding: '13px 18px', color: '#b03535', borderRight: `1px solid ${BORDER}` }}>
                      R$ {fmtMoney(row.semSolar)}
                    </div>
                    <div style={{ padding: '13px 18px', color: DARK, borderRight: `1px solid ${BORDER}` }}>
                      R$ {fmtMoney(row.comSolar)}
                    </div>
                    <div style={{ padding: '13px 18px', fontWeight: 700, color: OLIVE_DARK }}>
                      <span style={{ color: '#2a8a2a' }}>↑</span> R$ {fmtMoney(row.economia)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA final */}
            <div style={{
              background: `linear-gradient(135deg, ${OLIVE_DARK} 0%, ${OLIVE_MID} 100%)`,
              borderRadius: 14,
              padding: '28px 40px',
              color: WHITE,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 6px 22px rgba(74,90,42,0.25)',
              marginTop: 4,
            }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Fraunces, Georgia, serif', lineHeight: 1.2 }}>
                  Pronto para começar?
                </div>
                <div style={{ fontSize: 14, opacity: 0.85, marginTop: 5, fontFamily: 'Inter, Arial, sans-serif' }}>
                  Entre em contato e dê o próximo passo rumo à independência energética.
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: YELLOW, fontFamily: 'Inter, Arial, sans-serif' }}>
                  {data.responsavel_telefone || '(67) 99644-8995'}
                </div>
                <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4, fontFamily: 'Inter, Arial, sans-serif' }}>
                  {data.responsavel_nome || 'Três Lagoas Solar'}
                </div>
                {data.responsavel_email && (
                  <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2, fontFamily: 'Inter, Arial, sans-serif' }}>
                    {data.responsavel_email}
                  </div>
                )}
              </div>
            </div>
          </div>
          <Footer />
        </Page>

        {/* ══════════════════════════════════════════════════════
            PÁGINA 5 — GALERIA DE INSTALAÇÕES
        ══════════════════════════════════════════════════════ */}
        <Page>
          <Header numero={data.numero_proposta} />
          <div style={{ padding: '30px 52px 90px', display: 'flex', flexDirection: 'column', height: PAGE_H - 110 - 60, boxSizing: 'border-box' }}>
            <SectionLabel>Nossas Instalações</SectionLabel>
            <h1 style={{ fontSize: 30, color: OLIVE_DARK, margin: '0 0 6px', fontWeight: 700, letterSpacing: -0.5, fontFamily: 'Fraunces, Georgia, serif' }}>
              Qualidade em cada detalhe
            </h1>
            <div style={{ fontSize: 14, color: GRAY, fontFamily: 'Inter, Arial, sans-serif', marginBottom: 16 }}>
              Instalações reais executadas pela equipe Três Lagoas Solar — acabamento padronizado,
              infraestrutura elétrica organizada e equipamentos de marcas homologadas.
            </div>
            <div style={{
              flex: 1,
              border: `1.5px solid ${BORDER}`,
              borderRadius: 14,
              background: LIGHT,
              padding: 14,
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}>
              <img
                src={instalacoesImg}
                alt="Instalações Três Lagoas Solar"
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 10, display: 'block' }}
              />
            </div>
          </div>
          <Footer />
        </Page>

      </div>
    );

  },
);

PropostaTemplatePages.displayName = 'PropostaTemplatePages';
