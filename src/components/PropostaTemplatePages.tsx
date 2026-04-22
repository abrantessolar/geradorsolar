/**
 * Renderiza as 4 páginas da proposta no MESMO layout do template DOCX
 * (proposta_template.docx). As 4 imagens de fundo (.jpg) foram extraídas do
 * template e os textos com variáveis são posicionados em cima usando coordenadas
 * convertidas das posições EMU originais do Word.
 *
 * Este componente fica fora da tela (offscreen) e serve apenas para o
 * html2canvas → jsPDF capturar e gerar o PDF idêntico ao Word.
 */
import { forwardRef } from 'react';
import bgPage1 from '@/assets/proposta-template/image3.jpg';
import bgPage2 from '@/assets/proposta-template/image5.jpg';
import bgPage3 from '@/assets/proposta-template/image6.jpg';
import bgPage4 from '@/assets/proposta-template/image4.jpg';
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

// A4 em EMU (English Metric Units) — sistema usado pelo Word
const A4_W_EMU = 7595235; // 210mm
const A4_H_EMU = 10692130; // 297mm

// Dimensões da página em pixels para renderização (150 dpi A4)
const PAGE_W = 1241;
const PAGE_H = 1755;

const emuToPx = (emu: number, axis: 'x' | 'y') =>
  axis === 'x' ? (emu / A4_W_EMU) * PAGE_W : (emu / A4_H_EMU) * PAGE_H;

const fmtKwh = (n: number) => `${formatNumber(n, 0)} kWh`;
const fmtMoney = (n: number) => formatCurrency(n).replace('R$', '').trim();

interface PageProps {
  bg: string;
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
      }}
    >
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
      {children}
    </div>
  );
}

// Cores aproximadas extraídas do template
const COLOR_OLIVE = '#5b6a2a'; // verde oliva da marca
const COLOR_GRAY = '#808080';
const COLOR_DARK = '#2b2b2b';

