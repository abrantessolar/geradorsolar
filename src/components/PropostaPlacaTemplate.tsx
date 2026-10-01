import logoColor from '@/assets/proposta-template/logo-tls-color.png';
import capaIlustracao from '@/assets/proposta-template/capa-ilustracao.jpg';
import mapaImg from '@/assets/proposta-template/mapa-localizacao.jpg';
import fachadaImg from '@/assets/proposta-template/fachada-empresa.jpg';
import instalacoesImg from '@/assets/proposta-template/instalacoes.jpg';
import moduloFallback from '@/assets/proposta-template/modulo.png';
import { formatNumber } from '@/data/calculations';
import type { PropostaPlaca } from '@/data/propostaPlacaTypes';

// Mesma identidade visual da proposta ongrid. As páginas 1 (Capa) e 2
// (Clientes) abaixo são a MESMA marcação/estilo de PropostaTemplatePages.tsx,
// copiada à mão — de propósito não importada de lá, pra manter os dois
// templates 100% isolados (um bug num não pode afetar o outro).
const PAGE_W = 1241;
const PAGE_H = 1755;
const mm = (v: number) => Math.round(v * (PAGE_W / 210) * 100) / 100;
const fs = (v: number) => Math.round(v * (PAGE_W / 793.7) * 10) / 10;

const VERDE     = '#4A5A2A';
const OURO      = '#E8B84B';
const OURO_ESC  = '#9C7412';
const LINHA     = '#DED7C6';
const TEXTO     = '#232717';
const MUTED     = '#6F7360';
const WHITE     = '#ffffff';
const VERDE_ESC = '#2F3A1A';
const BEGE      = '#FAF8F2';

const FONT = 'Inter, Arial, Helvetica, sans-serif';
const DISPLAY = '"Bricolage Grotesque", Inter, Arial, sans-serif';
const fmtInt = (n: number) => formatNumber(n, 0);
const hoje = () => new Date().toLocaleDateString('pt-BR');

const ENDERECO = {
  cnpj: 'CNPJ 39.369.943/0001-21',
};

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatCurrency(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ────────────────────────────────────────────────────────────
// Blocos de layout (idênticos aos da proposta ongrid)
// ────────────────────────────────────────────────────────────
function Page({ children }: { children?: React.ReactNode }) {
  return (
    <div style={{
      width: `${PAGE_W}px`, height: `${PAGE_H}px`, position: 'relative', background: WHITE,
      overflow: 'hidden', fontFamily: FONT, color: TEXTO, display: 'flex', flexDirection: 'column',
    }}>
      {children}
    </div>
  );
}

function Header({ numero }: { numero: string | null }) {
  return (
    <div style={{
      flexShrink: 0, height: `${mm(17)}px`, padding: `0 ${mm(16)}px`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${LINHA}`,
    }}>
      <img src={logoColor} crossOrigin="anonymous" alt="Três Lagoas Solar" style={{ height: `${mm(9)}px`, width: 'auto', display: 'block' }} />
      <div style={{ textAlign: 'right', fontSize: `${fs(10.2)}px`, color: MUTED, lineHeight: 1.5 }}>
        Proposta
        <b style={{ display: 'block', fontSize: `${fs(12.7)}px`, color: VERDE, fontWeight: 600 }}>{numero}</b>
      </div>
    </div>
  );
}

function Footer({ num }: { num: string }) {
  return (
    <div style={{
      flexShrink: 0, height: `${mm(13)}px`, padding: `0 ${mm(16)}px`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${LINHA}`,
      fontSize: `${fs(9.7)}px`, color: MUTED,
    }}>
      <span>Três Lagoas Solar · Três Lagoas, MS · {ENDERECO.cnpj}</span>
      <span style={{ fontWeight: 600, color: VERDE, fontSize: `${fs(10.7)}px` }}>{num}</span>
    </div>
  );
}

function Body({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ flex: 1, minHeight: 0, padding: `${mm(9)}px ${mm(16)}px 0`, ...style }}>{children}</div>;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: `${fs(10.7)}px`, color: OURO_ESC, fontWeight: 600, marginBottom: `${fs(5)}px` }}>{children}</div>;
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: DISPLAY, fontSize: `${fs(25)}px`, fontWeight: 600, color: VERDE,
      lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: `${mm(3)}px`,
    }}>{children}</div>
  );
}

