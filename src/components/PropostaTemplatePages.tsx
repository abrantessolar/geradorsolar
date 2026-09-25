/**
 * Renderiza as 5 páginas da proposta comercial da Três Lagoas Solar.
 *
 * RESTRIÇÕES html2canvas:
 * - Apenas estilos inline (sem CSS externo, sem Tailwind, sem classes)
 * - Sem CSS grid, sem writing-mode, sem background-image escalado:
 *   usar flexbox, transform:rotate e <img> posicionado
 * - Tamanho fixo: 1241 × 1755 px por página (A4 a 150 dpi)
 * - Paleta TLS: verde musgo #4A5A2A, dourado #E8B84B
 *
 * Páginas: 1 Capa · 2 Clientes · 3 Geração x consumo e investimento
 *          4 Antes e depois · 5 A empresa
 */
import { forwardRef } from 'react';

import logoColor from '@/assets/proposta-template/logo-tls-color.png';
import capaIlustracao from '@/assets/proposta-template/capa-ilustracao.jpg';
import mapaImg from '@/assets/proposta-template/mapa-localizacao.jpg';
import faturaImg from '@/assets/proposta-template/fatura-elektro.png';
import fachadaImg from '@/assets/proposta-template/fachada-empresa.jpg';
import instalacoesImg from '@/assets/proposta-template/instalacoes.jpg';
import inversorFallback from '@/assets/proposta-template/inversor.png';
import moduloFallback from '@/assets/proposta-template/modulo.png';

import { formatCurrency, formatNumber } from '@/data/calculations';

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
  /** Opcional: proposta antiga sem o campo simplesmente não mostra a marcação (mesmo visual de antes). */
  consumoEstimado?: boolean;
}

export interface PropostaTemplateData {
  cliente_nome: string;
  cliente_cidade?: string;
  responsavel_nome: string;
  responsavel_telefone?: string;
  responsavel_email?: string;
  geracao_mensal: number;
  consumo_mensal: number;
  /** Consumo informado na conta de luz do cliente, sem os acréscimos de equipamentos adicionais — usado no cálculo da fatura (Antes e Depois). */
  consumo_informado: number;
  excedente_kwh: number;
  potencia_kwp: number;
  qtd_inversores: number;
  marca_inversor: string;
  potencia_inversor: string;
  num_placas: number;
  marca_placa: string;
  potencia_placa: string;
  imagem_inversor?: string;
  imagem_placa?: string;
  usa_microinversor?: boolean;
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
}

// ────────────────────────────────────────────────────────────
// Escala: A4 a 150 dpi
// ────────────────────────────────────────────────────────────
const PAGE_W = 1241;
const PAGE_H = 1755;

/** milímetros → px na página */
const mm = (v: number) => Math.round(v * (PAGE_W / 210) * 100) / 100;
/** px do mockup (A4 a 96 dpi) → px na página */
const fs = (v: number) => Math.round(v * (PAGE_W / 793.7) * 10) / 10;

const VERDE     = '#4A5A2A';
const OURO      = '#E8B84B';
const OURO_ESC  = '#9C7412';
const CREME     = '#F7F4EC';
const LINHA     = '#DED7C6';
const TEXTO     = '#232717';
const MUTED     = '#6F7360';
const WHITE     = '#ffffff';
const VERDE_ESC = '#2F3A1A';
const VERDE_FAT = '#01A556'; // verde da fatura da concessionária

const FONT = 'Inter, Arial, Helvetica, sans-serif';
const DISPLAY = '"Bricolage Grotesque", Inter, Arial, sans-serif';

const fmtInt   = (n: number) => formatNumber(n, 0);
const fmtMoney = (n: number) => formatCurrency(n);
const hoje = () => new Date().toLocaleDateString('pt-BR');

