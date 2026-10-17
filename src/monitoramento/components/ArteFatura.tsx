import React, { forwardRef } from 'react';
import logoTls from '@/assets/proposta-template/logo-tls-color.png';

// Arte do relatório "Quanto sua casa consumiu?" (Fase 4, pós-venda,
// 2026-10-17) — layout de referência passado pelo usuário: casa ←
// concessionária, geração solar se dividindo em consumo em
// simultaneidade (pra casa) e energia injetada (pra concessionária),
// mais saldo do mês/acumulado no rodapé. Tamanho fixo (1080×1350, 4:5 —
// bom pra WhatsApp/Instagram) pra ArteFaturaGerador capturar com
// html2canvas em resolução previsível; por isso usa `style` com px em
// vez de classes Tailwind responsivas.

function formatarKwh(valor: number): string {
  return `${Math.round(valor).toLocaleString('pt-BR')} kWh`;
}

function Chip({ texto, destaque = false }: { texto: string; destaque?: boolean }) {
  return (
    <div
      style={{
        display: 'inline-block',
        background: '#efefef',
        color: destaque ? '#8a6d1a' : '#1a1a1a',
        fontWeight: 700,
        fontSize: 22,
        padding: '8px 18px',
        borderRadius: 10,
        whiteSpace: 'nowrap',
      }}
    >
      {texto}
    </div>
  );
}

function IconeCasa() {
  return (
    <svg width="130" height="110" viewBox="0 0 130 110" fill="none">
      <path d="M5 50 L65 5 L125 50" stroke="#1a1a1a" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="22" y="45" width="86" height="60" fill="none" stroke="#1a1a1a" strokeWidth="9" />
      <rect x="35" y="58" width="18" height="18" fill="none" stroke="#1a1a1a" strokeWidth="6" />
      <line x1="44" y1="58" x2="44" y2="76" stroke="#1a1a1a" strokeWidth="4" />
      <line x1="35" y1="67" x2="53" y2="67" stroke="#1a1a1a" strokeWidth="4" />
      <rect x="78" y="62" width="20" height="43" fill="none" stroke="#1a1a1a" strokeWidth="6" />
    </svg>
  );
}

function IconePoste() {
  return (
    <svg width="130" height="130" viewBox="0 0 130 130" fill="none">
      <line x1="30" y1="125" x2="30" y2="10" stroke="#1a1a1a" strokeWidth="8" strokeLinecap="round" />
      <line x1="95" y1="125" x2="95" y2="40" stroke="#1a1a1a" strokeWidth="8" strokeLinecap="round" />
      <line x1="10" y1="22" x2="50" y2="22" stroke="#1a1a1a" strokeWidth="8" strokeLinecap="round" />
      <line x1="10" y1="38" x2="50" y2="38" stroke="#1a1a1a" strokeWidth="8" strokeLinecap="round" />
      <line x1="78" y1="48" x2="112" y2="48" stroke="#1a1a1a" strokeWidth="8" strokeLinecap="round" />
      <line x1="18" y1="22" x2="83" y2="48" stroke="#1a1a1a" strokeWidth="3" />
      <line x1="18" y1="38" x2="83" y2="48" stroke="#1a1a1a" strokeWidth="3" />
      <line x1="42" y1="22" x2="107" y2="48" stroke="#1a1a1a" strokeWidth="3" />
    </svg>
  );
}

function IconeGeracaoSolar() {
  const raios = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <svg width="150" height="150" viewBox="0 0 150 150" fill="none">
      <circle cx="75" cy="40" r="22" fill="#eab308" />
      {raios.map((ang) => (
        <line
          key={ang}
          x1="75"
          y1="40"
          x2="75"
          y2="40"
          stroke="#eab308"
          strokeWidth="4"
          strokeLinecap="round"
          transform={`rotate(${ang} 75 40) translate(0 -34)`}
          style={{ transformOrigin: '75px 40px' }}
        />
      ))}
      {raios.map((ang) => (
        <line
          key={`r2-${ang}`}
          x1="75"
          y1="40"
          x2="75"
          y2="16"
          stroke="#eab308"
          strokeWidth="4"
          strokeLinecap="round"
          transform={`rotate(${ang} 75 40)`}
        />
      ))}
      {[0, 1].map((linha) =>
        [0, 1, 2, 3].map((col) => (
          <rect
            key={`${linha}-${col}`}
            x={15 + col * 31}
            y={85 + linha * 28}
            width="26"
            height="23"
            fill="#4d5d23"
            stroke="#2f3a15"
            strokeWidth="2"
          />
        ))
      )}
    </svg>
  );
}