function Stat({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div style={{ flex: 1, borderLeft: `2px solid ${OURO}`, paddingLeft: `${mm(3.5)}px` }}>
      <div style={{ fontFamily: DISPLAY, fontSize: `${fs(22)}px`, fontWeight: 600, color: VERDE, lineHeight: 1.1, letterSpacing: '-0.02em' }}>{valor}</div>
      <div style={{ fontSize: `${fs(11.7)}px`, color: MUTED, marginTop: `${fs(3)}px` }}>{rotulo}</div>
    </div>
  );
}

function Foto({ src, ratio, alt }: { src?: string; ratio: number; alt?: string }) {
  return (
    <div role="img" aria-label={alt || ''} style={{
      position: 'relative', width: '100%', paddingTop: `${ratio * 100}%`,
      borderRadius: '2px', overflow: 'hidden', background: '#EEE9DD',
      backgroundImage: src ? `url(${src})` : undefined,
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
    }} />
  );
}

function KpiCapa({ valor, unidade, rotulo, primeiro }: { valor: string; unidade: string; rotulo: string; primeiro?: boolean }) {
  return (
    <div style={{ flex: 1, paddingLeft: primeiro ? 0 : `${mm(4)}px`, borderLeft: primeiro ? 'none' : `1px solid ${LINHA}` }}>
      <div style={{ fontFamily: DISPLAY, fontSize: `${fs(23.2)}px`, fontWeight: 600, color: VERDE, letterSpacing: '-0.02em', lineHeight: 1 }}>
        {valor}<span style={{ color: OURO_ESC }}>{unidade}</span>
      </div>
      <div style={{ fontSize: `${fs(11.7)}px`, color: MUTED, marginTop: `${fs(3)}px` }}>{rotulo}</div>
    </div>
  );
}

// Caixa simples (estilo próprio da página de Módulos — distinta do Stat acima)
function StatBox({ valor, label }: { valor: string; label: string }) {
  return (
    <div style={{ flex: 1, background: BEGE, borderRadius: `${mm(3)}px`, padding: `${mm(5)}px`, textAlign: 'center' }}>
      <p style={{ fontSize: `${fs(18)}px`, fontWeight: 700, color: VERDE }}>{valor}</p>
      <p style={{ fontSize: `${fs(9)}px`, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: `${mm(1)}px` }}>{label}</p>
    </div>
  );
}