// Escopo fixo — não vem da proposta
const ESCOPO_INCLUSO = [
  'Visita técnica e análise 3D com drone',
  'Projeto elétrico com ART do responsável técnico',
  'Homologação do projeto na concessionária',
  'Todos os equipamentos e materiais de instalação',
  'Instalação, comissionamento e testes',
  'Monitoramento configurado com app nativo do inversor',
  'Acompanhamento do sistema por 3 anos pelo nosso setor de pós-venda',
  'Garantia total da Três Lagoas Solar por 3 anos',
];

const ENDERECO = {
  rua: 'Rua Luiz Correa da Silveira, 934',
  bairro: 'Jardim Alvorada',
  cidade: 'Três Lagoas / MS · 79610-060',
  horario1: 'Seg a sex, 7h–11h e 13h–17h',
  horario2: 'Sáb, 8h–12h',
  telefone: '(67) 99644-8995',
  email: 'contato@treslagoassolar.com.br',
  instagram: '@treslagoassolar',
  site: 'www.treslagoassolar.com.br',
  cnpj: 'CNPJ 39.369.943/0001-21',
};

// ────────────────────────────────────────────────────────────
// Blocos de layout
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
        fontFamily: FONT,
        color: TEXTO,
        display: 'flex',
        flexDirection: 'column',
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
        flexShrink: 0,
        height: `${mm(17)}px`,
        padding: `0 ${mm(16)}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${LINHA}`,
      }}
    >
      <img src={logoColor} crossOrigin="anonymous" alt="Três Lagoas Solar"
           style={{ height: `${mm(9)}px`, width: 'auto', display: 'block' }} />
      <div style={{ textAlign: 'right', fontSize: `${fs(10.2)}px`, color: MUTED, lineHeight: 1.5 }}>
        Proposta
        <b style={{ display: 'block', fontSize: `${fs(12.7)}px`, color: VERDE, fontWeight: 600 }}>{numero}</b>
      </div>
    </div>
  );
}

