/**
 * Renderiza as 4 páginas da proposta em layout HTML estilizado, inspirado
 * na proposta online (cards, badges, gradientes sutis, paleta TLS).
 */
import { forwardRef } from 'react';
import logoTls from '@/assets/logo-tls-pdf.png';

// Foto da fachada da empresa (mesma usada no hero da landing/proposta online)
const FACADE_BG = 'https://static.wixstatic.com/media/c2ae0d_0fc9044d218948a585d2170345d4ce87~mv2.jpg';
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

function Page({ children }: { children?: React.ReactNode }) {
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

// ====== ÍCONES SVG inline (evitam dependência de fonte de ícones no html2canvas) ======
function PanelIcon({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      {/* sol */}
      <circle cx="78" cy="20" r="8" fill={YELLOW} />
      <g stroke={YELLOW} strokeWidth="2" strokeLinecap="round">
        <line x1="78" y1="6" x2="78" y2="2" />
        <line x1="78" y1="38" x2="78" y2="34" />
        <line x1="92" y1="20" x2="96" y2="20" />
        <line x1="60" y1="20" x2="64" y2="20" />
        <line x1="88" y1="10" x2="91" y2="7" />
        <line x1="65" y1="33" x2="68" y2="30" />
        <line x1="88" y1="30" x2="91" y2="33" />
        <line x1="65" y1="7" x2="68" y2="10" />
      </g>
      {/* painel inclinado */}
      <g transform="translate(8,38) skewX(-18)">
        <rect x="0" y="0" width="72" height="46" fill={OLIVE_DARK} rx="2" />
        {/* células */}
        <g stroke="#7a8a4a" strokeWidth="1" fill="#3a4720">
          <rect x="4" y="4" width="14" height="12" />
          <rect x="22" y="4" width="14" height="12" />
          <rect x="40" y="4" width="14" height="12" />
          <rect x="58" y="4" width="10" height="12" />
          <rect x="4" y="20" width="14" height="12" />
          <rect x="22" y="20" width="14" height="12" />
          <rect x="40" y="20" width="14" height="12" />
          <rect x="58" y="20" width="10" height="12" />
        </g>
      </g>
      {/* base */}
      <line x1="14" y1="92" x2="78" y2="92" stroke={DARK} strokeWidth="2" />
      <line x1="30" y1="84" x2="30" y2="92" stroke={DARK} strokeWidth="2" />
      <line x1="62" y1="84" x2="62" y2="92" stroke={DARK} strokeWidth="2" />
    </svg>
  );
}

function InverterIcon({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      {/* gabinete */}
      <rect x="20" y="14" width="60" height="76" rx="6" fill={OLIVE_DARK} />
      <rect x="24" y="18" width="52" height="68" rx="4" fill="#fff" />
      {/* display */}
      <rect x="30" y="24" width="40" height="14" rx="2" fill="#1a1a1a" />
      <rect x="33" y="28" width="22" height="2" fill={YELLOW} />
      <rect x="33" y="32" width="16" height="2" fill={YELLOW} />
      {/* leds */}
      <circle cx="34" cy="48" r="2.5" fill="#22c55e" />
      <circle cx="42" cy="48" r="2.5" fill={YELLOW} />
      <circle cx="50" cy="48" r="2.5" fill="#cccccc" />
      {/* grade ventilação */}
      <g stroke={GRAY} strokeWidth="1.2">
        <line x1="30" y1="58" x2="70" y2="58" />
        <line x1="30" y1="63" x2="70" y2="63" />
        <line x1="30" y1="68" x2="70" y2="68" />
        <line x1="30" y1="73" x2="70" y2="73" />
        <line x1="30" y1="78" x2="70" y2="78" />
      </g>
      {/* raio */}
      <path
        d="M58 24 L52 36 L57 36 L52 46 L62 32 L57 32 Z"
        fill={YELLOW}
        stroke={OLIVE_DARK}
        strokeWidth="0.6"
      />
    </svg>
  );
}

// ====== Gráfico de barras Geração x Consumo (SVG inline puro) ======
function GeracaoConsumoChart({ data }: { data: MonthlyRow[] }) {
  const W = 1100;
  const H = 520;
  const PAD_L = 50;
  const PAD_R = 20;
  const PAD_T = 20;
  const PAD_B = 40;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const max = Math.max(...data.flatMap((d) => [d.geracao, d.consumo]), 1);
  // arredonda max para múltiplo de 100
  const niceMax = Math.ceil(max / 100) * 100;
  const groupW = innerW / data.length;
  const barW = (groupW - 8) / 2;

  const yTicks = 5;
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => Math.round((niceMax / yTicks) * i));

  return (
    <svg width={W} height={H} xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      {/* grid horizontal */}
      {ticks.map((t, i) => {
        const y = PAD_T + innerH - (t / niceMax) * innerH;
        return (
          <g key={i}>
            <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke={BORDER} strokeWidth="1" />
            <text x={PAD_L - 6} y={y + 4} fontSize="11" textAnchor="end" fill={GRAY}>
              {t}
            </text>
          </g>
        );
      })}
      {/* barras */}
      {data.map((d, i) => {
        const xBase = PAD_L + i * groupW + 4;
        const hG = (d.geracao / niceMax) * innerH;
        const hC = (d.consumo / niceMax) * innerH;
        const yG = PAD_T + innerH - hG;
        const yC = PAD_T + innerH - hC;
        return (
          <g key={i}>
            <rect x={xBase} y={yG} width={barW} height={hG} fill={OLIVE_DARK} rx="2" />
            <text
              x={xBase + barW / 2}
              y={yG - 4}
              fontSize="10"
              fontWeight="700"
              textAnchor="middle"
              fill={OLIVE_DARK}
            >
              {Math.round(d.geracao)}
            </text>
            <rect x={xBase + barW + 2} y={yC} width={barW} height={hC} fill={YELLOW} rx="2" />
            <text
              x={xBase + barW + 2 + barW / 2}
              y={yC - 4}
              fontSize="10"
              fontWeight="700"
              textAnchor="middle"
              fill={DARK}
            >
              {Math.round(d.consumo)}
            </text>
            <text
              x={xBase + barW + 1}
              y={H - PAD_B + 16}
              fontSize="11"
              textAnchor="middle"
              fill={DARK}
            >
              {d.mes}
            </text>
          </g>
        );
      })}
      {/* eixo x */}
      <line x1={PAD_L} y1={PAD_T + innerH} x2={W - PAD_R} y2={PAD_T + innerH} stroke={DARK} strokeWidth="1" />
    </svg>
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

    const fotos = data.fotos_portfolio.slice(0, 16);
    while (fotos.length < 16) fotos.push('');

    return (
      <div ref={ref} style={{ width: `${PAGE_W}px`, background: '#fff' }}>
        {/* ============ PÁGINA 1 — CAPA (estilo hero da proposta online) ============ */}
        <Page>
          {/* Imagem de capa com overlay */}
          <img
            src={FACADE_BG}
            alt=""
            crossOrigin="anonymous"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '62%',
              objectFit: 'cover',
              objectPosition: 'center',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '78%',
              background: `linear-gradient(180deg, rgba(74,90,42,0.78) 0%, rgba(74,90,42,0.55) 45%, rgba(74,90,42,0.88) 78%, rgba(255,255,255,1) 100%)`,
            }}
          />

          {/* Logo + número */}
          <div
            style={{
              position: 'absolute',
              top: 60,
              left: 80,
              right: 80,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#fff',
            }}
          >
            <img
              src={logoTls}
              alt="Três Lagoas Solar"
              crossOrigin="anonymous"
              style={{ height: 225, objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))' }}
            />
            <div
              style={{
                background: YELLOW,
                color: DARK,
                fontWeight: 700,
                fontSize: 14,
                padding: '8px 18px',
                borderRadius: 999,
                letterSpacing: 1,
              }}
            >
              {data.numero_proposta}
            </div>
          </div>

          {/* Título no hero */}
          <div
            style={{
              position: 'absolute',
              top: 520,
              left: 80,
              right: 80,
              color: '#fff',
              textShadow: '0 2px 12px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ fontSize: 16, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.92 }}>
              Proposta Comercial Personalizada
            </div>
            <h1 style={{ fontSize: 64, fontWeight: 700, margin: '14px 0 0', lineHeight: 1.05, letterSpacing: -1 }}>
              Sua usina solar
            </h1>
            <div style={{ fontSize: 28, marginTop: 6, opacity: 0.95, fontWeight: 300 }}>
              começa por aqui, <strong style={{ color: YELLOW, fontWeight: 700 }}>{(data.cliente_nome || '').split(' ')[0]}</strong>
            </div>
          </div>

          {/* Card branco grande com resumo (como no hero da proposta online) */}
          <div
            style={{
              position: 'absolute',
              top: 1230,
              left: 80,
              right: 80,
              background: '#fff',
              borderRadius: 14,
              boxShadow: '0 10px 40px rgba(0,0,0,0.18)',
              padding: '32px 40px',
              border: `1px solid ${BORDER}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 30 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: GRAY }}>
                  Cliente
                </div>
                <div style={{ fontSize: 34, fontWeight: 700, color: OLIVE_DARK, marginTop: 4, lineHeight: 1.1 }}>
                  {data.cliente_nome}
                </div>
                {data.cliente_cidade && (
                  <div style={{ fontSize: 16, color: GRAY, marginTop: 4 }}>{data.cliente_cidade}</div>
                )}
                <div style={{ marginTop: 22 }}>
                  <div style={{ fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: GRAY }}>
                    Seu Consultor
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: DARK, marginTop: 4, lineHeight: 1.2 }}>
                    {data.responsavel_nome || '—'}
                  </div>
                  {data.responsavel_telefone && (
                    <div style={{ fontSize: 16, color: OLIVE_DARK, marginTop: 4, fontWeight: 600 }}>
                      📱 {data.responsavel_telefone}
                    </div>
                  )}
                  {data.responsavel_email && (
                    <div style={{ fontSize: 14, color: GRAY, marginTop: 2 }}>
                      {data.responsavel_email}
                    </div>
                  )}
                </div>
              </div>
              <div
                style={{
                  width: 280,
                  background: LIGHT,
                  borderLeft: `4px solid ${YELLOW}`,
                  padding: 18,
                  borderRadius: 8,
                }}
              >
                <div style={{ fontSize: 11, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  Sistema dimensionado
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, color: OLIVE_DARK, marginTop: 4, lineHeight: 1 }}>
                  {formatNumber(data.potencia_kwp, 2)} kWp
                </div>
                <div style={{ fontSize: 13, color: DARK, marginTop: 14 }}>
                  <strong>{data.num_placas}</strong> placas solares
                </div>
                <div style={{ fontSize: 13, color: DARK, marginTop: 4 }}>
                  Geração: <strong>{fmtKwh(data.geracao_mensal)}/mês</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Rodapé da capa */}
          <div
            style={{
              position: 'absolute',
              bottom: 60,
              left: 80,
              right: 80,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              color: DARK,
              fontSize: 13,
            }}
          >
            <div>
              <div style={{ color: GRAY, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Emitida em</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2, color: OLIVE_DARK }}>{today()}</div>
            </div>
            <div style={{ textAlign: 'center', color: GRAY, fontSize: 11 }}>
              www.treslagoassolar.com.br
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: GRAY, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Consultor</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2, color: OLIVE_DARK }}>
                {data.responsavel_nome || '—'}
              </div>
            </div>
          </div>
        </Page>

        {/* ============ PÁGINA 2 — DADOS + GRÁFICO + INVESTIMENTO ============ */}
        <Page>
          <Header numero={data.numero_proposta} />
          <div style={{ padding: '28px 50px 100px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <Badge>Especificações do Projeto</Badge>
              <h1 style={{ fontSize: 32, color: OLIVE_DARK, margin: '10px 0 0', fontWeight: 700, letterSpacing: -0.5 }}>
                Seu sistema solar
              </h1>
            </div>

            {/* Métricas principais */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <MetricCard label="Potência" value={`${formatNumber(data.potencia_kwp, 2)} kWp`} accent />
              <MetricCard label="Geração mensal" value={fmtKwh(data.geracao_mensal)} />
              <MetricCard label="Consumo mensal" value={fmtKwh(data.consumo_mensal)} />
              <MetricCard label="Excedente" value={fmtKwh(Math.max(0, data.excedente_kwh))} />
            </div>

            {/* Equipamentos — em destaque com ícones */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div
                style={{
                  background: '#fff',
                  border: `2px solid ${OLIVE_DARK}`,
                  borderRadius: 12,
                  padding: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                }}
              >
                <div style={{ flexShrink: 0 }}>
                  <InverterIcon size={88} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
                    Inversor
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: OLIVE_DARK, lineHeight: 1.1 }}>
                    {data.qtd_inversores}× {data.marca_inversor}
                  </div>
                  <div style={{ fontSize: 16, color: DARK, marginTop: 6 }}>
                    Potência: <strong>{data.potencia_inversor}</strong>
                  </div>
                </div>
              </div>
              <div
                style={{
                  background: '#fff',
                  border: `2px solid ${OLIVE_DARK}`,
                  borderRadius: 12,
                  padding: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                }}
              >
                <div style={{ flexShrink: 0 }}>
                  <PanelIcon size={88} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
                    Placas Solares
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: OLIVE_DARK, lineHeight: 1.1 }}>
                    {data.num_placas}× {data.marca_placa}
                  </div>
                  <div style={{ fontSize: 16, color: DARK, marginTop: 6 }}>
                    Potência: <strong>{data.potencia_placa}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Gráfico Geração x Consumo */}
            <div
              style={{
                background: '#fff',
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                padding: 16,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: OLIVE_DARK }}>
                    Geração × Consumo — 12 meses
                  </div>
                  <div style={{ fontSize: 12, color: GRAY, marginTop: 2 }}>
                    Estimativa mensal com base na irradiância da sua cidade
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 14, height: 14, background: OLIVE_DARK, borderRadius: 2 }} />
                    Geração
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 14, height: 14, background: YELLOW, borderRadius: 2 }} />
                    Consumo
                  </div>
                </div>
              </div>
              <GeracaoConsumoChart data={data.dados_mensais} />
            </div>

            {/* Diferenciais */}
            <div>
              <Badge>Nossos Diferenciais</Badge>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 12 }}>
                {DIFF_ICONS.map(({ Icon, title, text }, i) => (
                  <div
                    key={i}
                    style={{
                      background: '#fff',
                      border: `1px solid ${BORDER}`,
                      borderRadius: 12,
                      padding: 18,
                      textAlign: 'center',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                    }}
                  >
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 999,
                        background: YELLOW,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 10px',
                      }}
                    >
                      <Icon size={30} color={OLIVE_DARK} strokeWidth={2.2} />
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: OLIVE_DARK, marginBottom: 6, lineHeight: 1.25 }}>
                      {title}
                    </div>
                    <div style={{ fontSize: 14, color: GRAY, lineHeight: 1.45 }}>{text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <Footer />
        </Page>

        {/* ============ PÁGINA 3 — INVESTIMENTO + FLUXO DE CAIXA ============ */}
        <Page>
          <Header numero={data.numero_proposta} />
          <div style={{ padding: '28px 50px 100px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Retorno do investimento */}
            <div style={{ background: LIGHT, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 14, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                Retorno do investimento
              </div>
              <div style={{ fontSize: 34, fontWeight: 700, color: OLIVE_DARK, marginTop: 6 }}>
                {formatNumber(data.payback_anos, 1)} anos
              </div>
              <div style={{ fontSize: 13, color: GRAY, marginTop: 4 }}>
                Payback estimado do sistema
              </div>
            </div>

            {/* Investimento */}
            <div>
              <Badge>Investimento</Badge>
              <h1 style={{ fontSize: 28, color: OLIVE_DARK, margin: '10px 0 12px', fontWeight: 700, letterSpacing: -0.5 }}>
                Condições de pagamento
              </h1>

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
                  <div style={{ fontSize: 30, fontWeight: 700, marginTop: 2 }}>
                    R$ {fmtMoney(data.preco_vista)}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 12, opacity: 0.85, lineHeight: 1.4 }}>
                  Pix, transferência<br />ou boleto
                </div>
              </div>

              {/* Financiamento */}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: OLIVE_DARK, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                  Financiamento
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                  {parcelas.map((p) => (
                    <div
                      key={p.label}
                      style={{
                        background: '#fff',
                        border: `2px solid ${OLIVE_DARK}`,
                        borderRadius: 10,
                        padding: '12px 8px',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: 22, fontWeight: 700, color: GRAY, lineHeight: 1 }}>
                        {p.label}
                      </div>
                      <div style={{ fontSize: 11, color: GRAY, marginTop: 2 }}>de</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: OLIVE_DARK, marginTop: 2 }}>
                        R$ {fmtMoney(p.value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cartão de crédito */}
              {data.cartao_parcelas && data.cartao_parcelas.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: OLIVE_DARK, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                    Cartão de crédito
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(6, 1fr)',
                      gap: 8,
                    }}
                  >
                    {data.cartao_parcelas.slice(0, 18).map((c) => (
                      <div
                        key={c.meses}
                        style={{
                          background: LIGHT,
                          border: `2px solid ${YELLOW}`,
                          borderRadius: 8,
                          padding: '8px 6px',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: 17, fontWeight: 700, color: GRAY, lineHeight: 1 }}>
                          {c.meses}x
                        </div>
                        <div style={{ fontSize: 10, color: GRAY, marginTop: 1 }}>de</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: OLIVE_DARK, marginTop: 2 }}>
                          R$ {fmtMoney(c.valor)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Fluxo de caixa */}
            <div>
              <Badge>Projeção Financeira</Badge>
              <h2 style={{ fontSize: 22, color: OLIVE_DARK, margin: '10px 0 4px', fontWeight: 700 }}>
                Fluxo de caixa acumulado
              </h2>
              <div style={{ fontSize: 12, color: GRAY, marginBottom: 10 }}>
                Comparação entre continuar pagando a conta atual de luz × investir em energia solar
              </div>

              <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden', fontSize: 13 }}>
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
                  <div style={{ padding: '14px 16px', fontWeight: 700, color: OLIVE_DARK }}>
                    {row.year} anos
                  </div>
                  <div style={{ padding: '14px 16px', color: '#a13a3a' }}>R$ {fmtMoney(row.semSolar)}</div>
                  <div style={{ padding: '14px 16px' }}>R$ {fmtMoney(row.comSolar)}</div>
                  <div style={{ padding: '14px 16px', fontWeight: 700, color: OLIVE_DARK }}>
                    R$ {fmtMoney(row.economia)}
                  </div>
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
                Quase uma década entregando energia limpa em Três Lagoas e região
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
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
