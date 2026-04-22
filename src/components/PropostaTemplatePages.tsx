/**
 * Renderiza as 4 páginas da proposta no estilo visual do template DOCX
 * (proposta_template.docx).
 *
 * Estrutura:
 *   1. Capa decorativa (image3.jpg)
 *   2. Página de dados (desenhada do zero — fundo branco com cabeçalho verde,
 *      logo TLS, blocos de Equipamentos / Rendimentos / Investimento + parcelas
 *      e dados do cliente/responsável/preço)
 *   3. Página decorativa "Soluções" (image6.jpg)
 *   4. Página decorativa "Portfólio" (image4.jpg)
 *
 * Renderizado offscreen e capturado por html2canvas para gerar PDF.
 */
import { forwardRef } from 'react';
import bgPage1 from '@/assets/proposta-template/image3.jpg';
import bgPage3 from '@/assets/proposta-template/image6.jpg';
import bgPage4 from '@/assets/proposta-template/image4.jpg';
import logoTls from '@/assets/logo.png';
import { formatCurrency, formatNumber } from '@/data/calculations';

export interface PropostaTemplateData {
  cliente_nome: string;
  responsavel_nome: string;
  geracao_mensal: number;
  consumo_mensal: number;
  excedente_kwh: number;
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
}

// A4 a 150 dpi
const PAGE_W = 1241;
const PAGE_H = 1755;

// Paleta extraída do template
const OLIVE = '#5b6a2a';
const OLIVE_DARK = '#4a5a2a';
const YELLOW = '#e8b84b';
const GRAY = '#808080';
const DARK = '#2b2b2b';
const LIGHT_GRAY = '#e5e5e5';

const fmtKwh = (n: number) => `${formatNumber(n, 0)} kWh`;
const fmtMoney = (n: number) => formatCurrency(n).replace('R$', '').trim();

interface PageProps {
  bg?: string;
  children?: React.ReactNode;
}

function Page({ bg, children }: PageProps) {
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
      }}
    >
      {bg && (
        <img
          src={bg}
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
          crossOrigin="anonymous"
        />
      )}
      {children}
    </div>
  );
}

function PageDataHeader({ numero }: { numero: string }) {
  return (
    <>
      {/* Faixa verde superior */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '120px',
          background: OLIVE_DARK,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '0 50px',
        }}
      >
        <img
          src={logoTls}
          alt="Três Lagoas Solar"
          crossOrigin="anonymous"
          style={{ height: '70px', objectFit: 'contain' }}
        />
      </div>
      {/* Número da proposta */}
      <div
        style={{
          position: 'absolute',
          top: '135px',
          right: '50px',
          fontSize: '11px',
          color: GRAY,
          letterSpacing: '0.5px',
        }}
      >
        Nº {numero}
      </div>
    </>
  );
}

function PageDataFooter() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: OLIVE_DARK,
        color: '#fff',
        fontSize: '12px',
        padding: '14px 40px',
        textAlign: 'center',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <strong>(67) 9 9895-5576</strong> | contato@treslagoassolar.com.br |{' '}
      <em>CNPJ: 39.369.943/0001-21</em> | www.treslagoassolar.com.br | @treslagoassolar
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'inline-block',
        background: YELLOW,
        color: DARK,
        fontWeight: 700,
        fontSize: '15px',
        padding: '6px 18px',
        borderRadius: '4px',
        marginBottom: '14px',
      }}
    >
      {children}
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ fontSize: '15px', color: DARK, marginBottom: '8px', lineHeight: 1.5 }}>
      <strong style={{ color: OLIVE }}>{label}:</strong> {value}
    </div>
  );
}

