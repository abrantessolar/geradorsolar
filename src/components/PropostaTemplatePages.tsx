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

import capaBg from '@/assets/proposta-template/capa-bg.png';
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
        fontFamily: 'Georgia, "Times New Roman", serif',
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
        height: 86,
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* faixa decorativa lateral esquerda */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 6,
        background: YELLOW,
      }} />
      <div style={{ paddingLeft: 56, paddingRight: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <img
          src={logoTls}
          alt="Três Lagoas Solar"
          crossOrigin="anonymous"
          style={{ height: 52, objectFit: 'contain' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.25)' }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, letterSpacing: 2, opacity: 0.7, textTransform: 'uppercase', fontFamily: 'Arial, sans-serif', fontWeight: 600 }}>
              Proposta Comercial
            </div>
            <div style={{ fontSize: 21, fontWeight: 700, color: YELLOW, letterSpacing: 0.5, fontFamily: 'Arial, sans-serif', marginTop: 2 }}>
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
        fontSize: 11,
        padding: '13px 50px',
        textAlign: 'center',
        boxSizing: 'border-box',
        fontFamily: 'Arial, sans-serif',
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
        fontFamily: 'Arial, sans-serif',
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
        fontSize: 10,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        color: accent ? 'rgba(255,255,255,0.75)' : GRAY_LIGHT,
        marginBottom: 6,
        fontFamily: 'Arial, sans-serif',
        fontWeight: 600,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1, fontFamily: 'Arial, sans-serif' }}>{value}</div>
      {sub && (
        <div style={{ fontSize: 11, marginTop: 5, color: accent ? 'rgba(255,255,255,0.6)' : GRAY_LIGHT, fontFamily: 'Arial, sans-serif' }}>
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
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="80" cy="20" r="9" fill={YELLOW} />
      <g stroke={YELLOW} strokeWidth="2" strokeLinecap="round">
        <line x1="80" y1="5"  x2="80" y2="1" />
        <line x1="80" y1="39" x2="80" y2="35" />
        <line x1="95" y1="20" x2="99" y2="20" />
        <line x1="61" y1="20" x2="65" y2="20" />
        <line x1="91" y1="9"  x2="94" y2="6" />
        <line x1="66" y1="34" x2="69" y2="31" />
        <line x1="91" y1="31" x2="94" y2="34" />
        <line x1="66" y1="6"  x2="69" y2="9" />
      </g>
      <g transform="translate(6,38) skewX(-16)">
        <rect x="0" y="0" width="74" height="48" fill={OLIVE_DARK} rx="3" />
        <g stroke="#6a7a3a" strokeWidth="1" fill="#3d501f">
          <rect x="4"  y="4"  width="15" height="13" rx="1" />
          <rect x="23" y="4"  width="15" height="13" rx="1" />
          <rect x="42" y="4"  width="15" height="13" rx="1" />
          <rect x="60" y="4"  width="10" height="13" rx="1" />
          <rect x="4"  y="21" width="15" height="13" rx="1" />
          <rect x="23" y="21" width="15" height="13" rx="1" />
          <rect x="42" y="21" width="15" height="13" rx="1" />
          <rect x="60" y="21" width="10" height="13" rx="1" />
          <rect x="4"  y="32" width="66" height="12" rx="1" />
        </g>
        <line x1="2" y1="17" x2="72" y2="17" stroke="#6a7a3a" strokeWidth="0.8" />
        <line x1="2" y1="34" x2="72" y2="34" stroke="#6a7a3a" strokeWidth="0.8" />
        <line x1="19" y1="2" x2="19" y2="46" stroke="#6a7a3a" strokeWidth="0.8" />
        <line x1="38" y1="2" x2="38" y2="46" stroke="#6a7a3a" strokeWidth="0.8" />
        <line x1="57" y1="2" x2="57" y2="46" stroke="#6a7a3a" strokeWidth="0.8" />
      </g>
      <line x1="12" y1="94" x2="82" y2="94" stroke={DARK} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="28" y1="86" x2="28" y2="94" stroke={DARK} strokeWidth="2" />
      <line x1="66" y1="86" x2="66" y2="94" stroke={DARK} strokeWidth="2" />
    </svg>
  );
}

function InverterIcon({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="18" y="12" width="64" height="78" rx="7" fill={OLIVE_DARK} />
      <rect x="22" y="16" width="56" height="70" rx="5" fill={WHITE} />
      <rect x="28" y="22" width="44" height="16" rx="3" fill="#111111" />
      <rect x="32" y="26" width="24" height="2.5" fill={YELLOW} rx="1" />
      <rect x="32" y="31" width="17" height="2.5" fill={YELLOW} rx="1" />
      <circle cx="32" cy="48" r="3" fill="#22c55e" />
      <circle cx="42" cy="48" r="3" fill={YELLOW} />
      <circle cx="52" cy="48" r="3" fill="#cccccc" />
      <g stroke="#d0d0d0" strokeWidth="1.4" strokeLinecap="round">
        <line x1="28" y1="58" x2="72" y2="58" />
        <line x1="28" y1="64" x2="72" y2="64" />
        <line x1="28" y1="70" x2="72" y2="70" />
        <line x1="28" y1="76" x2="72" y2="76" />
      </g>
      <path d="M60 22 L53 36 L59 36 L54 48 L65 32 L59 32 Z" fill={YELLOW} stroke={OLIVE_DARK} strokeWidth="0.5" />
    </svg>
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
            <text x={PAD_L - 8} y={y + 5} fontSize="13" textAnchor="end"
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
            <text x={xBase + barW / 2} y={yG - 7} fontSize="12" fontWeight="700"
              textAnchor="middle" fill={OLIVE_DARK} fontFamily="Arial, sans-serif">
              {Math.round(d.geracao)}
            </text>
            {/* barra consumo */}
            <rect x={xBase + barW + 4} y={yC} width={barW} height={hC} fill={YELLOW} rx="3" />
            <text x={xBase + barW + 4 + barW / 2} y={yC - 7} fontSize="12" fontWeight="700"
              textAnchor="middle" fill={OLIVE_MID} fontFamily="Arial, sans-serif">
              {Math.round(d.consumo)}
            </text>
            {/* label mês */}
            <text x={xBase + barW + 2} y={H - PAD_B + 22} fontSize="12" fontWeight="600"
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
            PÁGINA 1 — CAPA (novo template com background ilustrado)
        ══════════════════════════════════════════════════════ */}
        <Page>
          {/* fundo ilustrado da capa (logo + título + rodapé já incluídos na arte) */}
          <img
            src={capaBg}
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

          {/* Nome do cliente + geração — sobreposto na faixa verde inferior */}
          <div style={{
            position: 'absolute',
            top: `${Math.round(PAGE_H * 0.76)}px`,      // 76%
            left: `${Math.round(PAGE_W * 0.285)}px`,    // 28.5%
            right: `${Math.round(PAGE_W * 0.03)}px`,    // 3%
            color: WHITE,
            lineHeight: 1.15,
            fontFamily: 'Arial, sans-serif',
          }}>
            <div style={{
              fontWeight: 700,
              letterSpacing: '-0.01em',
              fontSize: 40,
            }}>
              {data.cliente_nome}
            </div>
            <div style={{
              fontWeight: 400,
              fontSize: 22,
              marginTop: 8,
              opacity: 0.92,
            }}>
              {fmtKwh(data.geracao_mensal)} por mês
            </div>
          </div>

          {/* Representante — sobre o ícone "Representante:" da arte */}
          <div style={{
            position: 'absolute',
            top: `${Math.round(PAGE_H * 0.896)}px`,    // 89.6%
            left: `${Math.round(PAGE_W * 0.337)}px`,   // 33.7%
            color: OLIVE_DARK,
            fontFamily: 'Arial, sans-serif',
            lineHeight: 1.1,
          }}>
            <div style={{ fontWeight: 700, fontSize: 24, letterSpacing: '-0.01em' }}>
              {data.responsavel_nome || '—'}
            </div>
            {data.responsavel_telefone && (
              <div style={{ fontWeight: 600, fontSize: 16, marginTop: 4, opacity: 0.85 }}>
                {data.responsavel_telefone}
              </div>
            )}
          </div>
        </Page>


        {/* ══════════════════════════════════════════════════════
            PÁGINA 2 — ESPECIFICAÇÕES + GRÁFICO + DIFERENCIAIS
        ══════════════════════════════════════════════════════ */}
        <Page>
          <Header numero={data.numero_proposta} />
          <div style={{ padding: '30px 52px 100px', display: 'flex', flexDirection: 'column', gap: 22 }}>

            {/* título */}
            <div>
              <SectionLabel>Especificações do Projeto</SectionLabel>
              <h1 style={{ fontSize: 34, color: OLIVE_DARK, margin: 0, fontWeight: 700, letterSpacing: -0.5, fontFamily: 'Georgia, serif' }}>
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
                    <div style={{ fontSize: 10, color: GRAY_LIGHT, textTransform: 'uppercase', letterSpacing: 1.5, fontFamily: 'Arial, sans-serif', fontWeight: 600, marginBottom: 4 }}>
                      {eq.tipo}
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: OLIVE_DARK, lineHeight: 1.1, fontFamily: 'Georgia, serif' }}>
                      {eq.modelo}
                    </div>
                    <div style={{ fontSize: 14, color: GRAY, marginTop: 6, fontFamily: 'Arial, sans-serif' }}>
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
                  <div style={{ fontSize: 12, color: GRAY, marginTop: -4, fontFamily: 'Arial, sans-serif' }}>
                    Estimativa mensal com base na irradiância da sua cidade
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 18, fontSize: 12, fontFamily: 'Arial, sans-serif', paddingTop: 4 }}>
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
                    <div style={{ fontSize: 14, fontWeight: 700, color: OLIVE_DARK, marginBottom: 5, lineHeight: 1.3, fontFamily: 'Arial, sans-serif' }}>
                      {title}
                    </div>
                    <div style={{ fontSize: 12, color: GRAY, lineHeight: 1.5, fontFamily: 'Arial, sans-serif' }}>{text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <Footer />
        </Page>


        {/* ══════════════════════════════════════════════════════
            PÁGINA 3 — INVESTIMENTO + FLUXO DE CAIXA
        ══════════════════════════════════════════════════════ */}
        <Page>
          <Header numero={data.numero_proposta} />
          <div style={{ padding: '30px 52px 100px', display: 'flex', flexDirection: 'column', gap: 22 }}>

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
                <div style={{ fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', opacity: 0.75, fontFamily: 'Arial, sans-serif', fontWeight: 600 }}>
                  Retorno do Investimento
                </div>
                <div style={{ fontSize: 52, fontWeight: 700, marginTop: 4, lineHeight: 1, fontFamily: 'Arial, sans-serif', transform: 'translateY(-30px)' }}>
                  {formatNumber(data.payback_anos, 1)} <span style={{ fontSize: 26, fontWeight: 400 }}>anos</span>
                </div>
                <div style={{ fontSize: 13, opacity: 0.75, marginTop: 6, fontFamily: 'Arial, sans-serif' }}>
                  Payback estimado do sistema
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.7, fontFamily: 'Arial, sans-serif', fontWeight: 600 }}>
                  Economia Mensal
                </div>
                <div style={{ fontSize: 36, fontWeight: 700, color: YELLOW, marginTop: 4, fontFamily: 'Arial, sans-serif' }}>
                  R$ {fmtMoney(data.economia_mensal)}
                </div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4, fontFamily: 'Arial, sans-serif' }}>
                  Tarifa: R$ {formatNumber(data.tarifa_kwh, 4)}/kWh
                </div>
              </div>
            </div>

            {/* condições de pagamento */}
            <div>
              <SectionLabel>Investimento</SectionLabel>
              <h1 style={{ fontSize: 30, color: OLIVE_DARK, margin: '0 0 16px', fontWeight: 700, letterSpacing: -0.5, fontFamily: 'Georgia, serif' }}>
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
                  <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.8, fontFamily: 'Arial, sans-serif', fontWeight: 600 }}>
                    Pagamento à Vista
                  </div>
                  <div style={{ fontSize: 46, fontWeight: 700, marginTop: 4, fontFamily: 'Arial, sans-serif', letterSpacing: -0.5 }}>
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
                  fontFamily: 'Arial, sans-serif',
                  letterSpacing: 0.5,
                }}>
                  Pix · Transferência · Boleto
                </div>
              </div>

              {/* financiamento */}
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <SectionLabel>Financiamento Bancário</SectionLabel>
                  <span style={{ fontSize: 11, color: GRAY_LIGHT, fontStyle: 'italic', fontFamily: 'Arial, sans-serif' }}>*valores aproximados</span>
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
                      <div style={{ fontSize: 28, fontWeight: 700, color: OLIVE_DARK, lineHeight: 1, fontFamily: 'Arial, sans-serif' }}>
                        {p.label}
                      </div>
                      <div style={{ fontSize: 11, color: GRAY_LIGHT, margin: '3px 0', fontFamily: 'Arial, sans-serif' }}>de</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: DARK, fontFamily: 'Arial, sans-serif' }}>
                        R$ {fmtMoney(p.value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* cartão de crédito */}
              {data.cartao_parcelas && data.cartao_parcelas.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ marginBottom: 10 }}>
                    <SectionLabel>Cartão de Crédito</SectionLabel>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                    {data.cartao_parcelas.slice(0, 18).map((c) => (
                      <div
                        key={c.meses}
                        style={{
                          background: YELLOW_LIGHT,
                          border: `1.5px solid ${YELLOW}`,
                          borderRadius: 10,
                          padding: '10px 6px',
                          textAlign: 'center',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: YELLOW }} />
                        <div style={{ fontSize: 20, fontWeight: 700, color: DARK, lineHeight: 1, fontFamily: 'Arial, sans-serif' }}>
                          {c.meses}x
                        </div>
                        <div style={{ fontSize: 10, color: GRAY_LIGHT, margin: '2px 0', fontFamily: 'Arial, sans-serif' }}>de</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: OLIVE_DARK, fontFamily: 'Arial, sans-serif' }}>
                          R$ {fmtMoney(c.valor)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* fluxo de caixa */}
            <div>
              <SectionLabel>Projeção Financeira</SectionLabel>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <h2 style={{ fontSize: 22, color: OLIVE_DARK, margin: 0, fontWeight: 700, fontFamily: 'Georgia, serif' }}>
                  Fluxo de caixa acumulado
                </h2>
                <div style={{ fontSize: 11, color: GRAY, fontFamily: 'Arial, sans-serif', fontStyle: 'italic' }}>
                  Conta atual de luz × investir em energia solar
                </div>
              </div>

              <div style={{ border: `1.5px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden', fontSize: 13, fontFamily: 'Arial, sans-serif' }}>
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
          </div>
          <Footer />
        </Page>


        {/* ══════════════════════════════════════════════════════
            PÁGINA 4 — PORTFÓLIO
        ══════════════════════════════════════════════════════ */}
        <Page>
          <Header numero={data.numero_proposta} />
          <div style={{ padding: '32px 52px 100px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            <div>
              <SectionLabel>Nossos Projetos</SectionLabel>
              <h1 style={{ fontSize: 32, color: OLIVE_DARK, margin: '4px 0 4px', fontWeight: 700, letterSpacing: -0.5, fontFamily: 'Georgia, serif' }}>
                Alguns dos nossos projetos
              </h1>
              <div style={{ fontSize: 13, color: GRAY, fontFamily: 'Arial, sans-serif' }}>
                Quase uma década entregando energia limpa em Três Lagoas e região
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
                      color: BORDER, fontSize: 32, fontWeight: 700, fontFamily: 'Arial, sans-serif',
                    }}>
                      {i + 1}
                    </div>
                  )}
                </div>
              ))}
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
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Georgia, serif', lineHeight: 1.2 }}>
                  Pronto para começar?
                </div>
                <div style={{ fontSize: 14, opacity: 0.8, marginTop: 5, fontFamily: 'Arial, sans-serif' }}>
                  Entre em contato e dê o próximo passo rumo à independência energética.
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: YELLOW, fontFamily: 'Arial, sans-serif' }}>
                  {data.responsavel_telefone || '(67) 99644-8995'}
                </div>
                <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4, fontFamily: 'Arial, sans-serif' }}>
                  {data.responsavel_nome || 'Três Lagoas Solar'}
                </div>
              </div>
            </div>
          </div>
          <Footer />
        </Page>

      </div>
    );
  },
);

PropostaTemplatePages.displayName = 'PropostaTemplatePages';
