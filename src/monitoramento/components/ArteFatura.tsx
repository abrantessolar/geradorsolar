import React, { forwardRef } from 'react';
import logoTls from '@/assets/proposta-template/logo-tls-color.png';

// Arte do relatório "Quanto sua casa consumiu?" (Fase 4, pós-venda).
// Redesenhada em 2026-10-17 pra usar a MESMA identidade visual das
// propostas comerciais (PropostaPlacaTemplate.tsx) — mesma paleta, mesma
// tipografia (Bricolage Grotesque + Inter, já carregadas globalmente em
// index.html), mesmo tratamento de card/stat — em vez de cores/estilo
// genéricos. Pedido do usuário: "bem bonito, alinhado e profissional",
// no mesmo padrão de qualidade das propostas.
//
// Tamanho fixo 1080×1350 (4:5, bom pra WhatsApp/Instagram), capturado com
// html2canvas em resolução previsível — por isso tudo em `px` fixo, sem
// classes Tailwind responsivas.

const VERDE = '#4A5A2A';
const VERDE_ESC = '#2F3A1A';
const OURO = '#E8B84B';
const OURO_ESC = '#9C7412';
const LINHA = '#DED7C6';
const TEXTO = '#232717';
const MUTED = '#6F7360';
const BEGE = '#FAF8F2';
const WHITE = '#ffffff';

const FONT = 'Inter, Arial, Helvetica, sans-serif';
const DISPLAY = '"Bricolage Grotesque", Inter, Arial, sans-serif';

const PAD = 80;
const W = 1080;
const CONTENT_W = W - PAD * 2; // 920

function formatarKwh(valor: number): string {
  return `${Math.round(valor).toLocaleString('pt-BR')} kWh`;
}

// Card de estatística (rótulo + valor) — mesmo princípio do StatBox das
// propostas comerciais: rótulo pequeno em caixa alta e muted, valor grande
// em Bricolage Grotesque. Substitui o antigo par "texto solto + chip".
function StatCard({
  label,
  valor,
  destaque = false,
  tamanhoValor = 28,
  align = 'left',
}: {
  label: string;
  valor: string;
  destaque?: boolean;
  tamanhoValor?: number;
  align?: 'left' | 'center' | 'right';
}) {
  return (
    <div
      style={{
        // `display:table` (não `inline-block`) de propósito: o html2canvas
        // tem um bug em que um elemento `inline-block`/`inline-flex`/
        // `inline-table` contendo filhos em bloco (como os dois <div> de
        // rótulo/valor abaixo) perde o TEXTO inteiro na exportação — a
        // borda/fundo aparecem, o conteúdo some (confirmado com repro
        // mínima fora do React, variando display/float/flex isoladamente).
        // `table` é block-level mas, assim como `inline-block`, encolhe
        // pro conteúdo (shrink-to-fit) sem precisar de width fixo — por
        // isso o alinhamento usa margin em vez de depender de ser inline.
        display: 'table',
        margin: align === 'center' ? '0 auto' : align === 'right' ? '0 0 0 auto' : 0,
        background: WHITE,
        border: `1px solid ${LINHA}`,
        borderRadius: 14,
        padding: '14px 22px',
        textAlign: align,
      }}
    >
      <div style={{ fontSize: 14, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: DISPLAY,
          fontSize: tamanhoValor,
          fontWeight: 600,
          color: destaque ? OURO_ESC : VERDE,
          letterSpacing: '-0.01em',
          lineHeight: 1.15,
          marginTop: 4,
          whiteSpace: 'nowrap',
        }}
      >
        {valor}
      </div>
    </div>
  );
}

function IconeCasa() {
  return (
    <svg width="116" height="104" viewBox="0 0 116 104" fill="none">
      <path d="M4 48 L58 6 L112 48" stroke={VERDE_ESC} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="20" y="44" width="76" height="54" rx="2" fill="none" stroke={VERDE_ESC} strokeWidth="8" />
      <rect x="31" y="56" width="20" height="20" rx="1" fill="none" stroke={VERDE_ESC} strokeWidth="5" />
      <rect x="70" y="60" width="18" height="38" rx="1.5" fill={VERDE_ESC} />
    </svg>
  );
}

