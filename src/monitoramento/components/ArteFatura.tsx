import React, { forwardRef } from 'react';
import logoTls from '@/assets/proposta-template/logo-tls-color.png';

// Arte do relatório "Quanto sua casa consumiu?" (Fase 4, pós-venda).
//
// Redesenhada em 2026-10-17 pra usar a identidade visual das propostas
// comerciais (PropostaPlacaTemplate.tsx) — primeira versão. Reajustada no
// mesmo dia pra seguir o layout que o próprio usuário desenhou no Canva
// (arquivo "Ajuste_de_Layout_do_Design.svg"): logo grande no topo, caixa
// de "simultaneidade %" no canto superior direito, torre de transmissão
// no lugar do poste simples, rótulos das setas diagonais escritos ao
// longo da própria seta (rotacionados), "Saldo do mês"/"Saldo acumulado"
// como uma coluna ao lado do diagrama (não mais só no rodapé), e um novo
// rodapé financeiro opcional (quanto pagou / sem energia solar / economia
// estimada), só quando o usuário informa a tarifa (R$/kWh) no formulário.
//
// Altura NÃO é mais fixa (era 1350px) — o container cresce com o
// conteúdo (a seção financeira é opcional), capturado com
// `windowHeight: el.offsetHeight` em gerarImagemFatura.ts.

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

