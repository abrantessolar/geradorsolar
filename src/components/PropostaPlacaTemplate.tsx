import logoColor from '@/assets/proposta-template/logo-tls-color.png';
import capaIlustracao from '@/assets/proposta-template/capa-ilustracao.jpg';
import mapaImg from '@/assets/proposta-template/mapa-localizacao.jpg';
import fachadaImg from '@/assets/proposta-template/fachada-empresa.jpg';
import instalacoesImg from '@/assets/proposta-template/instalacoes.jpg';
import moduloFallback from '@/assets/proposta-template/modulo.png';
import type { PropostaPlaca } from '@/data/propostaPlacaTypes';

// Mesma identidade visual da proposta ongrid, copiada de propósito (não
// importada) — os dois templates ficam 100% isolados um do outro.
const PAGE_W = 1241;
const PAGE_H = 1755;
const mm = (v: number) => Math.round(v * (PAGE_W / 210) * 100) / 100;
const fs = (v: number) => Math.round(v * (PAGE_W / 793.7) * 10) / 10;

const VERDE     = '#4A5A2A';
const OURO      = '#E8B84B';
const OURO_ESC  = '#9C7412';
const LINHA     = '#DED7C6';
const MUTED     = '#6F7360';
const WHITE     = '#ffffff';
const VERDE_ESC = '#2F3A1A';
const BEGE      = '#FAF8F2';

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatCurrency(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtInt(v: number): string {
  return Math.round(v).toLocaleString('pt-BR');
}

function Page({ children }: { children?: React.ReactNode }) {
  return (
    <div style={{ width: `${PAGE_W}px`, height: `${PAGE_H}px`, position: 'relative', background: WHITE, overflow: 'hidden' }}>
      {children}
    </div>
  );
}

function Header({ numero }: { numero: string | null }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${mm(14)}px ${mm(16)}px 0` }}>
      <img src={logoColor} style={{ height: `${mm(13)}px` }} />
      {numero && <span style={{ fontSize: `${fs(10)}px`, color: MUTED }}>Proposta <strong style={{ color: VERDE }}>{numero}</strong></span>}
    </div>
  );
}

function Footer({ pagina }: { pagina: string }) {
  return (
    <div style={{
      position: 'absolute', bottom: `${mm(10)}px`, left: `${mm(16)}px`, right: `${mm(16)}px`,
      display: 'flex', justifyContent: 'space-between', fontSize: `${fs(9)}px`, color: MUTED,
      borderTop: `1px solid ${LINHA}`, paddingTop: `${mm(3)}px`,
    }}>
      <span>Três Lagoas Solar · Três Lagoas, MS · CNPJ 39.369.943/0001-21</span>
      <span>{pagina}</span>
    </div>
  );
}

function Stat({ valor, label }: { valor: string; label: string }) {
  return (
    <div style={{ flex: 1, background: BEGE, borderRadius: `${mm(3)}px`, padding: `${mm(5)}px`, textAlign: 'center' }}>
      <p style={{ fontSize: `${fs(18)}px`, fontWeight: 700, color: VERDE }}>{valor}</p>
      <p style={{ fontSize: `${fs(9)}px`, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: `${mm(1)}px` }}>{label}</p>
    </div>
  );
}

// ═══ 1 · CAPA ═══
function PaginaCapa({ data }: { data: PropostaPlaca }) {
  return (
    <Page>
      <img src={capaIlustracao} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.16 }} />
      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: `${mm(18)}px` }}>
        <img src={logoColor} style={{ height: `${mm(20)}px` }} />
        <div>
          <p style={{ fontSize: `${fs(12)}px`, color: OURO_ESC, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: `${mm(2)}px` }}>Proposta Comercial · Módulos Fotovoltaicos</p>
          <h1 style={{ fontSize: `${fs(34)}px`, fontWeight: 700, color: VERDE_ESC, marginBottom: `${mm(2)}px`, lineHeight: 1.1 }}>{data.clienteNome}</h1>
          {data.clienteCidade && <p style={{ fontSize: `${fs(13)}px`, color: MUTED, marginBottom: `${mm(10)}px` }}>{data.clienteCidade}{data.clienteUf ? `/${data.clienteUf}` : ''}</p>}
          <div style={{ display: 'flex', gap: `${mm(5)}px`, maxWidth: `${mm(110)}px` }}>
            <Stat valor={`${data.qtdPlacas}`} label="Módulos fotovoltaicos" />
            <Stat valor={`${(data.geracaoMediaKwh ?? 0).toFixed(0)} kWh`} label="Geração média mensal" />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: `${fs(10)}px`, color: MUTED }}>
          <span>{data.numeroProposta ? `Proposta ${data.numeroProposta}` : ''} · {new Date(data.criadoEm).toLocaleDateString('pt-BR')}</span>
          {data.responsavelNome && <span>{data.responsavelNome}{data.responsavelTelefone ? ` · ${data.responsavelTelefone}` : ''}</span>}
        </div>
      </div>
    </Page>
  );
}

// ═══ 2 · CLIENTES ═══
function PaginaClientes({ fotos }: { fotos: string[] }) {
  const slots = Array.from({ length: 35 }, (_, i) => fotos[i]);
  return (
    <Page>
      <Header numero={null} />
      <div style={{ padding: `${mm(10)}px ${mm(16)}px 0` }}>
        <p style={{ fontSize: `${fs(10)}px`, color: OURO_ESC, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Confiança</p>
        <h2 style={{ fontSize: `${fs(22)}px`, fontWeight: 700, color: VERDE_ESC, marginBottom: `${mm(5)}px` }}>Alguns de nossos clientes</h2>
        <div style={{ display: 'flex', gap: `${mm(4)}px`, marginBottom: `${mm(6)}px`, maxWidth: `${mm(140)}px` }}>
          <Stat valor="800+" label="Clientes atendidos" />
          <Stat valor="7,4 MWp" label="Instalados" />
          <Stat valor="5.0" label="Avaliação média" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: `${mm(1.5)}px` }}>
          {slots.map((url, i) => (
            <div key={i} style={{ aspectRatio: '0.78', background: url ? undefined : '#EFEBDE', borderRadius: `${mm(1)}px`, overflow: 'hidden' }}>
              {url && <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
          ))}
        </div>
      </div>
      <Footer pagina="02" />
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
      <div style={{ padding: `${mm(8)}px ${mm(16)}px 0` }}>
        <p style={{ fontSize: `${fs(10)}px`, color: OURO_ESC, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Proposta</p>
        <h2 style={{ fontSize: `${fs(22)}px`, fontWeight: 700, color: VERDE_ESC, marginBottom: `${mm(5)}px` }}>Módulos fotovoltaicos</h2>

        <div style={{ display: 'flex', gap: `${mm(4)}px`, marginBottom: `${mm(6)}px` }}>
          <Stat valor={`${data.qtdPlacas}`} label="Quantidade proposta" />
          <Stat valor={`${(data.potenciaKwp ?? 0).toFixed(2)} kWp`} label="Potência total" />
          <Stat valor={`${(data.geracaoMediaKwh ?? 0).toFixed(0)} kWh`} label="Geração média mensal" />
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
            <h3 style={{ fontSize: `${fs(13)}px`, color: VERDE_ESC, marginBottom: `${mm(2)}px` }}>Geração estimada</h3>
            <div style={{ display: 'flex', gap: `${mm(1.5)}px`, height: `${mm(38)}px`, alignItems: 'flex-end', marginBottom: `${mm(2)}px` }}>
              {geracao.map((v, i) => <Barra key={i} valor={v} altura={v} max={max} />)}
            </div>
            <div style={{ display: 'flex', gap: `${mm(1.5)}px`, marginBottom: `${mm(5)}px` }}>
              {MONTH_LABELS.map(m => <div key={m} style={{ flex: 1, textAlign: 'center', fontSize: `${fs(8.5)}px`, color: MUTED }}>{m}</div>)}
            </div>
          </>
        )}

        <h3 style={{ fontSize: `${fs(13)}px`, color: VERDE_ESC, marginBottom: `${mm(2)}px` }}>Cartão de crédito</h3>
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
      </div>
      <Footer pagina="03" />
    </Page>
  );
}

// ═══ 4 · A EMPRESA ═══
function PaginaEmpresa() {
  return (
    <Page>
      <Header numero={null} />
      <div style={{ padding: `${mm(8)}px ${mm(16)}px 0` }}>
        <p style={{ fontSize: `${fs(10)}px`, color: OURO_ESC, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Quem somos</p>
        <h2 style={{ fontSize: `${fs(22)}px`, fontWeight: 700, color: VERDE_ESC, marginBottom: `${mm(5)}px` }}>A empresa</h2>

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
      </div>
      <div style={{
        position: 'absolute', bottom: `${mm(10)}px`, left: `${mm(16)}px`, right: `${mm(16)}px`,
        fontSize: `${fs(9.5)}px`, color: MUTED, borderTop: `1px solid ${LINHA}`, paddingTop: `${mm(3)}px`,
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>Rua Luiz Correa da Silveira, 934 — Jardim Alvorada, Três Lagoas/MS</span>
        <span>04</span>
      </div>
    </Page>
  );
}

export default function PropostaPlacaTemplate({ data, fotosPortfolio }: { data: PropostaPlaca; fotosPortfolio: string[] }) {
  return (
    <>
      <PaginaCapa data={data} />
      <PaginaClientes fotos={fotosPortfolio} />
      <PaginaModulos data={data} />
      <PaginaEmpresa />
    </>
  );
}