function IconePoste() {
  return (
    <svg width="116" height="116" viewBox="0 0 116 116" fill="none">
      <line x1="26" y1="112" x2="26" y2="10" stroke={VERDE_ESC} strokeWidth="7" strokeLinecap="round" />
      <line x1="86" y1="112" x2="86" y2="36" stroke={VERDE_ESC} strokeWidth="7" strokeLinecap="round" />
      <line x1="9" y1="20" x2="43" y2="20" stroke={VERDE_ESC} strokeWidth="7" strokeLinecap="round" />
      <line x1="9" y1="34" x2="43" y2="34" stroke={VERDE_ESC} strokeWidth="7" strokeLinecap="round" />
      <line x1="70" y1="43" x2="102" y2="43" stroke={VERDE_ESC} strokeWidth="7" strokeLinecap="round" />
      <line x1="16" y1="20" x2="76" y2="43" stroke={OURO_ESC} strokeWidth="2.5" />
      <line x1="16" y1="34" x2="76" y2="43" stroke={OURO_ESC} strokeWidth="2.5" />
      <line x1="38" y1="20" x2="96" y2="43" stroke={OURO_ESC} strokeWidth="2.5" />
    </svg>
  );
}

function IconeSol() {
  // Os 8 raios eram desenhados com um <line> fixo + atributo SVG
  // `transform="rotate(...)"` — o html2canvas some com eles na exportação
  // (mesma classe de bug das setas antigas com CSS rotate: qualquer
  // transformação/rotação aplicada a uma primitiva SVG não é confiável
  // aqui). Fix: calcular as coordenadas de cada raio já rotacionadas em
  // JS (trigonometria), sem nenhum `transform`.
  const cx = 64;
  const cy = 38;
  const raioInterno = 20;
  const raioExterno = 38;
  const raios = Array.from({ length: 8 }, (_, i) => {
    const angulo = (i * 45 * Math.PI) / 180;
    const sen = Math.sin(angulo);
    const cos = Math.cos(angulo);
    return {
      x1: cx + raioInterno * sen,
      y1: cy - raioInterno * cos,
      x2: cx + raioExterno * sen,
      y2: cy - raioExterno * cos,
    };
  });
  return (
    <svg width="128" height="128" viewBox="0 0 128 128" fill="none">
      {raios.map((r, i) => (
        <line key={i} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke={OURO} strokeWidth="5" strokeLinecap="round" />
      ))}
      <circle cx={cx} cy={cy} r={raioInterno} fill={OURO} />
      {[0, 1].map((linha) =>
        [0, 1, 2, 3].map((col) => (
          <rect
            key={`${linha}-${col}`}
            x={14 + col * 26}
            y={78 + linha * 23}
            width="22"
            height="19"
            rx="2"
            fill={VERDE_ESC}
            stroke={BEGE}
            strokeWidth="2"
          />
        ))
      )}
    </svg>
  );
}

// Pontos de um triângulo (ponta de seta) terminando em (x2,y2), apontando
// na direção de (x1,y1) → (x2,y2).
function pontosTriangulo(x1: number, y1: number, x2: number, y2: number, tamanho = 10): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const comprimento = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / comprimento;
  const uy = dy / comprimento;
  const px = -uy;
  const py = ux;
  const baseX = x2 - ux * tamanho;
  const baseY = y2 - uy * tamanho;
  const largura = tamanho * 0.6;
  return `${x2},${y2} ${baseX + px * largura},${baseY + py * largura} ${baseX - px * largura},${baseY - py * largura}`;
}

// Seta com ponta desenhada como <polygon>, não como SVG <marker> — o
// html2canvas não suporta `<marker>` (a seta inteira some na exportação).
function SetaComPonta({
  x1,
  y1,
  x2,
  y2,
  cor = VERDE_ESC,
  espessura = 5,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  cor?: string;
  espessura?: number;
}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const comprimento = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / comprimento;
  const uy = dy / comprimento;
  const corteX = x2 - ux * 8;
  const corteY = y2 - uy * 8;
  return (
    <>
      <line x1={x1} y1={y1} x2={corteX} y2={corteY} stroke={cor} strokeWidth={espessura} strokeLinecap="round" />
      <polygon points={pontosTriangulo(x1, y1, x2, y2)} fill={cor} />
    </>
  );
}

export interface DadosArteFatura {
  clienteNome: string;
  numeroConta: number;
  periodoLabel: string;
  geracaoKwh: number;
  consumoConcessionariaKwh: number;
  consumoRealCasaKwh: number;
  consumoSimultaneidadeKwh: number;
  energiaInjetadaKwh: number;
  saldoMesKwh: number;
  saldoAcumuladoKwh: number;
}