export const PropostaTemplatePages = forwardRef<HTMLDivElement, { data: PropostaTemplateData }>(
  ({ data }, ref) => {
    return (
      <div ref={ref} style={{ width: `${PAGE_W}px`, background: '#fff' }}>
        {/* ============ PÁGINA 1 — CAPA ============ */}
        <Page bg={bgPage1}>
          {/* Bloco "[cliente_nome] / [geracao_mensal] kWh por mês"
              EMU: H=2122188 V=7675004  ext=4426477x976393 */}
          <div
            style={{
              position: 'absolute',
              left: `${emuToPx(2122188, 'x')}px`,
              top: `${emuToPx(7675004, 'y')}px`,
              width: `${emuToPx(4426477, 'x')}px`,
              height: `${emuToPx(976393, 'y')}px`,
              fontFamily: 'Arial, sans-serif',
              color: COLOR_DARK,
              lineHeight: 1.2,
            }}
          >
            <div style={{ fontSize: '22px', fontWeight: 700 }}>{data.cliente_nome}</div>
            <div style={{ fontSize: '18px', marginTop: '4px' }}>
              <strong>{fmtKwh(data.geracao_mensal)}</strong> por mês
            </div>
          </div>

          {/* "À vista: R$ [preco]"  H=1829435 V=9220835 ext=3467100x590550 */}
          <div
            style={{
              position: 'absolute',
              left: `${emuToPx(1829435, 'x')}px`,
              top: `${emuToPx(9220835, 'y')}px`,
              width: `${emuToPx(3467100, 'x')}px`,
              fontFamily: 'Arial, sans-serif',
              color: COLOR_OLIVE,
              fontSize: '26px',
              fontWeight: 700,
            }}
          >
            À vista: R$ {fmtMoney(data.preco_vista)}
          </div>

          {/* "Proposta válida por 3 dias" H=1821180 V=9511099 */}
          <div
            style={{
              position: 'absolute',
              left: `${emuToPx(1821180, 'x')}px`,
              top: `${emuToPx(9511099, 'y')}px`,
              fontFamily: 'Arial, sans-serif',
              color: COLOR_GRAY,
              fontSize: '14px',
              fontStyle: 'italic',
            }}
          >
            Proposta válida por 3 dias
          </div>

          {/* "[responsavel_nome]" H=1969057 V=9160841 — abaixo de "Representante:" */}
          <div
            style={{
              position: 'absolute',
              left: `${emuToPx(1969057, 'x')}px`,
              top: `${emuToPx(9160841, 'y') - 20}px`,
              fontFamily: 'Arial, sans-serif',
              color: COLOR_GRAY,
              fontSize: '14px',
              fontWeight: 700,
            }}
          >
            {data.responsavel_nome}
          </div>

          {/* Número da proposta (canto inferior direito) */}
          <div
            style={{
              position: 'absolute',
              right: '40px',
              bottom: '24px',
              fontFamily: 'Arial, sans-serif',
              color: COLOR_GRAY,
              fontSize: '11px',
            }}
          >
            {data.numero_proposta}
          </div>
        </Page>

        {/* ============ PÁGINA 2 — ESPECIFICAÇÕES + INVESTIMENTO ============ */}
        <Page bg={bgPage2}>
          {/* Equipamentos (Inversor / Placas)  H=777875 V=2781935 ext=7169150x742950 */}
          <div
            style={{
              position: 'absolute',
              left: `${emuToPx(777875, 'x')}px`,
              top: `${emuToPx(2781935, 'y')}px`,
              width: `${emuToPx(7169150, 'x') / 2 - 20}px`,
              fontFamily: 'Arial, sans-serif',
              color: COLOR_DARK,
              fontSize: '15px',
              lineHeight: 1.5,
            }}
          >
            <div>
              <strong>Inversor:</strong> {data.qtd_inversores} {data.marca_inversor}{' '}
              {data.potencia_inversor}
            </div>
            <div style={{ marginTop: '6px' }}>
              <strong>Placas:</strong> {data.num_placas} {data.marca_placa} {data.potencia_placa}
            </div>
          </div>

          {/* Rendimentos (Geração / Consumo / Excedente) H=3870960 V=2766060 */}
          <div
            style={{
              position: 'absolute',
              left: `${emuToPx(3870960, 'x')}px`,
              top: `${emuToPx(2766060, 'y')}px`,
              width: `${emuToPx(4543425, 'x')}px`,
              fontFamily: 'Arial, sans-serif',
              color: COLOR_DARK,
              fontSize: '14px',
              lineHeight: 1.5,
            }}
          >
            <div>
              <strong>Geração:</strong> {fmtKwh(data.geracao_mensal)} /mês
            </div>
            <div>
              <strong>Consumo:</strong> {fmtKwh(data.consumo_mensal)} /mês
            </div>
            <div>
              <strong>Excedente:</strong> {fmtKwh(data.excedente_kwh)} /mês
            </div>
          </div>

          {/* Texto "Sistema solar + Material..." H=749108 V=3981450 */}
          <div
            style={{
              position: 'absolute',
              left: `${emuToPx(749108, 'x')}px`,
              top: `${emuToPx(3981450, 'y')}px`,
              width: `${emuToPx(6125904, 'x')}px`,
              fontFamily: 'Arial, sans-serif',
              color: COLOR_DARK,
              fontSize: '13px',
              lineHeight: 1.45,
              textAlign: 'center',
            }}
          >
            Sistema solar + Material de instalação + Análise de sombreamento 3D com drone +
            Homologação + <strong>3 Anos de garantia</strong> de instalação e acompanhamento
          </div>

          {/* Parcelas — alinhadas sob 72X / 60X / 48X / 36X / 24X (Y ≈ 8700135) */}
          {/* Posições H das colunas no template:
              72X: H=670560   60X: H=1899285   48X: H=3137535   36X: H=4251959   24X: H=5509259 */}
          {([
            { h: 670560, label: '72x', value: data.parcela_72x },
            { h: 1899285, label: '60x', value: data.parcela_60x },
            { h: 3137535, label: '48x', value: data.parcela_48x },
            { h: 4251959, label: '36x', value: data.parcela_36x },
            { h: 5509259, label: '24x', value: data.parcela_24x },
          ] as const).map((p) => (
            <div
              key={p.label}
              style={{
                position: 'absolute',
                left: `${emuToPx(p.h, 'x')}px`,
                top: `${emuToPx(8700135, 'y')}px`,
                width: '180px',
                fontFamily: 'Arial, sans-serif',
                color: COLOR_OLIVE,
                fontSize: '15px',
                fontWeight: 700,
                textAlign: 'left',
              }}
            >
              R$ {fmtMoney(p.value)}
            </div>
          ))}

          <div
            style={{
              position: 'absolute',
              right: '40px',
              bottom: '40px',
              fontFamily: 'Arial, sans-serif',
              color: COLOR_GRAY,
              fontSize: '11px',
            }}
          >
            {data.numero_proposta}
          </div>
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
