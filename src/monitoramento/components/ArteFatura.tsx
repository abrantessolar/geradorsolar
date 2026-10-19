import React, { forwardRef } from 'react';
import fundoContaDeLuz from '@/assets/monitoramento/conta-de-luz-fundo.png';

// Arte do relatório "Quanto sua casa consumiu?" (Fase 4, pós-venda).
//
// Terceira versão (2026-10-17, mesmo dia): em vez de recriar cada elemento
// do layout em código (ícones SVG, setas, caixas — como nas duas versões
// anteriores), o usuário pediu pra simplesmente usar a IMAGEM que ele
// mandou (mockup do Canva, "Ajuste_de_Layout_do_Design.svg") como fundo, e
// só preencher os valores em cima dela. Abordagem:
//
// 1. O SVG do usuário foi rasterizado (cairosvg) pra um PNG de fundo, 2x
//    de resolução (2260×2844) pra ficar nítido mesmo exportado em 1x —
//    salvo em `src/assets/monitoramento/conta-de-luz-fundo.png`.
// 2. Todo o texto do SVG original já veio convertido em `<path>` pelo
//    Canva (confirmado: 0 `<text>`, 466 `<path>`) — ou seja, não dá pra
//    editar texto diretamente no SVG (não existe nó de texto pra
//    substituir). As ÚNICAS áreas em branco de verdade no design são as
//    caixas brancas vazias — é nelas que os valores reais são desenhados
//    por cima, como `<span>` em `position:absolute` (percentual do
//    viewBox, com `transform: translate(-50%,-50%)` pra centralizar no
//    ponto exato), SEM reconstruir layout nenhum com flex/grid/ícones.
// 3. Coordenadas: o próprio usuário mandou, na sequência, um pacote
//    (`relatorio-fundo-fixo-para-claude.zip`) com um protótipo HTML já
//    funcionando pro mesmo fundo (mesmo arquivo SVG, confirmado por
//    hash/tamanho idênticos), com uma tabela `PLACES` de coordenadas
//    (x,y em unidades do viewBox 847.5×1066.5) calibradas nele mesmo —
//    usadas abaixo tal como vieram, só adaptando a chave de cada campo
//    pro nome usado neste componente/schema (ex.: `rede`→
//    `consumoConcessionariaKwh`, `pago`→`quantoPagou` calculado).
// 4. A única informação dinâmica que NÃO tinha uma caixa em branco no
//    mockup é a linha "Maria da Silva · 10/09 a 10/10/2026" (exemplo já
//    escrito na própria arte, não uma caixa vazia) — o próprio LEIA-ME do
//    usuário confirma: "a data e o nome estão incorporados no próprio SVG
//    e precisarão ser retirados da arte original se forem editáveis
//    futuramente". Como aqui precisa ser editável (cada conta tem cliente/
//    período diferentes), a solução foi cobrir esse texto de exemplo com
//    um retângulo da cor do fundo e escrever o valor real por cima, no
//    mesmo estilo.
// 5. A seção financeira (quanto pagou / sem solar / economia) faz parte
//    do mesmo PNG único (sempre visível) — quando a tarifa não foi
//    informada, as 3 caixas simplesmente mostram "—" em vez de sumir
//    (diferente das duas versões anteriores, que conseguiam omitir a
//    seção inteira por serem HTML puro; aqui o fundo é uma imagem única,
//    então não dá pra encolher o canvas sem recortar a imagem).
// 6. Fórmulas (confirmadas pelo LEIA-ME do usuário, batendo com o que já
//    estava em `criarFatura` / `lib/faturas.ts`): consumo em
//    simultaneidade = geração − injetada; consumo real = consumo da
//    concessionária (medido) + simultaneidade; "saldo do mês" é um campo
//    digitado manualmente e NÃO entra em nenhuma dessas contas.
//    ATUALIZADO em 2026-10-17 pelo documento "Regras do motor — Raio-X
//    da energia": "quanto pagou" passou a ser o VALOR REAL digitado da
//    fatura (campo `valorPagoReais`), não mais calculado (consumo da
//    concessionária × tarifa); "quanto pagaria sem solar" continua
//    sendo só SIMULAÇÃO (consumo real × tarifa estimada informada,
//    pode não incorporar tributos/bandeiras/descontos direito); economia
//    = sem-solar − quanto pagou.
//
// Isso elimina de vez a categoria inteira de bugs do html2canvas com SVG
// desenhado à mão (marker, clipping por offset, transform/rotate, display
// inline-block com filhos em bloco — ver lições na documentação do
// projeto) porque agora só existem DUAS coisas sendo capturadas: uma
// <img> (raster simples) e um punhado de <span> de texto comum.