function Footer({ num }: { num: string }) {
  return (
    <div
      style={{
        flexShrink: 0,
        height: `${mm(13)}px`,
        padding: `0 ${mm(16)}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTop: `1px solid ${LINHA}`,
        fontSize: `${fs(9.7)}px`,
        color: MUTED,
      }}
    >
      <span>Três Lagoas Solar · Três Lagoas, MS · {ENDERECO.cnpj}</span>
      <span style={{ fontWeight: 600, color: VERDE, fontSize: `${fs(10.7)}px` }}>{num}</span>
    </div>
  );
}

function Body({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ flex: 1, minHeight: 0, padding: `${mm(9)}px ${mm(16)}px 0`, ...style }}>
      {children}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: `${fs(10.7)}px`, color: OURO_ESC, fontWeight: 600, marginBottom: `${fs(5)}px` }}>
      {children}
    </div>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: DISPLAY, fontSize: `${fs(25)}px`, fontWeight: 600, color: VERDE,
      lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: `${mm(3)}px`,
    }}>
      {children}
    </div>
  );
}

function H3({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      fontFamily: DISPLAY, fontSize: `${fs(15.2)}px`, fontWeight: 600, color: VERDE,
      letterSpacing: '-0.02em', marginBottom: `${mm(2.5)}px`, ...style,
    }}>
      {children}
    </div>
  );
}

function Stat({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div style={{ flex: 1, borderLeft: `2px solid ${OURO}`, paddingLeft: `${mm(3.5)}px` }}>
      <div style={{
        fontFamily: DISPLAY, fontSize: `${fs(22)}px`, fontWeight: 600, color: VERDE,
        lineHeight: 1.1, letterSpacing: '-0.02em',
      }}>{valor}</div>
      <div style={{ fontSize: `${fs(11.7)}px`, color: MUTED, marginTop: `${fs(3)}px` }}>{rotulo}</div>
    </div>
  );
}

function Row({ label, value, last }: { label: React.ReactNode; value: React.ReactNode; last?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: `${mm(2.2)}px 0`, borderBottom: last ? 'none' : '1px solid #F0ECE2',
      fontSize: `${fs(13.2)}px`, gap: `${mm(6)}px`,
    }}>
      <span style={{ color: TEXTO }}>{label}</span>
      <span style={{ fontWeight: 600, color: VERDE, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: `${fs(11.7)}px`, fontWeight: 600, color: MUTED,
      paddingBottom: `${mm(2.5)}px`, borderBottom: `1px solid ${LINHA}`,
    }}>{children}</div>
  );
}

function Check({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: 'relative', paddingLeft: `${mm(5.5)}px`, marginBottom: `${mm(1.4)}px`,
      fontSize: `${fs(13.2)}px`, lineHeight: 1.7,
    }}>
      <span style={{
        position: 'absolute', left: 0, top: `${fs(7)}px`, width: `${fs(6)}px`, height: `${fs(6)}px`,
        borderRadius: '1px', background: OURO, display: 'block',
      }} />
      {children}
    </div>
  );
}

function EquipmentBox({ img, fallbackImg, linha1, linha2 }: { img?: string; fallbackImg: string; linha1: string; linha2: string }) {
  return (
    <div style={{
      flex: 1, border: `1px solid ${LINHA}`, borderRadius: '2px',
      padding: `${mm(4)}px ${mm(3)}px`, textAlign: 'center', background: WHITE,
    }}>
      <div style={{
        width: `${mm(20)}px`, height: `${mm(20)}px`, margin: '0 auto', marginBottom: `${mm(2.5)}px`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <img src={img || fallbackImg} crossOrigin="anonymous" alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
      </div>
      <div style={{ fontSize: `${fs(14.5)}px`, fontWeight: 700, color: VERDE, lineHeight: 1.3 }}>{linha1}</div>
      <div style={{ fontSize: `${fs(14.5)}px`, fontWeight: 700, color: VERDE, lineHeight: 1.3 }}>{linha2}</div>
    </div>
  );
}

function Parcela({ n, valor, destaque }: { n: string; valor: string; destaque?: boolean }) {
  return (
    <div style={{
      flex: 1, border: `1px solid ${destaque ? OURO : LINHA}`, borderRadius: '2px',
      padding: `${mm(2.8)}px ${mm(2)}px`, textAlign: 'center',
      background: destaque ? CREME : WHITE,
    }}>
      <div style={{ fontSize: `${fs(11.7)}px`, color: MUTED, marginBottom: `${mm(1.5)}px` }}>{n}</div>
      <div style={{
        fontFamily: DISPLAY, fontSize: `${fs(15.9)}px`, fontWeight: 600, color: VERDE, letterSpacing: '-0.02em',
      }}>{valor}</div>
    </div>
  );
}

function Foto({ src, ratio, alt }: { src?: string; ratio: number; alt?: string }) {
  return (
    <div
      role="img"
      aria-label={alt || ''}
      style={{
        position: 'relative', width: '100%', paddingTop: `${ratio * 100}%`,
        borderRadius: '2px', overflow: 'hidden', background: '#EEE9DD',
        backgroundImage: src ? `url(${src})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    />
  );
}

// ────────────────────────────────────────────────────────────
// Gráfico geração x consumo
// ────────────────────────────────────────────────────────────
function Barra({ valor, altura, cor, corTexto, estimado }: { valor: number; altura: number; cor: string; corTexto: string; estimado?: boolean }) {
  return (
    <div style={{
      flex: 1, height: `${altura}%`, borderRadius: '1px 1px 0 0',
      position: 'relative', overflow: 'hidden',
      background: estimado ? '#C7C4B6' : cor,
      border: estimado ? `1.5px dashed ${MUTED}` : 'none',
      boxSizing: 'border-box',
    }}>
      <div style={{
        position: 'absolute', top: '50%', left: 0, right: 0,
        transform: 'translateY(-50%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          transform: 'rotate(-90deg)', whiteSpace: 'nowrap', display: 'block',
          fontSize: `${fs(13.5)}px`, fontWeight: 700, color: estimado ? MUTED : corTexto, lineHeight: 1,
        }}>{fmtInt(valor)}</span>
      </div>
    </div>
  );
}

function Grafico({ dados }: { dados: MonthlyRow[] }) {
  const meses = (dados || []).slice(0, 12);
  if (meses.length === 0) return null;
  const max = Math.max(1, ...meses.map(m => Math.max(m.consumo, m.geracao)));

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: `${mm(2.4)}px`,
        height: `${mm(62)}px`, paddingTop: `${mm(3)}px`,
      }}>
        {meses.map((m, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
            <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', width: '100%', flex: 1, minHeight: 0 }}>
              <Barra valor={m.consumo} altura={(m.consumo / max) * 100} cor={OURO} corTexto={VERDE_ESC} estimado={m.consumoEstimado} />
              <Barra valor={m.geracao} altura={(m.geracao / max) * 100} cor={VERDE} corTexto={WHITE} />
            </div>
            <div style={{ fontSize: `${fs(9.2)}px`, color: MUTED, marginTop: `${mm(1.5)}px`, textAlign: 'center' }}>
              {m.mes}{m.consumoEstimado && <span style={{ fontSize: `${fs(7.5)}px` }}> (estimado)</span>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: `${mm(2.4)}px`, marginTop: `${mm(1.5)}px` }}>
        {meses.map((m, i) => {
          const saldo = Math.round(m.geracao - m.consumo);
          return (
            <div key={i} style={{
              flex: 1, textAlign: 'center', fontSize: `${fs(8.8)}px`, fontWeight: 600,
              color: saldo < 0 ? '#B4553A' : VERDE,
            }}>
              {saldo >= 0 ? `+${fmtInt(saldo)}` : `−${fmtInt(Math.abs(saldo))}`}
            </div>
          );
        })}
      </div>

      <div style={{
        display: 'flex', gap: `${mm(6)}px`, fontSize: `${fs(11.7)}px`, color: MUTED,
        marginTop: `${mm(3)}px`, flexWrap: 'wrap',
      }}>
        <span>
          <i style={{ width: `${fs(9)}px`, height: `${fs(9)}px`, borderRadius: '2px', display: 'inline-block', marginRight: `${fs(4)}px`, background: OURO }} />
          Consumo
        </span>
        <span>
          <i style={{ width: `${fs(9)}px`, height: `${fs(9)}px`, borderRadius: '2px', display: 'inline-block', marginRight: `${fs(4)}px`, background: VERDE }} />
          Geração estimada
        </span>
        {meses.some(m => m.consumoEstimado) && (
          <span>
            <i style={{ width: `${fs(9)}px`, height: `${fs(9)}px`, borderRadius: '2px', display: 'inline-block', marginRight: `${fs(4)}px`, background: '#C7C4B6', border: `1px dashed ${MUTED}`, boxSizing: 'border-box' }} />
            Consumo estimado (sem dado real do mês)
          </span>
        )}
        <span>Abaixo do gráfico: saldo mensal em kWh (crédito ou déficit)</span>
      </div>
    </div>
  );
}

function KpiCapa({ valor, unidade, rotulo, primeiro }: { valor: string; unidade: string; rotulo: string; primeiro?: boolean }) {
  return (
    <div style={{
      flex: 1,
      paddingLeft: primeiro ? 0 : `${mm(4)}px`,
      borderLeft: primeiro ? 'none' : `1px solid ${LINHA}`,
    }}>
      <div style={{
        fontFamily: DISPLAY, fontSize: `${fs(23.2)}px`, fontWeight: 600, color: VERDE,
        letterSpacing: '-0.02em', lineHeight: 1,
      }}>
        {valor}<span style={{ color: OURO_ESC }}>{unidade}</span>
      </div>
      <div style={{ fontSize: `${fs(11.7)}px`, color: MUTED, marginTop: `${fs(3)}px` }}>{rotulo}</div>
    </div>
  );
}

function CardFatura({ valor, legenda, nota }: { valor: string; legenda: string; nota?: string }) {
  return (
    <div style={{ width: '38%' }}>
      <div style={{ position: 'relative', width: '100%' }}>
        <img src={faturaImg} crossOrigin="anonymous" alt=""
             style={{ width: '100%', display: 'block' }} />
        <div style={{
          position: 'absolute', left: '6%', right: '6%', top: '68.7%',
          transform: 'translateY(-50%)', textAlign: 'center',
          fontFamily: DISPLAY, fontWeight: 600, fontSize: `${fs(31.2)}px`,
          letterSpacing: '-0.02em', color: VERDE_FAT, lineHeight: 1,
        }}>{valor}</div>
      </div>
      <div style={{
        marginTop: `${mm(3)}px`, textAlign: 'center',
        fontSize: `${fs(14.2)}px`, color: VERDE, fontWeight: 600,
      }}>{legenda}</div>
      {nota && (
        <div style={{
          marginTop: `${fs(2)}px`, textAlign: 'center',
          fontSize: `${fs(10.2)}px`, color: MUTED, fontWeight: 500,
        }}>{nota}</div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Componente principal
// ────────────────────────────────────────────────────────────
export const PropostaTemplatePages = forwardRef<HTMLDivElement, { data: PropostaTemplateData }>(
  ({ data }, ref) => {
    const fotos = (data.fotos_portfolio || []).slice(0, 35);
    const slots = Array.from({ length: 35 }, (_, i) => fotos[i]);

    const faturaAntes  = data.consumo_informado * data.tarifa_kwh;
    const faturaDepois = Math.max(faturaAntes * 0.16, 65.24);
    const cobertura    = data.consumo_informado > 0 ? (data.geracao_mensal / data.consumo_informado) * 100 : 0;

    const cartao = [10, 12, 18, 21]
      .map(m => (data.cartao_parcelas || []).find(c => c.meses === m))
      .filter((c): c is { meses: number; valor: number } => Boolean(c));

    return (
      <div ref={ref} style={{ width: `${PAGE_W}px`, background: WHITE }}>

        {/* ═══ 1 · CAPA ═══ */}
        <Page>
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            padding: `${mm(16)}px ${mm(16)}px ${mm(12)}px`, position: 'relative',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: `${mm(10)}px` }}>
              <img src={logoColor} crossOrigin="anonymous" alt="Três Lagoas Solar"
                   style={{ height: `${mm(14)}px`, width: 'auto', display: 'block' }} />
              <div style={{ textAlign: 'right', fontSize: `${fs(10.2)}px`, color: MUTED, lineHeight: 1.5 }}>
                Proposta comercial
                <b style={{ display: 'block', fontSize: `${fs(12.7)}px`, color: VERDE, fontWeight: 600 }}>
                  {data.numero_proposta} · {hoje()}
                </b>
              </div>
            </div>

            <div style={{ height: `${mm(186)}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={capaIlustracao} crossOrigin="anonymous" alt=""
                   style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} />
            </div>

            <div style={{ marginTop: 'auto', paddingTop: `${mm(7)}px` }}>
              <div style={{ fontSize: `${fs(13.2)}px`, color: MUTED, marginBottom: `${mm(2)}px` }}>Preparada para</div>
              <div style={{
                fontFamily: DISPLAY, fontSize: `${fs(28.2)}px`, fontWeight: 600,
                letterSpacing: '-0.02em', color: VERDE, lineHeight: 1.1,
              }}>{data.cliente_nome}</div>
              <div style={{ marginTop: `${mm(3)}px`, fontSize: `${fs(13.2)}px`, color: MUTED }}>
                Representante: <strong style={{ color: VERDE, fontWeight: 600 }}>{data.responsavel_nome}</strong>
                {data.responsavel_telefone ? ` · ${data.responsavel_telefone}` : ''}
              </div>
            </div>

            <div style={{ display: 'flex', borderTop: `1px solid ${LINHA}`, marginTop: `${mm(6)}px`, paddingTop: `${mm(5)}px` }}>
              <KpiCapa valor={`${formatNumber(data.potencia_kwp, 2)} `} unidade="kWp" rotulo="Potência instalada" primeiro />
              <KpiCapa valor={`${fmtInt(data.geracao_mensal)} `} unidade="kWh" rotulo="Geração média mensal" />
            </div>

            <div style={{
              marginTop: `${mm(6)}px`, fontSize: `${fs(9.7)}px`, color: MUTED,
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span>Três Lagoas Solar Ltda. · {ENDERECO.cnpj}</span>
              <span>treslagoassolar.com.br</span>
            </div>

            <div style={{ position: 'absolute', left: 0, bottom: 0, width: '100%', height: `${mm(3)}px`, background: OURO }} />
          </div>
        </Page>

        {/* ═══ 2 · CLIENTES ═══ */}
        <Page>
          <Header numero={data.numero_proposta} />
          <Body>
            <Eyebrow>Cases</Eyebrow>
            <Title>Alguns de nossos clientes</Title>
            <div style={{
              fontSize: `${fs(13.2)}px`, color: MUTED, maxWidth: `${mm(125)}px`,
              marginBottom: `${mm(5)}px`, lineHeight: 1.65,
            }}>
              Telhados residenciais, comerciais e rurais em Três Lagoas e região.
              Todas as fotos são de obras executadas pela nossa equipe.
            </div>

            <div style={{ display: 'flex', gap: `${mm(5)}px`, marginBottom: `${mm(6)}px` }}>
              <Stat valor="800+" rotulo="Clientes atendidos" />
              <Stat valor="7,4 MWp" rotulo="Potência entregue" />
              <Stat valor="5,0" rotulo="Avaliação dos clientes" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: `${mm(2.4)}px` }}>
              {[0, 1, 2, 3, 4, 5, 6].map(linha => (
                <div key={linha} style={{ display: 'flex', gap: `${mm(2.4)}px` }}>
                  {[0, 1, 2, 3, 4].map(col => (
                    <div key={col} style={{ flex: 1 }}>
                      <Foto src={slots[linha * 5 + col]} ratio={0.78} alt="Instalação Três Lagoas Solar" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </Body>
          <Footer num="02" />
        </Page>

        {/* ═══ 3 · GERAÇÃO x CONSUMO E INVESTIMENTO ═══ */}
        <Page>
          <Header numero={data.numero_proposta} />
          <Body>
            <Eyebrow>Sistema proposto</Eyebrow>
            <Title>Consumo x geração</Title>

            <div style={{ display: 'flex', gap: `${mm(5)}px`, marginBottom: `${mm(2)}px` }}>
              <Stat valor={`${fmtInt(data.geracao_mensal)} kWh`} rotulo="Geração média mensal" />
              <Stat valor={`${fmtInt(data.consumo_informado)} kWh`} rotulo="Consumo médio mensal" />
              <Stat valor={`+${fmtInt(data.excedente_kwh)} kWh`} rotulo="Excedente médio mensal" />
              <Stat valor={`${formatNumber(cobertura, 1)}%`} rotulo="Cobertura do consumo" />
            </div>

            <Grafico dados={data.dados_mensais} />

            <div style={{ marginTop: `${mm(6)}px` }}>
              <TableHead>Equipamentos principais</TableHead>
              <div style={{ display: 'flex', gap: `${mm(6)}px` }}>
                <EquipmentBox
                  img={data.imagem_inversor}
                  fallbackImg={inversorFallback}
                  linha1={data.marca_inversor}
                  linha2={`${data.qtd_inversores > 1 ? `${data.qtd_inversores} × ` : ''}${data.potencia_inversor}`}
                />
                <EquipmentBox
                  img={data.imagem_placa}
                  fallbackImg={moduloFallback}
                  linha1={`${data.num_placas} × ${data.potencia_placa}`}
                  linha2={data.marca_placa}
                />
              </div>
            </div>

            <H3 style={{ marginTop: `${mm(7)}px` }}>Financiamento solar — entrada zero</H3>
            <div style={{ display: 'flex', gap: `${mm(3)}px`, marginBottom: `${mm(5)}px` }}>
              <Parcela n="24x" valor={fmtMoney(data.parcela_24x)} />
              <Parcela n="36x" valor={fmtMoney(data.parcela_36x)} />
              <Parcela n="48x" valor={fmtMoney(data.parcela_48x)} />
              <Parcela n="60x" valor={fmtMoney(data.parcela_60x)} destaque />
              <Parcela n="72x" valor={fmtMoney(data.parcela_72x)} />
            </div>

            {cartao.length > 0 && (
              <>
                <H3>Cartão de crédito</H3>
                <div style={{ display: 'flex', gap: `${mm(3)}px` }}>
                  {cartao.map(c => <Parcela key={c.meses} n={`${c.meses}x`} valor={fmtMoney(c.valor)} />)}
                </div>
              </>
            )}

            <div style={{
              marginTop: `${mm(6)}px`, borderTop: `2px solid ${VERDE}`, paddingTop: `${mm(4)}px`,
              display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: `${mm(8)}px`,
            }}>
              <div>
                <b style={{ display: 'block', fontSize: `${fs(14.2)}px`, fontWeight: 600, color: VERDE }}>À vista</b>
                <span style={{ fontSize: `${fs(11.2)}px`, color: MUTED }}>
                  Sistema completo, instalado e homologado · PIX ou transferência
                </span>
              </div>
              <div style={{
                fontFamily: DISPLAY, fontSize: `${fs(33.2)}px`, fontWeight: 600, color: VERDE,
                letterSpacing: '-0.03em', lineHeight: 1, whiteSpace: 'nowrap',
              }}>{fmtMoney(data.preco_vista)}</div>
            </div>
          </Body>
          <Footer num="03" />
        </Page>

        {/* ═══ 4 · ANTES E DEPOIS ═══ */}
        <Page>
          <Header numero={data.numero_proposta} />
          <Body>
            <Eyebrow>Retorno financeiro</Eyebrow>
            <Title>Antes e depois</Title>

            <div style={{ display: 'flex', justifyContent: 'center', gap: `${mm(8)}px`, marginTop: `${mm(6)}px`, marginBottom: `${mm(8)}px` }}>
              <CardFatura valor={fmtMoney(faturaAntes)} legenda="Hoje, sem energia solar" />
              <CardFatura
                valor={fmtMoney(faturaDepois)}
                legenda="Com o sistema instalado"
                nota="(considerando 60% do fio B atual)"
              />
            </div>

            <H3>O que está incluído</H3>
            <div style={{ display: 'flex', gap: `${mm(10)}px` }}>
              <div style={{ flex: 1 }}>
                {ESCOPO_INCLUSO.slice(0, 4).map((t, i) => <Check key={i}>{t}</Check>)}
              </div>
              <div style={{ flex: 1 }}>
                {ESCOPO_INCLUSO.slice(4).map((t, i) => <Check key={i}>{t}</Check>)}
              </div>
            </div>

            <div style={{ display: 'flex', gap: `${mm(6)}px`, marginTop: `${mm(7)}px` }}>
              <div style={{ flex: 1 }}>
                <TableHead>Condições</TableHead>
                <Row label="Validade da proposta" value="5 dias" />
                <Row label="Prazo estimado de entrega" value="20 a 30 dias" last />
              </div>
              <div style={{ flex: 1 }}>
                <TableHead>Garantias</TableHead>
                <Row label="Módulos — desempenho / fabricação" value="30 / 15 anos" />
                <Row label="Inversor" value="10 anos" />
                {data.usa_microinversor && (
                  <Row label="Micro inversor" value="12 anos" />
                )}
                <Row label="Instalação e acompanhamento" value="3 anos" last />
              </div>
            </div>

            {data.observacoes && (
              <div style={{
                marginTop: `${mm(6)}px`, fontSize: `${fs(10.7)}px`, color: MUTED, lineHeight: 1.6,
                borderLeft: `2px solid ${LINHA}`, paddingLeft: `${mm(3.5)}px`,
              }}>{data.observacoes}</div>
            )}

            <div style={{ marginTop: `${mm(6)}px`, fontSize: `${fs(9.2)}px`, color: MUTED, fontStyle: 'italic' }}>
              Valores estimados, sujeitos a variações de consumo, tarifas e critérios da concessionária.
            </div>
          </Body>
          <Footer num="04" />
        </Page>

        {/* ═══ 5 · A EMPRESA ═══ */}
        <Page>
          <Header numero={data.numero_proposta} />
          <Body style={{ display: 'flex', flexDirection: 'column' }}>
            <Eyebrow>A empresa</Eyebrow>
            <Title>Estamos aqui, com endereço fixo</Title>
            <div style={{
              fontSize: `${fs(13.2)}px`, color: MUTED, maxWidth: `${mm(125)}px`,
              marginBottom: `${mm(5)}px`, lineHeight: 1.65,
            }}>
              Loja física em Três Lagoas, com assistência e pós-venda de verdade. Aqui, você sabe onde nos encontrar — antes, durante e depois da instalação.
            </div>

            <div style={{ marginBottom: `${mm(6)}px` }}>
              <Foto src={fachadaImg} ratio={0.28} alt="Fachada da Três Lagoas Solar" />
            </div>

            <div style={{ display: 'flex', gap: `${mm(6)}px`, marginBottom: `${mm(6)}px` }}>
              <div style={{ flex: 1 }}>
                <H3>Nosso padrão de instalação</H3>
                <Foto src={instalacoesImg} ratio={0.75} alt="Padrão de instalação" />
                <div style={{ fontSize: `${fs(13.2)}px`, color: MUTED, marginTop: `${mm(3)}px`, lineHeight: 1.6 }}>
                  Cabeamento com dupla isolação em eletroduto zincado. Disjuntores selecionados,
                  DPS Clamper, aterramento, sinalização normativa e material padronizado.
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <H3>Onde nos encontrar</H3>
                <Foto src={mapaImg} ratio={0.75} alt="Mapa de localização" />
                <div style={{ marginTop: `${mm(3)}px` }}>
                  <Row label="Endereço" value={<>{ENDERECO.rua}<br />{ENDERECO.bairro}</>} />
                  <Row label="Cidade" value={ENDERECO.cidade} />
                  <Row label="Atendimento" value={<>{ENDERECO.horario1}<br />{ENDERECO.horario2}</>} last />
                </div>
              </div>
            </div>

            <div style={{
              marginTop: 'auto', background: VERDE, color: WHITE, borderRadius: '2px',
              padding: `${mm(6)}px`, textAlign: 'center',
            }}>
              <div style={{ fontFamily: DISPLAY, fontSize: `${fs(15.2)}px`, fontWeight: 600, marginBottom: `${mm(2)}px` }}>
                Alguma dúvida antes de decidir?
              </div>
              <div style={{ fontSize: `${fs(13.2)}px`, color: 'rgba(255,255,255,0.85)', lineHeight: 1.7 }}>
                Fale direto com quem fez o projeto.<br />
                {ENDERECO.telefone} &nbsp;·&nbsp; {ENDERECO.email} &nbsp;·&nbsp; {ENDERECO.instagram} &nbsp;·&nbsp; {ENDERECO.site}
              </div>
            </div>
          </Body>
          <Footer num="05" />
        </Page>

      </div>
    );
  },
);

PropostaTemplatePages.displayName = 'PropostaTemplatePages';