export const PropostaTemplatePages = forwardRef<HTMLDivElement, { data: PropostaTemplateData }>(
  ({ data }, ref) => {
    return (
      <div ref={ref} style={{ width: `${PAGE_W}px`, background: '#fff' }}>
        {/* ============ PÁGINA 1 — CAPA DECORATIVA ============ */}
        <Page bg={bgPage1} />

        {/* ============ PÁGINA 2 — DADOS DA PROPOSTA ============ */}
        <Page>
          <PageDataHeader numero={data.numero_proposta} />

          {/* Título da página */}
          <div
            style={{
              position: 'absolute',
              top: '170px',
              left: '60px',
              right: '60px',
            }}
          >
            <h1
              style={{
                fontSize: '42px',
                color: OLIVE,
                fontWeight: 300,
                margin: 0,
                letterSpacing: '-0.5px',
              }}
            >
              Especificações
            </h1>
            <h2
              style={{
                fontSize: '20px',
                color: DARK,
                fontWeight: 700,
                margin: '0 0 30px 0',
              }}
            >
              do projeto
            </h2>
          </div>

          {/* Cliente e Responsável (cartão destacado) */}
          <div
            style={{
              position: 'absolute',
              top: '300px',
              left: '60px',
              right: '60px',
              padding: '20px 24px',
              background: '#f7f7f3',
              borderLeft: `5px solid ${OLIVE}`,
              borderRadius: '4px',
            }}
          >
            <div style={{ fontSize: '12px', color: GRAY, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Cliente
            </div>
            <div style={{ fontSize: '24px', color: DARK, fontWeight: 700, margin: '4px 0 12px 0' }}>
              {data.cliente_nome}
            </div>
            <div style={{ fontSize: '13px', color: GRAY }}>
              <strong style={{ color: DARK }}>Representante:</strong> {data.responsavel_nome || '—'}
            </div>
          </div>

          {/* Equipamentos / Rendimentos lado a lado */}
          <div
            style={{
              position: 'absolute',
              top: '470px',
              left: '60px',
              width: '530px',
            }}
          >
            <SectionTitle>Equipamentos</SectionTitle>
            <InfoLine
              label="Inversor"
              value={
                <>
                  {data.qtd_inversores} {data.marca_inversor} {data.potencia_inversor}
                </>
              }
            />
            <InfoLine
              label="Placas"
              value={
                <>
                  {data.num_placas} {data.marca_placa} {data.potencia_placa}
                </>
              }
            />
          </div>

          <div
            style={{
              position: 'absolute',
              top: '470px',
              left: '650px',
              width: '530px',
            }}
          >
            <SectionTitle>Rendimentos</SectionTitle>
            <InfoLine label="Geração" value={`${fmtKwh(data.geracao_mensal)} /mês`} />
            <InfoLine label="Consumo" value={`${fmtKwh(data.consumo_mensal)} /mês`} />
            <InfoLine label="Excedente" value={`${fmtKwh(data.excedente_kwh)} /mês`} />
          </div>

          {/* Texto descritivo do escopo */}
          <div
            style={{
              position: 'absolute',
              top: '670px',
              left: '60px',
              right: '60px',
              padding: '18px 24px',
              background: '#fafaf6',
              border: `1px dashed ${LIGHT_GRAY}`,
              borderRadius: '4px',
              fontSize: '13px',
              color: DARK,
              lineHeight: 1.6,
              textAlign: 'center',
            }}
          >
            Sistema solar + Material de instalação + Análise de sombreamento 3D com drone +
            Homologação + <strong>3 Anos de garantia</strong> de instalação e acompanhamento
          </div>

          {/* Bloco INVESTIMENTO */}
          <div
            style={{
              position: 'absolute',
              top: '820px',
              left: '60px',
              right: '60px',
            }}
          >
            <h2
              style={{
                fontSize: '38px',
                color: OLIVE,
                fontWeight: 300,
                margin: 0,
                letterSpacing: '-0.5px',
              }}
            >
              Investimento
            </h2>
            <div style={{ fontSize: '16px', color: DARK, fontWeight: 700, marginTop: '4px' }}>
              sistema completo de energia solar fotovoltaica
            </div>
          </div>

          {/* À vista (destaque) */}
          <div
            style={{
              position: 'absolute',
              top: '920px',
              left: '60px',
              right: '60px',
              padding: '18px 30px',
              background: OLIVE,
              color: '#fff',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ fontSize: '20px', fontWeight: 700 }}>À vista</div>
            <div style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-0.5px' }}>
              R$ {fmtMoney(data.preco_vista)}
            </div>
          </div>

          {/* Tabela de parcelas (5 colunas) */}
          <div
            style={{
              position: 'absolute',
              top: '1020px',
              left: '60px',
              right: '60px',
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '12px',
            }}
          >
            {([
              { label: '72x', value: data.parcela_72x },
              { label: '60x', value: data.parcela_60x },
              { label: '48x', value: data.parcela_48x },
              { label: '36x', value: data.parcela_36x },
              { label: '24x', value: data.parcela_24x },
            ] as const).map((p) => (
              <div
                key={p.label}
                style={{
                  background: '#fff',
                  border: `2px solid ${OLIVE}`,
                  borderRadius: '6px',
                  padding: '14px 8px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    color: GRAY,
                    lineHeight: 1,
                    marginBottom: '6px',
                  }}
                >
                  {p.label}
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: OLIVE,
                    lineHeight: 1.2,
                  }}
                >
                  R$ {fmtMoney(p.value)}
                </div>
              </div>
            ))}
          </div>

          {/* Validade */}
          <div
            style={{
              position: 'absolute',
              bottom: '95px',
              left: '60px',
              right: '60px',
              fontSize: '12px',
              color: GRAY,
              fontStyle: 'italic',
              textAlign: 'center',
            }}
          >
            Proposta válida por 3 dias a partir da data de emissão.
          </div>

          <PageDataFooter />
        </Page>

        {/* ============ PÁGINA 3 — INSTALAÇÕES (FOTOS DO TIME) ============ */}
        <Page bg={bgPage3} />

        {/* ============ PÁGINA 4 — SOLUÇÕES (PORTFÓLIO) ============ */}
        <Page bg={bgPage4} />
      </div>
    );
  },
);

PropostaTemplatePages.displayName = 'PropostaTemplatePages';