// Pontos de um triângulo (ponta de seta) terminando em (x2,y2), apontando
// na direção de (x1,y1) → (x2,y2).
function pontosTriangulo(x1: number, y1: number, x2: number, y2: number, tamanho = 11): string {
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

// Seta com ponta desenhada como triângulo (<polygon>), não como SVG
// <marker>. O html2canvas não suporta `<marker>` (usado antes pra ponta de
// seta via `marker-end`) — a seta inteira (linha + ponta) desaparecia na
// imagem exportada mesmo aparecendo certinho na tela.
function SetaComPonta({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const comprimento = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / comprimento;
  const uy = dy / comprimento;
  // encurta a linha um pouco pra não vazar por trás da ponta do triângulo
  const corteX = x2 - ux * 9;
  const corteY = y2 - uy * 9;
  return (
    <>
      <line x1={x1} y1={y1} x2={corteX} y2={corteY} stroke="#1a1a1a" strokeWidth="7" strokeLinecap="round" />
      <polygon points={pontosTriangulo(x1, y1, x2, y2)} fill="#1a1a1a" />
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

  // Todas as setas do diagrama num SVG só, cobrindo o diagrama inteiro
  // (940×700), posicionado em left:0/top:0 — sem nenhum offset próprio.
  // Descoberto depurando a exportação: um <svg> pequeno posicionado via
  // `left`/`top` maiores que o próprio tamanho dele faz o html2canvas
  // recortar a altura/largura como se o deslocamento fosse descontado do
  // tamanho do SVG (ex.: `top: 65` num SVG de `height: 20` zera a área
  // visível) — por isso cada seta era desenhada certinho na tela, mas
  // sumia por completo na imagem exportada. Um único SVG grande, sem
  // deslocamento próprio, com todas as coordenadas já calculadas dentro
  // dele, não sofre desse bug.
  const setaHorizontal = { x1: 785, y1: 75, x2: 180, y2: 75 }; // concessionária → casa
  // Centro do ícone de geração solar (box left:420/top:430, ícone 150px
  // centralizado num container de 260px de largura).
  const setaCasa = { x1: 540, y1: 435, x2: 280, y2: 375 }; // geração → casa (simultaneidade)
  const setaConcessionaria = { x1: 600, y1: 435, x2: 790, y2: 375 }; // geração → concessionária (injetada)

  return (
    <div
      ref={ref}
      style={{
        width: 1080,
        height: 1350,
        background: '#f7f6f3',
        position: 'relative',
        fontFamily: "'Inter', system-ui, sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* decoração sutil no canto superior direito, mesmo espírito da referência */}
      <div style={{ position: 'absolute', top: -60, right: -60, width: 260, height: 260, borderRadius: '50%', background: '#f1e6c8' }} />

      {/* Cabeçalho */}
      <div style={{ padding: '70px 70px 0 70px' }}>
        <h1 style={{ fontSize: 56, fontWeight: 900, color: '#1a1a1a', margin: 0, lineHeight: 1.05 }}>Quanto sua casa</h1>
        <h1 style={{ fontSize: 56, fontWeight: 900, color: '#b8872f', margin: 0, lineHeight: 1.05 }}>consumiu?</h1>
        <p style={{ fontSize: 24, color: '#555', marginTop: 18, maxWidth: 760, lineHeight: 1.35 }}>
          Descubra quanto da energia veio da geração solar e quanto veio da concessionária.
        </p>
        <p style={{ fontSize: 20, color: '#8a6d1a', marginTop: 10, fontWeight: 700 }}>
          {dados.clienteNome} — {dados.numeroConta}ª conta • {dados.periodoLabel}
        </p>
        {percentualSolarDireto != null && (
          <div style={{ marginTop: 14 }}>
            <Chip texto={`${percentualSolarDireto}% da energia usada veio direto do sol`} destaque />
          </div>
        )}
      </div>

      {/* Diagrama */}
      <div style={{ position: 'relative', margin: '30px 70px 0 70px', height: 700 }}>
        {/* Casa (esquerda) */}
        <div style={{ position: 'absolute', left: 0, top: 10 }}>
          <IconeCasa />
          <p style={{ fontSize: 26, fontWeight: 800, margin: '10px 0 0 0', color: '#1a1a1a' }}>Sua casa</p>
          <p style={{ fontSize: 17, color: '#555', margin: '2px 0 8px 0' }}>Consumo real da casa</p>
          <Chip texto={formatarKwh(dados.consumoRealCasaKwh)} />
        </div>

        {/* Concessionária (direita) */}
        <div style={{ position: 'absolute', right: 10, top: 0, textAlign: 'right' }}>
          <IconePoste />
          <p style={{ fontSize: 26, fontWeight: 800, margin: '6px 0 0 0', color: '#1a1a1a' }}>Concessionária</p>
        </div>

        {/* Todas as setas num único SVG cobrindo o diagrama (ver comentário acima) */}
        <svg width="940" height="700" viewBox="0 0 940 700" style={{ position: 'absolute', left: 0, top: 0 }}>
          <SetaComPonta x1={setaHorizontal.x1} y1={setaHorizontal.y1} x2={setaHorizontal.x2} y2={setaHorizontal.y2} />
          <SetaComPonta x1={setaCasa.x1} y1={setaCasa.y1} x2={setaCasa.x2} y2={setaCasa.y2} />
          <SetaComPonta x1={setaConcessionaria.x1} y1={setaConcessionaria.y1} x2={setaConcessionaria.x2} y2={setaConcessionaria.y2} />
        </svg>

        <div style={{ position: 'absolute', left: 300, top: -6, textAlign: 'center', width: 280 }}>
          <p style={{ fontSize: 19, fontWeight: 700, margin: 0, color: '#1a1a1a' }}>Consumo da concessionária</p>
          <div style={{ marginTop: 6 }}>
            <Chip texto={formatarKwh(dados.consumoConcessionariaKwh)} />
          </div>
        </div>

        {/* Geração solar (centro-baixo) */}
        <div style={{ position: 'absolute', left: 420, top: 430, textAlign: 'center', width: 260 }}>
          <IconeGeracaoSolar />
          <p style={{ fontSize: 24, fontWeight: 800, margin: '4px 0 8px 0', color: '#1a1a1a' }}>Geração solar</p>
          <Chip texto={formatarKwh(dados.geracaoKwh)} destaque />
        </div>

        {/* Rótulo da seta geração → casa (simultaneidade) */}
        <div style={{ position: 'absolute', left: 30, top: 330, width: 230, textAlign: 'right' }}>
          <p style={{ fontSize: 19, fontWeight: 700, margin: 0, color: '#1a1a1a' }}>Consumo em simultaneidade</p>
          <div style={{ marginTop: 6 }}>
            <Chip texto={formatarKwh(dados.consumoSimultaneidadeKwh)} />
          </div>
        </div>

        {/* Rótulo da seta geração → concessionária (injetada) */}
        <div style={{ position: 'absolute', right: 10, top: 330, width: 260 }}>
          <p style={{ fontSize: 19, fontWeight: 700, margin: 0, color: '#1a1a1a' }}>Energia injetada</p>
          <div style={{ marginTop: 6, marginBottom: 14 }}>
            <Chip texto={formatarKwh(dados.energiaInjetadaKwh)} />
          </div>
          <p style={{ fontSize: 19, fontWeight: 700, margin: 0, color: '#1a1a1a' }}>+ Saldo do mês</p>
          <div style={{ marginTop: 6 }}>
            <Chip texto={formatarKwh(dados.saldoMesKwh)} />
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <div
        style={{
          position: 'absolute',
          left: 70,
          right: 70,
          bottom: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: '20px 28px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
            borderLeft: '6px solid #4d5d23',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 10 }}>
            <p style={{ fontSize: 20, fontWeight: 700, margin: 0, width: 190 }}>Saldo do mês</p>
            <Chip texto={formatarKwh(dados.saldoMesKwh)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <p style={{ fontSize: 20, fontWeight: 700, margin: 0, width: 190 }}>Saldo acumulado</p>
            <Chip texto={formatarKwh(dados.saldoAcumuladoKwh)} />
          </div>
        </div>

        <img src={logoTls} alt="Três Lagoas Solar" style={{ height: 90, objectFit: 'contain' }} />
      </div>
    </div>
  );
});

ArteFatura.displayName = 'ArteFatura';
export default ArteFatura;