// ═══ 1 · CAPA (idêntica à proposta ongrid) ═══
function PaginaCapa({ data }: { data: PropostaPlaca }) {
  return (
    <Page>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: `${mm(16)}px ${mm(16)}px ${mm(12)}px`, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: `${mm(10)}px` }}>
          <img src={logoColor} crossOrigin="anonymous" alt="Três Lagoas Solar" style={{ height: `${mm(14)}px`, width: 'auto', display: 'block' }} />
          <div style={{ textAlign: 'right', fontSize: `${fs(10.2)}px`, color: MUTED, lineHeight: 1.5 }}>
            Proposta comercial
            <b style={{ display: 'block', fontSize: `${fs(12.7)}px`, color: VERDE, fontWeight: 600 }}>
              {data.numeroProposta} · {hoje()}
            </b>
          </div>
        </div>

        <div style={{ height: `${mm(186)}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={capaIlustracao} crossOrigin="anonymous" alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} />
        </div>

        <div style={{ marginTop: 'auto', paddingTop: `${mm(7)}px` }}>
          <div style={{ fontSize: `${fs(13.2)}px`, color: MUTED, marginBottom: `${mm(2)}px` }}>Preparada para</div>
          <div style={{ fontFamily: DISPLAY, fontSize: `${fs(28.2)}px`, fontWeight: 600, letterSpacing: '-0.02em', color: VERDE, lineHeight: 1.1 }}>
            {data.clienteNome}
          </div>
          <div style={{ marginTop: `${mm(3)}px`, fontSize: `${fs(13.2)}px`, color: MUTED }}>
            Representante: <strong style={{ color: VERDE, fontWeight: 600 }}>{data.responsavelNome}</strong>
            {data.responsavelTelefone ? ` · ${data.responsavelTelefone}` : ''}
          </div>
        </div>

        <div style={{ display: 'flex', borderTop: `1px solid ${LINHA}`, marginTop: `${mm(6)}px`, paddingTop: `${mm(5)}px` }}>
          <KpiCapa valor={`${formatNumber(data.potenciaKwp ?? 0, 2)} `} unidade="kWp" rotulo="Potência instalada" primeiro />
          <KpiCapa valor={`${fmtInt(data.geracaoMediaKwh ?? 0)} `} unidade="kWh" rotulo="Geração média mensal" />
        </div>

        <div style={{ marginTop: `${mm(6)}px`, fontSize: `${fs(9.7)}px`, color: MUTED, display: 'flex', justifyContent: 'space-between' }}>
          <span>Três Lagoas Solar Ltda. · {ENDERECO.cnpj}</span>
          <span>treslagoassolar.com.br</span>
        </div>

        <div style={{ position: 'absolute', left: 0, bottom: 0, width: '100%', height: `${mm(3)}px`, background: OURO }} />
      </div>
    </Page>
  );
}

// ═══ 2 · CLIENTES (idêntica à proposta ongrid) ═══
function PaginaClientes({ numero, fotos }: { numero: string | null; fotos: string[] }) {
  const slots = Array.from({ length: 35 }, (_, i) => fotos[i]);
  return (
    <Page>
      <Header numero={numero} />
      <Body>
        <Eyebrow>Cases</Eyebrow>
        <Title>Alguns de nossos clientes</Title>
        <div style={{ fontSize: `${fs(13.2)}px`, color: MUTED, maxWidth: `${mm(125)}px`, marginBottom: `${mm(5)}px`, lineHeight: 1.65 }}>
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
  );
}

// ═══ 3 · MÓDULOS (a página nova) ═══
function Barra({ valor, altura, max }: { valor: number; altura: number; max: number }) {
  return (
    <div style={{ flex: 1, height: `${(altura / max) * 100}%`, background: VERDE, borderRadius: '2px 2px 0 0', position: 'relative' }}>
      <span style={{
        position: 'absolute', top: `${mm(1.5)}px`, left: 0, right: 0, textAlign: 'center',
        fontSize: `${fs(8.5)}px`, fontWeight: 700, color: WHITE, transform: 'rotate(-90deg)', transformOrigin: 'center',
        whiteSpace: 'nowrap',
      }}>{fmtInt(valor)}</span>
    </div>
  );
}

function PaginaModulos({ data }: { data: PropostaPlaca }) {
  const rates = [3, 6, 12, 18];
  const geracao = data.geracaoMensalKwh || [];
  const max = Math.max(...geracao, 1);

  return (
    <Page>
      <Header numero={data.numeroProposta} />
      <Body>
        <Eyebrow>Proposta</Eyebrow>
        <Title>Módulos fotovoltaicos</Title>

        <div style={{ display: 'flex', gap: `${mm(4)}px`, marginBottom: `${mm(6)}px` }}>
          <StatBox valor={`${data.qtdPlacas}`} label="Quantidade proposta" />
          <StatBox valor={`${(data.potenciaKwp ?? 0).toFixed(2)} kWp`} label="Potência total" />
          <StatBox valor={`${(data.geracaoMediaKwh ?? 0).toFixed(0)} kWh`} label="Geração média mensal" />
        </div>

        <div style={{ display: 'flex', gap: `${mm(6)}px`, marginBottom: `${mm(6)}px` }}>
          <div style={{ flex: 1, border: `1px solid ${LINHA}`, borderRadius: `${mm(3)}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <img src={data.placaImagem || moduloFallback} style={{ maxWidth: '85%', maxHeight: '85%', objectFit: 'contain' }} />
          </div>
          <table style={{ flex: 1.4, borderCollapse: 'collapse', fontSize: `${fs(11)}px` }}>
            <tbody>
              <tr><td style={{ padding: `${mm(2)}px 0`, color: MUTED }}>Módulo</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{data.placaMarca} {data.placaModelo}</td></tr>
              <tr><td style={{ padding: `${mm(2)}px 0`, color: MUTED, borderTop: `1px solid ${LINHA}` }}>Potência unitária</td><td style={{ textAlign: 'right', fontWeight: 700, borderTop: `1px solid ${LINHA}` }}>{data.placaPotenciaWp ?? '—'} Wp</td></tr>
              <tr><td style={{ padding: `${mm(2)}px 0`, color: MUTED, borderTop: `1px solid ${LINHA}` }}>Garantia de desempenho</td><td style={{ textAlign: 'right', fontWeight: 700, borderTop: `1px solid ${LINHA}` }}>30 anos</td></tr>
              <tr><td style={{ padding: `${mm(2)}px 0`, color: MUTED, borderTop: `1px solid ${LINHA}` }}>Garantia de fabricação</td><td style={{ textAlign: 'right', fontWeight: 700, borderTop: `1px solid ${LINHA}` }}>15 anos</td></tr>
            </tbody>
          </table>
        </div>

        {geracao.length === 12 && (
          <>
            <div style={{ fontFamily: DISPLAY, fontSize: `${fs(14)}px`, fontWeight: 600, color: VERDE_ESC, marginBottom: `${mm(2)}px` }}>Geração estimada</div>
            <div style={{ display: 'flex', gap: `${mm(1.5)}px`, height: `${mm(38)}px`, alignItems: 'flex-end', marginBottom: `${mm(2)}px` }}>
              {geracao.map((v, i) => <Barra key={i} valor={v} altura={v} max={max} />)}
            </div>
            <div style={{ display: 'flex', gap: `${mm(1.5)}px`, marginBottom: `${mm(5)}px` }}>
              {MONTH_LABELS.map(m => <div key={m} style={{ flex: 1, textAlign: 'center', fontSize: `${fs(8.5)}px`, color: MUTED }}>{m}</div>)}
            </div>
          </>
        )}

        <div style={{ fontFamily: DISPLAY, fontSize: `${fs(14)}px`, fontWeight: 600, color: VERDE_ESC, marginBottom: `${mm(2)}px` }}>Cartão de crédito</div>
        <div style={{ display: 'flex', gap: `${mm(3)}px`, marginBottom: `${mm(4)}px` }}>
          {data.cartaoParcelas?.filter(c => rates.includes(c.meses)).map(c => (
            <div key={c.meses} style={{ flex: 1, background: BEGE, borderRadius: `${mm(2.5)}px`, padding: `${mm(3)}px`, textAlign: 'center' }}>
              <p style={{ fontSize: `${fs(13)}px`, fontWeight: 700, color: VERDE }}>{c.meses}x</p>
              <p style={{ fontSize: `${fs(11)}px`, color: MUTED }}>{formatCurrency(c.valor)}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: VERDE, color: WHITE, borderRadius: `${mm(3)}px`, padding: `${mm(4)}px ${mm(5)}px`, marginBottom: `${mm(4)}px` }}>
          <div>
            <p style={{ fontSize: `${fs(12)}px`, fontWeight: 700 }}>À vista</p>
            <p style={{ fontSize: `${fs(9.5)}px`, opacity: 0.85 }}>{data.qtdPlacas} módulos {data.placaMarca} {data.placaModelo} · PIX ou transferência</p>
          </div>
          <p style={{ fontSize: `${fs(20)}px`, fontWeight: 700 }}>{formatCurrency(data.precoAvista)}</p>
        </div>

        <p style={{ fontSize: `${fs(9.5)}px`, color: MUTED, borderLeft: `2px solid ${OURO}`, paddingLeft: `${mm(3.5)}px`, lineHeight: 1.5 }}>
          Este valor refere-se exclusivamente aos módulos fotovoltaicos. A geração estimada acima só se concretiza com inversor, estrutura de fixação e instalação corretamente dimensionados — não inclusos nesta proposta.
        </p>
        {data.observacoes && (
          <p style={{ fontSize: `${fs(9.5)}px`, color: MUTED, marginTop: `${mm(2)}px` }}>{data.observacoes}</p>
        )}
      </Body>
      <Footer num="03" />
    </Page>
  );
}

// ═══ 4 · A EMPRESA ═══
function PaginaEmpresa() {
  return (
    <Page>
      <Header numero={null} />
      <Body>
        <Eyebrow>Quem somos</Eyebrow>
        <Title>A empresa</Title>

        <div style={{ borderRadius: `${mm(3)}px`, overflow: 'hidden', marginBottom: `${mm(5)}px`, aspectRatio: '3.6', background: '#EFEBDE' }}>
          <img src={fachadaImg} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>

        <p style={{ fontSize: `${fs(12)}px`, color: VERDE_ESC, lineHeight: 1.6, marginBottom: `${mm(5)}px`, maxWidth: `${mm(150)}px` }}>
          Loja física em Três Lagoas, com assistência e pós-venda de verdade. Aqui, você sabe onde nos encontrar —
          antes, durante e depois da instalação.
        </p>

        <div style={{ display: 'flex', gap: `${mm(6)}px` }}>
          <div style={{ flex: 1, borderRadius: `${mm(3)}px`, overflow: 'hidden', aspectRatio: '4/3', background: '#EFEBDE' }}>
            <img src={instalacoesImg} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ flex: 1, borderRadius: `${mm(3)}px`, overflow: 'hidden', aspectRatio: '4/3', background: '#EFEBDE' }}>
            <img src={mapaImg} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>
      </Body>
      <Footer num="04" />
    </Page>
  );
}

export default function PropostaPlacaTemplate({ data, fotosPortfolio }: { data: PropostaPlaca; fotosPortfolio: string[] }) {
  return (
    <>
      <PaginaCapa data={data} />
      <PaginaClientes numero={data.numeroProposta} fotos={fotosPortfolio} />
      <PaginaModulos data={data} />
      <PaginaEmpresa />
    </>
  );
}
