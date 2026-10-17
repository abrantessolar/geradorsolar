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

function SetaDiagonal({ rotacao, x, y }: { rotacao: number; x: number; y: number }) {
  return (
    <svg
      width="90"
      height="90"
      viewBox="0 0 90 90"
      style={{ position: 'absolute', left: x, top: y, transform: `rotate(${rotacao}deg)` }}
    >
      <defs>
        <marker id={`seta-${rotacao}-${x}`} markerWidth="10" markerHeight="10" refX="6" refY="5" orient="auto">
          <path d="M0,0 L10,5 L0,10 Z" fill="#1a1a1a" />
        </marker>
      </defs>
      <line x1="10" y1="80" x2="78" y2="12" stroke="#1a1a1a" strokeWidth="7" markerEnd={`url(#seta-${rotacao}-${x})`} />
    </svg>
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

        {/* Seta horizontal concessionária → casa */}
        <svg width="100%" height="20" style={{ position: 'absolute', left: 170, top: 65, width: 620 }} viewBox="0 0 620 20">
          <defs>
            <marker id="seta-horizontal" markerWidth="12" markerHeight="12" refX="7" refY="6" orient="auto">
              <path d="M0,0 L12,6 L0,12 Z" fill="#1a1a1a" />
            </marker>
          </defs>
          <line x1="615" y1="10" x2="10" y2="10" stroke="#1a1a1a" strokeWidth="7" markerEnd="url(#seta-horizontal)" />
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

        {/* Seta geração → casa (simultaneidade) */}
        <SetaDiagonal rotacao={-45} x={210} y={290} />
        <div style={{ position: 'absolute', left: 30, top: 330, width: 230, textAlign: 'right' }}>
          <p style={{ fontSize: 19, fontWeight: 700, margin: 0, color: '#1a1a1a' }}>Consumo em simultaneidade</p>
          <div style={{ marginTop: 6 }}>
            <Chip texto={formatarKwh(dados.consumoSimultaneidadeKwh)} />
          </div>
        </div>

        {/* Seta geração → concessionária (injetada) */}
        <SetaDiagonal rotacao={45} x={660} y={290} />
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
