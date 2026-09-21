import logoColor from '@/assets/proposta-template/logo-tls-color.png';
import inversorFallback from '@/assets/proposta-template/inversor.png';
import moduloFallback from '@/assets/proposta-template/modulo.png';
import type { PropostaHibrida } from '@/data/propostaHibridaTypes';

// Mesma paleta da proposta ongrid, copiada de propósito (não importada)
// pra manter os dois templates 100% isolados um do outro.
const VERDE = '#2F3B1E';
const OURO = '#C79A3B';
const MUTED = '#6B7264';
const LINHA = '#E4E1D6';
const BEGE = '#FAF8F2';

const PAGE_W_MM = 210;
const PAGE_H_MM = 297;
const PX_PER_MM = 3.7795275591;
function mm(v: number) { return v * PX_PER_MM; }
function fs(v: number) { return v * PX_PER_MM * 0.98; }

function formatCurrency(v: number | null): string {
  if (v == null) return 'Sob consulta';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function EquipBox({ img, fallbackImg, titulo, linha1, linha2 }: { img?: string | null; fallbackImg: string; titulo: string; linha1: string; linha2?: string }) {
  return (
    <div style={{ flex: 1, border: `1px solid ${LINHA}`, borderRadius: `${mm(3)}px`, padding: `${mm(5)}px`, textAlign: 'center' }}>
      <p style={{ fontSize: `${fs(8.5)}px`, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: `${mm(2)}px` }}>{titulo}</p>
      <div style={{ width: `${mm(22)}px`, height: `${mm(22)}px`, margin: '0 auto', marginBottom: `${mm(2)}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={img || fallbackImg} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
      </div>
      <p style={{ fontSize: `${fs(10.5)}px`, fontWeight: 700, color: VERDE }}>{linha1}</p>
      {linha2 && <p style={{ fontSize: `${fs(9)}px`, color: MUTED }}>{linha2}</p>}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ flex: 1, background: BEGE, borderRadius: `${mm(3)}px`, padding: `${mm(4.5)}px`, textAlign: 'center' }}>
      <p style={{ fontSize: `${fs(8)}px`, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ fontSize: `${fs(15)}px`, fontWeight: 700, color: VERDE, margin: `${mm(1)}px 0` }}>{value}</p>
      {sub && <p style={{ fontSize: `${fs(8)}px`, color: MUTED }}>{sub}</p>}
    </div>
  );
}

export default function PropostaHibridaTemplatePage({ data }: { data: PropostaHibrida }) {
  return (
    <div
      style={{
        width: `${mm(PAGE_W_MM)}px`, height: `${mm(PAGE_H_MM)}px`,
        background: '#fff', fontFamily: 'Inter, Arial, sans-serif', color: VERDE,
        padding: `${mm(14)}px`, boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `2px solid ${OURO}`, paddingBottom: `${mm(4)}px`, marginBottom: `${mm(6)}px` }}>
        <img src={logoColor} style={{ height: `${mm(12)}px` }} />
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: `${fs(9)}px`, color: MUTED }}>Proposta {data.numeroProposta ? `Nº ${data.numeroProposta}` : ''}</p>
          <p style={{ fontSize: `${fs(9)}px`, color: MUTED }}>{new Date(data.criadoEm).toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      {/* Título + cliente */}
      <div style={{ marginBottom: `${mm(6)}px` }}>
        <p style={{ fontSize: `${fs(9)}px`, color: OURO, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Sistema Híbrido — Energia Solar + Bateria</p>
        <h1 style={{ fontSize: `${fs(20)}px`, fontWeight: 700, margin: `${mm(1)}px 0` }}>{data.clienteNome}</h1>
        {data.clienteCidade && <p style={{ fontSize: `${fs(10)}px`, color: MUTED }}>{data.clienteCidade}</p>}
      </div>

      {/* Equipamentos */}
      <div style={{ display: 'flex', gap: `${mm(5)}px`, marginBottom: `${mm(7)}px` }}>
        <EquipBox
          img={undefined} fallbackImg={moduloFallback} titulo="Placas"
          linha1={`${data.qtdPlacas ?? '—'} × ${data.placaPotenciaWp ?? '—'} Wp`}
          linha2={[data.placaMarca, data.placaModelo].filter(Boolean).join(' ')}
        />
        <EquipBox
          img={data.inversorHibridoImagem} fallbackImg={inversorFallback} titulo="Inversor Híbrido"
          linha1={data.inversorHibridoMarca || '—'} linha2={data.inversorHibridoModelo || undefined}
        />
        <EquipBox
          img={data.bateriaImagem} fallbackImg={inversorFallback} titulo="Bateria"
          linha1={`${data.bateriaQtd > 1 ? `${data.bateriaQtd} × ` : ''}${data.bateriaMarca || '—'}`}
          linha2={[data.bateriaModelo, data.bateriaCapacidadeKwh ? `${data.bateriaCapacidadeKwh} kWh` : null].filter(Boolean).join(' — ')}
        />
      </div>

      {/* Potência instalada */}
      <p style={{ fontSize: `${fs(10.5)}px`, marginBottom: `${mm(6)}px` }}>
        Potência instalada: <strong>{data.potenciaKwp?.toFixed(2) ?? '—'} kWp</strong>
      </p>

      {/* Geração em 3 cenários */}
      <p style={{ fontSize: `${fs(9)}px`, color: OURO, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: `${mm(2)}px` }}>
        Geração estimada por tipo de dia
      </p>
      <div style={{ display: 'flex', gap: `${mm(4)}px`, marginBottom: `${mm(7)}px` }}>
        <StatCard label="Dia nublado" value={`${(data.geracaoNubladoKwhDia ?? 0).toFixed(1)} kWh`} sub="por dia" />
        <StatCard label="Dia típico" value={`${(data.geracaoTipicoKwhDia ?? 0).toFixed(1)} kWh`} sub="por dia" />
        <StatCard label="Dia de céu limpo" value={`${(data.geracaoLimpoKwhDia ?? 0).toFixed(1)} kWh`} sub="por dia" />
      </div>

      {/* Consumo + autonomia */}
      <div style={{ display: 'flex', gap: `${mm(4)}px`, marginBottom: `${mm(7)}px` }}>
        <StatCard label="Consumo diário estimado" value={`${(data.consumoDiarioKwh ?? 0).toFixed(1)} kWh`} />
        <StatCard
          label="Autonomia da bateria"
          value={data.autonomiaHoras != null ? (data.autonomiaHoras >= 24 ? `${(data.autonomiaHoras / 24).toFixed(1)} dias` : `${data.autonomiaHoras.toFixed(1)} h`) : '—'}
          sub="sem geração, consumo médio"
        />
      </div>

      {/* Preço */}
      <div style={{ background: VERDE, color: '#fff', borderRadius: `${mm(3)}px`, padding: `${mm(5)}px`, textAlign: 'center', marginBottom: `${mm(6)}px` }}>
        <p style={{ fontSize: `${fs(9)}px`, letterSpacing: '0.05em', textTransform: 'uppercase', opacity: 0.85 }}>Investimento</p>
        <p style={{ fontSize: `${fs(22)}px`, fontWeight: 700 }}>{formatCurrency(data.precoTotal)}</p>
      </div>

      {data.observacoes && (
        <div style={{ fontSize: `${fs(9.5)}px`, color: MUTED, borderLeft: `2px solid ${LINHA}`, paddingLeft: `${mm(3.5)}px`, marginBottom: `${mm(6)}px` }}>
          {data.observacoes}
        </div>
      )}

      {/* Garantias */}
      <div style={{ marginTop: 'auto', borderTop: `1px solid ${LINHA}`, paddingTop: `${mm(4)}px`, fontSize: `${fs(8.5)}px`, color: MUTED, display: 'flex', justifyContent: 'space-between' }}>
        <span>Inversor híbrido: {data.inversorHibridoGarantiaAnos ? `${data.inversorHibridoGarantiaAnos} anos` : '—'}</span>
        <span>Bateria: {data.bateriaGarantiaAnos ? `${data.bateriaGarantiaAnos} anos` : '—'}</span>
        <span>Instalação e acompanhamento: 3 anos</span>
      </div>

      {/* Rodapé */}
      <div style={{ fontSize: `${fs(8)}px`, color: MUTED, textAlign: 'center', marginTop: `${mm(3)}px` }}>
        Três Lagoas Solar — Rua Luiz Correa da Silveira, 934, Jardim Alvorada, Três Lagoas/MS
        {data.responsavelNome && ` · ${data.responsavelNome}${data.responsavelTelefone ? ` · ${data.responsavelTelefone}` : ''}`}
      </div>
    </div>
  );
}