const ArteFatura = forwardRef<HTMLDivElement, DadosArteFatura>((dados, ref) => {
  const percentualSolarDireto =
    dados.consumoRealCasaKwh > 0 ? Math.round((dados.consumoSimultaneidadeKwh / dados.consumoRealCasaKwh) * 100) : null;

  // Grade do diagrama — tudo calculado a partir de CONTENT_W (920) pra
  // ficar simétrico de verdade (coluna da casa e da concessionária à
  // mesma distância do centro), em vez de posições "no olho".
  //
  // `diagramaTop` é relativo ao TOPO DO PRÓPRIO container "Diagrama"
  // (que tem position:relative e 700px de altura) — não à página inteira.
  // Antes estava em 560, um valor que fazia sentido como coordenada
  // absoluta do canvas, mas usado aqui como offset relativo empurrava
  // todo o conteúdo (incl. a seção "Geração solar") pra muito perto do
  // fim do container de 700px, invadindo visualmente o rodapé. Os 56px
  // abaixo deixam espaço só pro card "Consumo da concessionária", que
  // flutua 50px acima da linha dos ícones.
  const diagramaTop = 56;
  const linhaIconesY = diagramaTop + 52; // centro vertical dos ícones casa/poste
  const casaIconeX = 0; // relativo ao início do diagrama (PAD)
  const concIconeX = CONTENT_W - 116; // alinhado à direita
  const centroX = CONTENT_W / 2;

  const setaHorizontal = { x1: concIconeX - 24, y1: linhaIconesY, x2: casaIconeX + 116 + 24, y2: linhaIconesY };

  const labelsY = diagramaTop + 260;
  const solY = diagramaTop + 374;
  const solCentroX = PAD + centroX;
  const solTopoY = solY + 10;

  const setaCasa = { x1: solCentroX - 30, y1: solTopoY + 8, x2: PAD + 170, y2: labelsY + 92 };
  const setaConcessionaria = { x1: solCentroX + 30, y1: solTopoY + 8, x2: PAD + CONTENT_W - 170, y2: labelsY + 92 };

  return (
    <div
      ref={ref}
      style={{
        width: W,
        height: 1350,
        background: BEGE,
        position: 'relative',
        fontFamily: FONT,
        color: TEXTO,
        overflow: 'hidden',
      }}
    >
      {/* decoração sutil no canto superior direito */}
      <div
        style={{
          position: 'absolute',
          top: -70,
          right: -70,
          width: 280,
          height: 280,
          borderRadius: '50%',
          background: 'rgba(232,184,75,0.18)',
        }}
      />

      {/* Cabeçalho */}
      <div style={{ padding: `${PAD}px ${PAD}px 0` }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: OURO_ESC, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Relatório de consumo
        </div>
        <h1
          style={{
            fontFamily: DISPLAY,
            fontSize: 58,
            fontWeight: 600,
            color: VERDE,
            margin: '10px 0 0 0',
            lineHeight: 1.04,
            letterSpacing: '-0.02em',
          }}
        >
          Quanto sua casa
        </h1>
        <h1
          style={{
            fontFamily: DISPLAY,
            fontSize: 58,
            fontWeight: 600,
            color: OURO_ESC,
            margin: 0,
            lineHeight: 1.04,
            letterSpacing: '-0.02em',
          }}
        >
          consumiu?
        </h1>
        <p style={{ fontSize: 22, color: MUTED, marginTop: 16, maxWidth: 740, lineHeight: 1.45 }}>
          Descubra quanto da energia veio da geração solar e quanto veio da concessionária.
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 30,
            paddingBottom: 26,
            borderBottom: `1px solid ${LINHA}`,
          }}
        >
          <div style={{ fontSize: 21, fontWeight: 700, color: VERDE_ESC }}>
            {dados.clienteNome}
            <span style={{ color: MUTED, fontWeight: 500 }}> — {dados.numeroConta}ª conta · {dados.periodoLabel}</span>
          </div>
          {percentualSolarDireto != null && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: 'rgba(232,184,75,0.18)',
                color: OURO_ESC,
                fontWeight: 700,
                fontSize: 19,
                padding: '10px 20px',
                borderRadius: 999,
                whiteSpace: 'nowrap',
              }}
            >
              {percentualSolarDireto}% direto do sol
            </div>
          )}
        </div>
      </div>

      {/* Diagrama */}
      <div style={{ position: 'relative', margin: `0 ${PAD}px`, height: 700 }}>
        {/* Todas as setas num único SVG cobrindo o diagrama, sem offset
            próprio (ver nota de depuração em FaturaUsina.tsx) */}
        <svg width={CONTENT_W} height="700" viewBox={`0 0 ${CONTENT_W} 700`} style={{ position: 'absolute', left: 0, top: 0 }}>
          <SetaComPonta x1={setaHorizontal.x1} y1={setaHorizontal.y1} x2={setaHorizontal.x2} y2={setaHorizontal.y2} espessura={6} />
          <SetaComPonta x1={setaCasa.x1} y1={setaCasa.y1} x2={setaCasa.x2} y2={setaCasa.y2} cor={OURO_ESC} />
          <SetaComPonta
            x1={setaConcessionaria.x1}
            y1={setaConcessionaria.y1}
            x2={setaConcessionaria.x2}
            y2={setaConcessionaria.y2}
            cor={OURO_ESC}
          />
        </svg>

        {/* Casa (esquerda) */}
        <div style={{ position: 'absolute', left: casaIconeX, top: diagramaTop - 4 }}>
          <IconeCasa />
          <p style={{ fontFamily: DISPLAY, fontSize: 24, fontWeight: 600, margin: '12px 0 0 0', color: VERDE }}>Sua casa</p>
          <div style={{ marginTop: 10 }}>
            <StatCard label="Consumo real da casa" valor={formatarKwh(dados.consumoRealCasaKwh)} />
          </div>
        </div>

        {/* Concessionária (direita) */}
        <div style={{ position: 'absolute', left: concIconeX, top: diagramaTop - 4, textAlign: 'right' }}>
          <IconePoste />
          <p style={{ fontFamily: DISPLAY, fontSize: 24, fontWeight: 600, margin: '12px 0 0 0', color: VERDE }}>
            Concessionária
          </p>
        </div>

        {/* Consumo da concessionária, centrado sobre a seta horizontal */}
        <div style={{ position: 'absolute', left: centroX - 140, top: diagramaTop - 50, width: 280, textAlign: 'center' }}>
          <StatCard label="Consumo da concessionária" valor={formatarKwh(dados.consumoConcessionariaKwh)} align="center" />
        </div>

        {/* Consumo em simultaneidade (esquerda, abaixo das setas) */}
        <div style={{ position: 'absolute', left: 0, top: labelsY }}>
          <StatCard label="Consumo em simultaneidade" valor={formatarKwh(dados.consumoSimultaneidadeKwh)} />
        </div>

        {/* Energia injetada + saldo do mês (direita, abaixo das setas) */}
        <div style={{ position: 'absolute', right: 0, top: labelsY, textAlign: 'right' }}>
          <StatCard label="Energia injetada" valor={formatarKwh(dados.energiaInjetadaKwh)} align="right" />
          <div style={{ marginTop: 12 }}>
            <StatCard label="+ Saldo do mês" valor={formatarKwh(dados.saldoMesKwh)} align="right" />
          </div>
        </div>

        {/* Geração solar (centro-baixo) */}
        <div style={{ position: 'absolute', left: centroX - 130, top: solY, width: 260, textAlign: 'center' }}>
          <IconeSol />
          <p style={{ fontFamily: DISPLAY, fontSize: 26, fontWeight: 600, margin: '10px 0 10px 0', color: VERDE }}>
            Geração solar
          </p>
          <StatCard label="Total do período" valor={formatarKwh(dados.geracaoKwh)} destaque align="center" tamanhoValor={32} />
        </div>
      </div>

      {/* Rodapé */}
      <div
        style={{
          position: 'absolute',
          left: PAD,
          right: PAD,
          bottom: 64,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: 16 }}>
          <StatCard label="Saldo do mês" valor={formatarKwh(dados.saldoMesKwh)} />
          <StatCard label="Saldo acumulado" valor={formatarKwh(dados.saldoAcumuladoKwh)} destaque />
        </div>
        <img src={logoTls} alt="Três Lagoas Solar" style={{ height: 84, objectFit: 'contain' }} />
      </div>

      <div style={{ position: 'absolute', left: 0, bottom: 0, width: '100%', height: 6, background: OURO }} />
    </div>
  );
});

ArteFatura.displayName = 'ArteFatura';
export default ArteFatura;