const VERDE_ESC = '#45582E';
const OURO_ESC = '#AB7B0B';
const BEGE = '#F3EDE3';
const FONT = 'Inter, Arial, Helvetica, sans-serif';

// Espaço de coordenadas do SVG original (viewBox) — PLACES abaixo está
// nessas unidades. O fundo é exibido na proporção W/H, em qualquer
// tamanho CSS (ver `ESCALA` no componente).
const VB_W = 847.5;
const VB_H = 1066.5;

// Tamanho CSS do container (mesma proporção do viewBox, escalado por
// 1130/847.5 ≈ 1,333 — e o PNG de fundo tem o dobro disso em pixels de
// verdade, pra ficar nítido mesmo exportado em 1x).
const W = 1130;
const H = 1422;

function formatarKwh(valor: number): string {
  return `${Math.round(valor).toLocaleString('pt-BR')} kWh`;
}

function formatarReais(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

type Estilo = 'normal' | 'money' | 'small' | 'gold';

interface Ponto {
  x: number;
  y: number;
  estilo?: Estilo;
}

// Coordenadas (centro de cada valor, em unidades do viewBox) — tabela
// `PLACES` do protótipo HTML que o próprio usuário mandou, com as chaves
// renomeadas pro nome usado neste componente/schema (ver nota 3 acima).
const PONTOS: Record<string, Ponto> = {
  simultaneidadePct: { x: 670, y: 263, estilo: 'small' },
  consumoConcessionaria: { x: 415, y: 437 },
  consumoReal: { x: 135, y: 474 },
  consumoSimultaneidade: { x: 175, y: 658 },
  energiaInjetada: { x: 646, y: 657 },
  geracao: { x: 412, y: 856, estilo: 'gold' },
  saldoMes: { x: 706, y: 800, estilo: 'small' },
  saldoAcumulado: { x: 706, y: 887, estilo: 'small' },
  quantoPagou: { x: 176, y: 987, estilo: 'money' },
  semSolar: { x: 426, y: 987, estilo: 'money' },
  economiaEstimada: { x: 675, y: 987, estilo: 'money' },
};

// Retângulo (em unidades do viewBox) que cobre a linha de exemplo "Maria
// da Silva · 10/09 a 10/10/2026" já desenhada na imagem, pra escrever o
// nome/conta/período reais por cima (ver nota 4 acima).
const MASCARA_CABECALHO = { x: 45, y: 272, largura: 315, altura: 28 };

const TAMANHOS: Record<Estilo, number> = { normal: 35, gold: 35, money: 33, small: 28 };

// Valor numérico/monetário centralizado no ponto exato da tabela PONTOS
// (percentual do viewBox + `translate(-50%,-50%)`, igual ao protótipo do
// usuário).
function ValorNoPonto({ ponto, valor }: { ponto: Ponto; valor: string }) {
  const estilo = ponto.estilo ?? 'normal';
  return (
    <span
      style={{
        position: 'absolute',
        left: `${(ponto.x / VB_W) * 100}%`,
        top: `${(ponto.y / VB_H) * 100}%`,
        transform: 'translate(-50%, -50%)',
        fontWeight: 800,
        fontSize: TAMANHOS[estilo === 'gold' ? 'normal' : estilo],
        color: estilo === 'gold' ? OURO_ESC : VERDE_ESC,
        letterSpacing: '-0.02em',
        whiteSpace: 'nowrap',
        lineHeight: 1,
        textAlign: 'center',
      }}
    >
      {valor}
    </span>
  );
}

export interface DadosArteFatura {
  clienteNome: string;
  // Número da conta (1ª, 2ª...) — só existe quando o relatório está
  // vinculado a uma usina com histórico (FaturaUsina.tsx). A ferramenta
  // avulsa de Ferramentas (sem usina) não tem esse conceito de sequência,
  // então passa `null` e o header mostra só nome · período, sem "— Xª conta".
  numeroConta: number | null;
  periodoLabel: string;
  geracaoKwh: number;
  consumoConcessionariaKwh: number;
  consumoRealCasaKwh: number;
  consumoSimultaneidadeKwh: number;
  energiaInjetadaKwh: number;
  saldoMesKwh: number;
  saldoAcumuladoKwh: number;
  // R$/kWh opcional — usada SÓ pra estimar "quanto pagaria sem solar"
  // (ver migração 0012). Quando ausente, essa caixa (e a de economia,
  // que depende dela) mostram "—".
  tarifaKwh: number | null;
  // Valor REAL pago na fatura (R$), digitado manualmente — "Regras do
  // motor — Raio-X da energia" (2026-10-17): o valor pago NÃO é mais
  // calculado (consumo da concessionária × tarifa); ele vem direto da
  // fatura física do cliente. Quando ausente, a caixa "quanto pagou" (e
  // a de economia) mostram "—".
  valorPagoReais: number | null;
}

const ArteFatura = forwardRef<HTMLDivElement, DadosArteFatura>((dados, ref) => {
  const percentualSolarDireto =
    dados.consumoRealCasaKwh > 0 ? Math.round((dados.consumoSimultaneidadeKwh / dados.consumoRealCasaKwh) * 100) : null;

  // Fórmulas da seção financeira — "Regras do motor — Raio-X da
  // energia" (2026-10-17, documento do usuário):
  // - "quanto pagou" é o VALOR REAL digitado da fatura (não calculado).
  // - "sem energia solar" é só SIMULAÇÃO: consumo real × tarifa
  //   estimada informada (se a tarifa não incorporar tributos/bandeiras/
  //   descontos direito, o resultado é uma estimativa simplificada).
  // - economia = sem-solar − quanto pagou.
  const tarifa = dados.tarifaKwh;
  const quantoPagou = dados.valorPagoReais;
  const semSolar = tarifa != null ? dados.consumoRealCasaKwh * tarifa : null;
  const economiaEstimada = quantoPagou != null && semSolar != null ? semSolar - quantoPagou : null;

  return (
    <div
      ref={ref}
      style={{
        width: W,
        height: H,
        position: 'relative',
        fontFamily: FONT,
        overflow: 'hidden',
      }}
    >
      <img
        src={fundoContaDeLuz}
        alt=""
        style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, display: 'block' }}
      />

      {/* Máscara + nome/conta/período reais, por cima do exemplo da imagem
          ("Maria da Silva · 10/09 a 10/10/2026") — ver nota 4 acima. */}
      <div
        style={{
          position: 'absolute',
          left: `${(MASCARA_CABECALHO.x / VB_W) * 100}%`,
          top: `${(MASCARA_CABECALHO.y / VB_H) * 100}%`,
          width: `${(MASCARA_CABECALHO.largura / VB_W) * 100}%`,
          height: `${(MASCARA_CABECALHO.altura / VB_H) * 100}%`,
          background: BEGE,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: `${(MASCARA_CABECALHO.x / VB_W) * 100}%`,
          top: `${(MASCARA_CABECALHO.y / VB_H) * 100}%`,
          height: `${(MASCARA_CABECALHO.altura / VB_H) * 100}%`,
          display: 'flex',
          alignItems: 'center',
          fontSize: 21,
          fontWeight: 700,
          color: VERDE_ESC,
          whiteSpace: 'nowrap',
        }}
      >
        {dados.clienteNome}
        <span style={{ fontWeight: 500 }}>
          &nbsp;— {dados.numeroConta != null ? `${dados.numeroConta}ª conta · ` : ''}
          {dados.periodoLabel}
        </span>
      </div>

      {percentualSolarDireto != null && (
        <ValorNoPonto ponto={PONTOS.simultaneidadePct} valor={`${percentualSolarDireto}%`} />
      )}
      <ValorNoPonto ponto={PONTOS.consumoConcessionaria} valor={formatarKwh(dados.consumoConcessionariaKwh)} />
      <ValorNoPonto ponto={PONTOS.consumoReal} valor={formatarKwh(dados.consumoRealCasaKwh)} />
      <ValorNoPonto ponto={PONTOS.consumoSimultaneidade} valor={formatarKwh(dados.consumoSimultaneidadeKwh)} />
      <ValorNoPonto ponto={PONTOS.energiaInjetada} valor={formatarKwh(dados.energiaInjetadaKwh)} />
      <ValorNoPonto ponto={PONTOS.saldoMes} valor={formatarKwh(dados.saldoMesKwh)} />
      <ValorNoPonto ponto={PONTOS.geracao} valor={formatarKwh(dados.geracaoKwh)} />
      <ValorNoPonto ponto={PONTOS.saldoAcumulado} valor={formatarKwh(dados.saldoAcumuladoKwh)} />

      <ValorNoPonto ponto={PONTOS.quantoPagou} valor={quantoPagou != null ? formatarReais(quantoPagou) : '—'} />
      <ValorNoPonto ponto={PONTOS.semSolar} valor={semSolar != null ? formatarReais(semSolar) : '—'} />
      <ValorNoPonto
        ponto={PONTOS.economiaEstimada}
        valor={economiaEstimada != null ? formatarReais(economiaEstimada) : '—'}
      />
    </div>
  );
});

ArteFatura.displayName = 'ArteFatura';
export default ArteFatura;