function formatarReais(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Rótulo pequeno em caixa alta (nome do campo) — usado sozinho, sem caixa
// própria, ficando por cima ou ao lado da caixa de valor (CaixaValor).
function Rotulo({
  children,
  align = 'left',
  tamanho = 15,
}: {
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  tamanho?: number;
}) {
  return (
    <p
      style={{
        fontSize: tamanho,
        fontWeight: 700,
        color: VERDE_ESC,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        textAlign: align,
        margin: 0,
        lineHeight: 1.3,
      }}
    >
      {children}
    </p>
  );
}

// Caixa de valor "nua" (sem rótulo embutido) — o rótulo vem de fora,
// como no layout de referência do usuário (texto solto acima da caixa,
// não dentro dela). Ver StatCard abaixo pro padrão com rótulo embutido,
// usado só nas 3 caixas financeiras do rodapé.
function CaixaValor({
  valor,
  align = 'left',
  largura,
  destaque = false,
  tamanho = 28,
}: {
  valor: string;
  align?: 'left' | 'center' | 'right';
  largura?: number;
  destaque?: boolean;
  tamanho?: number;
}) {
  return (
    <div
      style={{
        // `display:table`, não `inline-block` — ver nota em StatCard.
        display: 'table',
        margin: align === 'center' ? '0 auto' : align === 'right' ? '0 0 0 auto' : 0,
        minWidth: largura,
        background: WHITE,
        border: `1px solid ${LINHA}`,
        borderRadius: 14,
        padding: '13px 20px',
        textAlign: align,
      }}
    >
      <span
        style={{
          fontFamily: DISPLAY,
          fontSize: tamanho,
          fontWeight: 600,
          color: destaque ? OURO_ESC : VERDE,
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap',
        }}
      >
        {valor}
      </span>
    </div>
  );
}

// Card de estatística com rótulo EMBUTIDO na caixa (rótulo pequeno em
// cima, valor grande embaixo) — mesmo princípio do StatBox das propostas
// comerciais. Usado só nas 3 caixas financeiras do rodapé (no layout de
// referência, essas têm o rótulo dentro da caixa, diferente das outras).
function StatCard({
  label,
  valor,
  destaque = false,
  tamanhoValor = 26,
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
        width: '100%',
        margin: align === 'center' ? '0 auto' : align === 'right' ? '0 0 0 auto' : 0,
        background: WHITE,
        border: `1px solid ${LINHA}`,
        borderRadius: 14,
        padding: '14px 20px',
        textAlign: align,
      }}
    >
      <div style={{ fontSize: 13, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>
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

// Torre de transmissão (treliça) no lugar do poste simples antigo — pedido
// do usuário (referência visual própria). Construída por geometria (não
// SVG `transform`) em alguns níveis de travessas + tirantes em X, mais um
// braço horizontal no topo com fios — mesmo princípio de "calcular em JS
// em vez de usar transform" já usado no ícone do sol.
function IconeTorre() {
  const cx = 64;
  const topoY = 18;
  const baseY = 134;
  const topoMeiaLargura = 9;
  const baseMeiaLargura = 48;
  const niveis = 4;

  const linhas: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = 0; i < niveis; i++) {
    const t0 = i / niveis;
    const t1 = (i + 1) / niveis;
    const y0 = topoY + (baseY - topoY) * t0;
    const y1 = topoY + (baseY - topoY) * t1;
    const hw0 = topoMeiaLargura + (baseMeiaLargura - topoMeiaLargura) * t0;
    const hw1 = topoMeiaLargura + (baseMeiaLargura - topoMeiaLargura) * t1;
    linhas.push({ x1: cx - hw0, y1: y0, x2: cx + hw0, y2: y0 }); // travessa horizontal
    linhas.push({ x1: cx - hw0, y1: y0, x2: cx + hw1, y2: y1 }); // tirante \
    linhas.push({ x1: cx + hw0, y1: y0, x2: cx - hw1, y2: y1 }); // tirante /
  }

  return (
    <svg width="128" height="150" viewBox="0 0 128 150" fill="none">
      {/* pernas externas */}
      <line x1={cx - topoMeiaLargura} y1={topoY} x2={cx - baseMeiaLargura} y2={baseY} stroke={TEXTO} strokeWidth="5" strokeLinecap="round" />
      <line x1={cx + topoMeiaLargura} y1={topoY} x2={cx + baseMeiaLargura} y2={baseY} stroke={TEXTO} strokeWidth="5" strokeLinecap="round" />
      {/* base */}
      <line x1={cx - baseMeiaLargura} y1={baseY} x2={cx + baseMeiaLargura} y2={baseY} stroke={TEXTO} strokeWidth="5" strokeLinecap="round" />
      {/* travessas + tirantes em X */}
      {linhas.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={TEXTO} strokeWidth="3.5" strokeLinecap="round" />
      ))}
      {/* braço horizontal no topo + fios */}
      <line x1={cx - 42} y1={topoY - 8} x2={cx + 42} y2={topoY - 8} stroke={TEXTO} strokeWidth="5" strokeLinecap="round" />
      <line x1={cx - 42} y1={topoY - 8} x2={cx - 42} y2={topoY + 4} stroke={TEXTO} strokeWidth="3.5" strokeLinecap="round" />
      <line x1={cx + 42} y1={topoY - 8} x2={cx + 42} y2={topoY + 4} stroke={TEXTO} strokeWidth="3.5" strokeLinecap="round" />
      <line x1={cx} y1={topoY - 8} x2={cx} y2={topoY + 2} stroke={TEXTO} strokeWidth="3.5" strokeLinecap="round" />
      {/* fios saindo lateralmente, como no ícone antigo */}
      <line x1={cx - 42} y1={topoY - 2} x2={cx - 70} y2={topoY + 28} stroke={OURO_ESC} strokeWidth="2.5" />
      <line x1={cx + 42} y1={topoY - 2} x2={cx + 70} y2={topoY + 28} stroke={OURO_ESC} strokeWidth="2.5" />
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

// Rótulo escrito ao longo de uma seta diagonal, rotacionado via CSS
// `transform: rotate()` num <div> normal (TESTADO isoladamente antes de
// usar aqui: ao contrário do `transform` em atributo SVG — ver IconeSol —
// o `transform` CSS num elemento HTML comum renderiza normalmente no
// html2canvas).
function RotuloNaSeta({
  x1,
  y1,
  x2,
  y2,
  t = 0.42,
  children,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  // Posição ao longo da seta (0 = ponto inicial, 1 = ponto final). Usar
  // um pouco menos que 0.5 (padrão 0.42) afasta o rótulo da caixa de
  // valor que fica na ponta da seta, evitando que o texto encoste nela.
  t?: number;
  children: React.ReactNode;
}) {
  const px = x1 + (x2 - x1) * t;
  const py = y1 + (y2 - y1) * t;
  let angulo = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  // Normaliza pra nunca ficar de cabeça pra baixo (texto sempre legível
  // da esquerda pra direita, mesmo quando a seta aponta pra "trás").
  if (angulo > 90) angulo -= 180;
  if (angulo < -90) angulo += 180;
  const largura = 160;
  return (
    <div
      style={{
        position: 'absolute',
        left: px - largura / 2,
        top: py - 24,
        width: largura,
        textAlign: 'center',
        transform: `rotate(${angulo}deg)`,
        transformOrigin: 'center',
      }}
    >
      <Rotulo align="center" tamanho={13}>
        {children}
      </Rotulo>
    </div>
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
  // R$/kWh opcional — quando ausente, a seção financeira do rodapé não é
  // exibida (ver migração 0012).
  tarifaKwh: number | null;
}

const ArteFatura = forwardRef<HTMLDivElement, DadosArteFatura>((dados, ref) => {
  const percentualSolarDireto =
    dados.consumoRealCasaKwh > 0 ? Math.round((dados.consumoSimultaneidadeKwh / dados.consumoRealCasaKwh) * 100) : null;

  // Seção financeira — só quando o usuário informou a tarifa. Fórmula
  // definida pelo próprio usuário na nota de rodapé do layout de
  // referência: "Estimativa = consumo real × tarifa informada". "Quanto
  // pagou" usa o consumo da CONCESSIONÁRIA (o que de fato foi faturado);
  // "sem energia solar" usa o consumo REAL da casa (toda a energia que a
  // casa precisaria comprar se não tivesse geração própria).
  const tarifa = dados.tarifaKwh;
  const quantoPagou = tarifa != null ? dados.consumoConcessionariaKwh * tarifa : null;
  const semSolar = tarifa != null ? dados.consumoRealCasaKwh * tarifa : null;
  const economiaEstimada = quantoPagou != null && semSolar != null ? semSolar - quantoPagou : null;

  // Grade do diagrama — tudo relativo ao topo do próprio container
  // "Diagrama" (abaixo), nunca à página inteira (ver nota de depuração em
  // FaturaUsina.tsx sobre o bug do deslocamento duplo da versão anterior).
  const centroX = CONTENT_W / 2;
  const casaIconeX = 0;
  const torreIconeX = CONTENT_W - 128;

  // Linha dos ícones (casa/torre) e seta horizontal entre eles.
  const iconesY = 128; // topo dos ícones
  const casaCentroY = iconesY + 52; // centro vertical do ícone da casa (104 de altura)
  const setaHorizontal = { x1: torreIconeX - 20, y1: casaCentroY, x2: casaIconeX + 116 + 20, y2: casaCentroY };

  // "Consumo da concessionária" flutua acima da seta horizontal, centrado.
  const concRotuloY = iconesY - 92;
  const concCaixaY = concRotuloY + 38;

  // Rótulo + caixa sob a casa.
  const casaRotuloY = iconesY + 104 + 16;
  const casaCaixaY = casaRotuloY + 28;
  const casaCaixaBottom = casaCaixaY + 58;

  // Coluna "Saldo do mês / Saldo acumulado" ao lado direito, pareada com
  // a coluna da casa. Largura 170 (não 128) pra "Saldo acumulado:" caber
  // numa linha só — com menos espaço, o rótulo quebra em duas linhas e a
  // segunda linha fica escondida atrás da caixa de valor logo abaixo.
  const saldoLargura = 170;
  const saldoX = CONTENT_W - saldoLargura;
  const saldoMesRotuloY = casaRotuloY;
  const saldoMesCaixaY = casaCaixaY;
  const saldoAcumRotuloY = saldoMesCaixaY + 58 + 24;
  const saldoAcumCaixaY = saldoAcumRotuloY + 26;

  // Setas diagonais (simultaneidade à esquerda, injetada à direita) saindo
  // da área do sol pra duas caixas de valor mais abaixo. As duas caixas
  // ficam a uma distância SIMÉTRICA do centro (não "casa coluna até x=0" /
  // "direita até a borda") — senão a caixa da direita, espremida pela
  // coluna de saldo ao lado, fica muito mais perto do centro que a da
  // esquerda, e a seta da direita sai bem mais íngreme que a da esquerda
  // (quebra a simetria visual e aperta o rótulo rotacionado contra a
  // caixa). A distância usada (100px do centro) é a maior que ainda cabe
  // sem a caixa da direita encostar na coluna de saldo.
  const diagonalCaixaY = casaCaixaBottom + 56;
  const diagonalCaixaLargura = 160;
  const distanciaDoCentro = 100;
  const esquerdaCaixaX = centroX - distanciaDoCentro - diagonalCaixaLargura;
  const direitaCaixaX = centroX + distanciaDoCentro;

  const solY = diagonalCaixaY + 170;
  const solCentroX = centroX;
  const solTopoY = solY + 12;

  // Setas apontam pro CENTRO de cada caixa (não pra borda) — garante que
  // fiquem simétricas mesmo que as caixas não estejam mais a distâncias
  // diferentes da borda do diagrama.
  const setaSimultaneidade = {
    x1: solCentroX - 26,
    y1: solTopoY + 6,
    x2: esquerdaCaixaX + diagonalCaixaLargura / 2,
    y2: diagonalCaixaY + 54,
  };
  const setaInjetada = {
    x1: solCentroX + 26,
    y1: solTopoY + 6,
    x2: direitaCaixaX + diagonalCaixaLargura / 2,
    y2: diagonalCaixaY + 54,
  };

  const solRotuloY = solY + 128 + 12;
  const solCaixaY = solRotuloY + 34;
  const solCaixaBottom = solCaixaY + 72;

  const diagramaAltura = solCaixaBottom + 16;

  return (
    <div
      ref={ref}
      style={{
        width: W,
        background: BEGE,
        position: 'relative',
        fontFamily: FONT,
        color: TEXTO,
        overflow: 'hidden',
      }}
    >
      {/* Cabeçalho */}
      <div style={{ padding: `${PAD}px ${PAD}px 0` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: OURO_ESC, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Relatório de consumo
            </div>
            <h1
              style={{
                fontFamily: DISPLAY,
                fontSize: 52,
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
                fontSize: 52,
                fontWeight: 600,
                color: OURO_ESC,
                margin: 0,
                lineHeight: 1.04,
                letterSpacing: '-0.02em',
              }}
            >
              consumiu?
            </h1>
            <p style={{ fontSize: 20, color: MUTED, marginTop: 16, maxWidth: 560, lineHeight: 1.45 }}>
              Descubra quanto da energia veio da geração solar e quanto veio da concessionária.
            </p>
          </div>

          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 16 }}>
            <img src={logoTls} alt="Três Lagoas Solar" style={{ width: 280, objectFit: 'contain' }} />
            {percentualSolarDireto != null && (
              <div style={{ textAlign: 'right' }}>
                <Rotulo align="right">Simultaneidade %</Rotulo>
                <div style={{ marginTop: 8 }}>
                  <CaixaValor valor={`${percentualSolarDireto}%`} align="right" destaque />
                </div>
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            marginTop: 30,
            paddingBottom: 26,
            borderBottom: `1px solid ${LINHA}`,
          }}
        >
          <div style={{ fontSize: 21, fontWeight: 700, color: VERDE_ESC }}>
            {dados.clienteNome}
            <span style={{ color: MUTED, fontWeight: 500 }}> — {dados.numeroConta}ª conta · {dados.periodoLabel}</span>
          </div>
        </div>
      </div>

      {/* Diagrama */}
      <div style={{ position: 'relative', margin: `36px ${PAD}px 0`, height: diagramaAltura }}>
        {/* Todas as setas num único SVG cobrindo o diagrama, sem offset
            próprio (ver nota de depuração em FaturaUsina.tsx) */}
        <svg
          width={CONTENT_W}
          height={diagramaAltura}
          viewBox={`0 0 ${CONTENT_W} ${diagramaAltura}`}
          style={{ position: 'absolute', left: 0, top: 0 }}
        >
          <SetaComPonta x1={setaHorizontal.x1} y1={setaHorizontal.y1} x2={setaHorizontal.x2} y2={setaHorizontal.y2} espessura={6} />
          <SetaComPonta x1={setaSimultaneidade.x1} y1={setaSimultaneidade.y1} x2={setaSimultaneidade.x2} y2={setaSimultaneidade.y2} cor={OURO_ESC} />
          <SetaComPonta x1={setaInjetada.x1} y1={setaInjetada.y1} x2={setaInjetada.x2} y2={setaInjetada.y2} cor={OURO_ESC} />
        </svg>

        {/* Rótulos ao longo das setas diagonais — por cima do SVG das
            setas, por isso ficam fora dele (são <div>, não SVG). */}
        <RotuloNaSeta {...setaSimultaneidade}>Consumo em simultaneidade</RotuloNaSeta>
        <RotuloNaSeta {...setaInjetada}>Energia injetada</RotuloNaSeta>

        {/* Casa (esquerda) */}
        <div style={{ position: 'absolute', left: casaIconeX, top: iconesY }}>
          <IconeCasa />
        </div>
        <div style={{ position: 'absolute', left: casaIconeX, top: casaRotuloY, width: 220 }}>
          <Rotulo>Consumo real</Rotulo>
          <div style={{ marginTop: 8 }}>
            <CaixaValor valor={formatarKwh(dados.consumoRealCasaKwh)} largura={200} />
          </div>
        </div>

        {/* Torre de transmissão (direita) */}
        <div style={{ position: 'absolute', left: torreIconeX, top: iconesY - 18 }}>
          <IconeTorre />
        </div>

        {/* Consumo da concessionária, centrado sobre a seta horizontal */}
        <div style={{ position: 'absolute', left: centroX - 150, top: concRotuloY, width: 300, textAlign: 'center' }}>
          <Rotulo align="center">Consumo da concessionária</Rotulo>
          <div style={{ marginTop: 8 }}>
            <CaixaValor valor={formatarKwh(dados.consumoConcessionariaKwh)} align="center" largura={200} />
          </div>
        </div>

        {/* Consumo em simultaneidade — caixa de valor abaixo da seta,
            rótulo já está escrito na própria seta (RotuloNaSeta acima). */}
        <div style={{ position: 'absolute', left: esquerdaCaixaX, top: diagonalCaixaY, width: diagonalCaixaLargura }}>
          <CaixaValor valor={formatarKwh(dados.consumoSimultaneidadeKwh)} largura={diagonalCaixaLargura - 20} />
        </div>

        {/* Energia injetada — idem, à direita. */}
        <div style={{ position: 'absolute', left: direitaCaixaX, top: diagonalCaixaY, width: diagonalCaixaLargura, textAlign: 'right' }}>
          <CaixaValor valor={formatarKwh(dados.energiaInjetadaKwh)} align="right" largura={diagonalCaixaLargura - 20} />
        </div>

        {/* Saldo do mês / Saldo acumulado — coluna ao lado direito,
            pareada com a coluna da casa (não mais só no rodapé). */}
        <div style={{ position: 'absolute', left: saldoX, top: saldoMesRotuloY, width: saldoLargura, textAlign: 'right' }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: VERDE_ESC, margin: 0, whiteSpace: 'nowrap' }}>Saldo do mês:</p>
        </div>
        <div style={{ position: 'absolute', left: saldoX, top: saldoMesCaixaY, width: saldoLargura }}>
          <CaixaValor valor={formatarKwh(dados.saldoMesKwh)} align="right" tamanho={22} />
        </div>
        <div style={{ position: 'absolute', left: saldoX, top: saldoAcumRotuloY, width: saldoLargura, textAlign: 'right' }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: VERDE_ESC, margin: 0, whiteSpace: 'nowrap' }}>Saldo acumulado:</p>
        </div>
        <div style={{ position: 'absolute', left: saldoX, top: saldoAcumCaixaY, width: saldoLargura }}>
          <CaixaValor valor={formatarKwh(dados.saldoAcumuladoKwh)} align="right" tamanho={22} destaque />
        </div>

        {/* Geração solar (centro-baixo) */}
        <div style={{ position: 'absolute', left: centroX - 130, top: solY, width: 260, textAlign: 'center' }}>
          <IconeSol />
        </div>
        <div style={{ position: 'absolute', left: centroX - 150, top: solRotuloY, width: 300, textAlign: 'center' }}>
          <p
            style={{
              fontFamily: DISPLAY,
              fontSize: 26,
              fontWeight: 600,
              margin: 0,
              color: VERDE,
            }}
          >
            Geração solar
          </p>
          <div style={{ marginTop: 10 }}>
            <CaixaValor valor={formatarKwh(dados.geracaoKwh)} destaque align="center" tamanho={32} largura={220} />
          </div>
        </div>
      </div>

      {/* Seção financeira — só aparece quando a tarifa foi informada. */}
      {tarifa != null && quantoPagou != null && semSolar != null && economiaEstimada != null && (
        <div style={{ margin: `40px ${PAD}px 0`, paddingBottom: 36 }}>
          <div style={{ borderTop: `1px solid ${LINHA}`, paddingTop: 28, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <StatCard label="Quanto pagou" valor={formatarReais(quantoPagou)} />
            <StatCard label="Sem energia solar*" valor={formatarReais(semSolar)} />
            <StatCard label="Economia estimada" valor={formatarReais(economiaEstimada)} destaque />
          </div>
          <p style={{ fontSize: 13, color: MUTED, marginTop: 14, lineHeight: 1.5 }}>
            * Estimativa = consumo real × tarifa informada; valores reais variam conforme tributos, tarifas e regras de
            compensação.
          </p>
        </div>
      )}

      <div style={{ height: tarifa != null ? 0 : 44 }} />
      <div style={{ width: '100%', height: 6, background: OURO }} />
    </div>
  );
});

ArteFatura.displayName = 'ArteFatura';
export default ArteFatura;
