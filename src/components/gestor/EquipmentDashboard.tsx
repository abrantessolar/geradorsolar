import React, { useState, useMemo } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { ClienteBase } from './ClientesList';

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#f59e0b', '#ec4899'];

// ── Brand normalization map ──
function normalizeMarca(raw: string | null | undefined): string {
  if (!raw) return '';
  const upper = raw.trim().toUpperCase();
  if (!upper || upper === 'N/I' || upper === 'NI' || upper === 'N/A') return '';

  // Placas
  if (upper.startsWith('ASTRO') && !upper.includes('ASTRONERGY')) return 'ASTRONERGY';
  if (upper === 'ASTRONERGY') return 'ASTRONERGY';

  // Inversores
  if (upper === 'FOXES' || upper === 'FOXES' || upper.startsWith('FOXES')) return 'FOXESS';
  if (upper.startsWith('FOXESS')) return 'FOXESS';
  if (['HOMYLES', 'HOYMMILES', 'HOMILES', 'HOYMILE'].some(v => upper.includes(v))) return 'HOYMILES';
  if (upper.startsWith('HOYMILES')) return 'HOYMILES';
  if (upper.startsWith('GROWATT') || upper === 'GROWWATT') return 'GROWATT';
  if (upper.startsWith('SUNGROW')) return 'SUNGROW';
  if (upper.startsWith('SOLIS')) return 'SOLIS';
  if (upper.startsWith('SOFAR')) return 'SOFAR';
  if (upper.startsWith('DEYE')) return 'DEYE';
  if (upper.startsWith('JINKO')) return 'JINKO';
  if (upper.startsWith('HANERSUN')) return 'HANERSUN';
  if (upper.startsWith('CANADIAN')) return 'CANADIAN';
  if (upper.startsWith('JA ') || upper === 'JA') return 'JA SOLAR';
  if (upper.startsWith('TRINA')) return 'TRINA';
  if (upper === 'MICRO S') return ''; // can't determine brand

  return upper;
}

// ── Auto-detect inverter type ──
function detectTipoInversor(c: ClienteBase): 'micro' | 'string' {
  const tipo = (c.tipo_inversor || '').trim().toLowerCase();
  if (tipo === 'micro') return 'micro';
  if (tipo === 'string') return 'string';

  // Auto-detect from brand
  const marca = (c.marca_inversor || '').toUpperCase();
  if (marca.includes('MICRO') || marca.includes('HOYMILES') || marca.includes('HOMYLES') || marca.includes('HOYMMILES') || marca.includes('HOMILES')) return 'micro';

  // Auto-detect from dados_inversor
  const dados = (c.dados_inversor || '').toUpperCase();
  if (dados.includes('(MICRO)') || dados.includes('MICRO')) return 'micro';

  // DEYE with low power
  if (marca.includes('DEYE')) {
    const pot = parseFloat((c.potencia_inversor || '0').replace(',', '.'));
    if (pot > 0 && pot < 3) return 'micro';
  }

  return 'string';
}

// ── Deduplicate: prefer projetos (id starts with proj-) over clientes_base ──
function deduplicateClientes(clientes: ClienteBase[]): ClienteBase[] {
  const seen = new Map<string, ClienteBase>();

  // First pass: add all
  for (const c of clientes) {
    const cpfKey = c.cpf?.replace(/\D/g, '') || '';
    const nameKey = (c.nome_completo || '').trim().toUpperCase();
    const key = cpfKey || nameKey;
    if (!key) {
      seen.set(c.id, c);
      continue;
    }

    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, c);
    } else {
      // Prefer projeto data (id starts with proj-)
      const existingIsProjeto = existing.id.startsWith('proj-');
      const currentIsProjeto = c.id.startsWith('proj-');
      if (currentIsProjeto && !existingIsProjeto) {
        seen.set(key, c);
      }
      // If both are same source or existing is already projeto, keep existing
    }
  }

  return Array.from(seen.values());
}

function getKwp(c: ClienteBase): number {
  return c.kwp || (c.qtd_placas && c.potencia_placa ? (c.qtd_placas * parseFloat((c.potencia_placa || '0').replace(',', '.'))) / 1000 : 0);
}

type Props = { clientes: ClienteBase[] };

export default function EquipmentDashboard({ clientes }: Props) {
  const [periodo, setPeriodo] = useState('tudo');
  const [filterConc, setFilterConc] = useState('');
  const [filterMarcaPlaca, setFilterMarcaPlaca] = useState('');
  const [filterMarcaInv, setFilterMarcaInv] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterKwpRange, setFilterKwpRange] = useState('');

  // Deduplicate first
  const deduplicated = useMemo(() => deduplicateClientes(clientes), [clientes]);

  // Enrich with normalized data
  const enriched = useMemo(() => deduplicated.map(c => ({
    ...c,
    _marcaPlacaNorm: normalizeMarca(c.marca_placa),
    _marcaInvNorm: normalizeMarca(c.marca_inversor),
    _tipoInv: detectTipoInversor(c),
    _kwp: getKwp(c),
  })), [deduplicated]);

  // Apply filters
  const filtered = useMemo(() => {
    return enriched.filter(c => {
      if (filterConc && c.concessionaria !== filterConc) return false;
      if (filterMarcaPlaca && c._marcaPlacaNorm !== filterMarcaPlaca) return false;
      if (filterMarcaInv && c._marcaInvNorm !== filterMarcaInv) return false;
      if (filterTipo && c._tipoInv !== filterTipo.toLowerCase()) return false;
      if (periodo !== 'tudo' && c.instalado_em) {
        const d = new Date(c.instalado_em);
        const now = new Date();
        const months = parseInt(periodo);
        const cutoff = new Date(now.getFullYear(), now.getMonth() - months, now.getDate());
        if (d < cutoff) return false;
      }
      if (filterKwpRange) {
        const k = c._kwp;
        if (filterKwpRange === '0-3' && k > 3) return false;
        if (filterKwpRange === '3-6' && (k <= 3 || k > 6)) return false;
        if (filterKwpRange === '6-10' && (k <= 6 || k > 10)) return false;
        if (filterKwpRange === '10+' && k <= 10) return false;
      }
      return true;
    });
  }, [enriched, periodo, filterConc, filterMarcaPlaca, filterMarcaInv, filterTipo, filterKwpRange]);

  // ── Stats (from filtered) ──
  const stats = useMemo(() => {
    let totalPlacas = 0, totalKwp = 0, totalInversores = 0, totalMicros = 0;
    filtered.forEach(c => {
      totalPlacas += c.qtd_placas || 0;
      totalKwp += c._kwp;
      const qtdInv = c.qtd_inversores || (c._marcaInvNorm ? 1 : 0);
      if (c._tipoInv === 'micro') {
        totalMicros += qtdInv;
      }
      totalInversores += qtdInv;
    });
    const count = filtered.length;
    return { totalSistemas: count, totalPlacas, totalKwp, totalInversores, totalMicros, mediaKwp: count ? totalKwp / count : 0 };
  }, [filtered]);

  // ── Charts data (all from filtered) ──
  const placasMarca = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(c => {
      const m = c._marcaPlacaNorm;
      if (!m) return;
      map[m] = (map[m] || 0) + (c.qtd_placas || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  const inversoresMarca = useMemo(() => {
    const map: Record<string, { string: number; micro: number }> = {};
    filtered.forEach(c => {
      const m = c._marcaInvNorm;
      if (!m) return;
      if (!map[m]) map[m] = { string: 0, micro: 0 };
      const qtd = c.qtd_inversores || 1;
      if (c._tipoInv === 'micro') map[m].micro += qtd;
      else map[m].string += qtd;
    });
    return Object.entries(map).map(([name, v]) => ({ name, string: v.string, micro: v.micro, total: v.string + v.micro })).sort((a, b) => b.total - a.total);
  }, [filtered]);

  const concData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(c => { const m = c.concessionaria || 'N/I'; map[m] = (map[m] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  const kwpFaixas = useMemo(() => {
    const faixas = { '0-3 kWp': 0, '3-6 kWp': 0, '6-10 kWp': 0, '10+ kWp': 0 };
    filtered.forEach(c => {
      const k = c._kwp;
      if (k <= 3) faixas['0-3 kWp']++;
      else if (k <= 6) faixas['3-6 kWp']++;
      else if (k <= 10) faixas['6-10 kWp']++;
      else faixas['10+ kWp']++;
    });
    return Object.entries(faixas).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const evolucaoMensal = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(c => {
      if (!c.instalado_em) return;
      const d = new Date(c.instalado_em);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map[key] = (map[key] || 0) + c._kwp;
    });
    return Object.entries(map).sort().map(([mes, kwp]) => ({ mes, kwp: Math.round(kwp * 100) / 100 }));
  }, [filtered]);

  // ── Filter options (from enriched, not filtered) ──
  const concessionarias = useMemo(() => [...new Set(enriched.map(c => c.concessionaria).filter(Boolean))].sort() as string[], [enriched]);
  const marcasPlaca = useMemo(() => [...new Set(enriched.map(c => c._marcaPlacaNorm).filter(Boolean))].sort(), [enriched]);
  const marcasInv = useMemo(() => [...new Set(enriched.map(c => c._marcaInvNorm).filter(Boolean))].sort(), [enriched]);

  const ic = 'solar-input text-xs';

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="solar-card p-4">
        <h3 className="text-sm font-semibold text-primary mb-3">Filtros</h3>
        <div className="flex flex-wrap gap-3">
          <select className={`${ic} max-w-[140px]`} value={periodo} onChange={e => setPeriodo(e.target.value)}>
            <option value="tudo">Todo período</option>
            <option value="1">Último mês</option>
            <option value="3">3 meses</option>
            <option value="6">6 meses</option>
            <option value="12">1 ano</option>
          </select>
          <select className={`${ic} max-w-[160px]`} value={filterConc} onChange={e => setFilterConc(e.target.value)}>
            <option value="">Todas concessionárias</option>
            {concessionarias.map(c => <option key={c}>{c}</option>)}
          </select>
          <select className={`${ic} max-w-[160px]`} value={filterMarcaPlaca} onChange={e => setFilterMarcaPlaca(e.target.value)}>
            <option value="">Todas marcas placa</option>
            {marcasPlaca.map(m => <option key={m}>{m}</option>)}
          </select>
          <select className={`${ic} max-w-[160px]`} value={filterMarcaInv} onChange={e => setFilterMarcaInv(e.target.value)}>
            <option value="">Todas marcas inversor</option>
            {marcasInv.map(m => <option key={m}>{m}</option>)}
          </select>
          <select className={`${ic} max-w-[120px]`} value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
            <option value="">Todos tipos</option>
            <option value="String">String</option>
            <option value="Micro">Micro</option>
          </select>
          <select className={`${ic} max-w-[120px]`} value={filterKwpRange} onChange={e => setFilterKwpRange(e.target.value)}>
            <option value="">Todas faixas kWp</option>
            <option value="0-3">0-3 kWp</option>
            <option value="3-6">3-6 kWp</option>
            <option value="6-10">6-10 kWp</option>
            <option value="10+">10+ kWp</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Sistemas Instalados', value: stats.totalSistemas },
          { label: 'Placas Instaladas', value: stats.totalPlacas.toLocaleString('pt-BR') },
          { label: 'KWp Total', value: stats.totalKwp.toFixed(1) },
          { label: 'Inversores', value: stats.totalInversores },
          { label: 'Micro Inversores', value: stats.totalMicros },
          { label: 'Média kWp/Sistema', value: stats.mediaKwp.toFixed(2) },
        ].map(s => (
          <div key={s.label} className="solar-card p-4 text-center">
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold text-primary">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="solar-card p-4">
          <h3 className="text-sm font-semibold mb-3">Placas por Marca</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={placasMarca} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                {placasMarca.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="solar-card p-4">
          <h3 className="text-sm font-semibold mb-3">Inversores por Marca (String vs Micro)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={inversoresMarca}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="string" name="String" fill="#3b82f6" />
              <Bar dataKey="micro" name="Micro" fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="solar-card p-4">
          <h3 className="text-sm font-semibold mb-3">Distribuição por Faixa de KWp</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={kwpFaixas}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" name="Sistemas" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="solar-card p-4">
          <h3 className="text-sm font-semibold mb-3">Sistemas por Concessionária</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={concData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                {concData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="solar-card p-4 lg:col-span-2">
          <h3 className="text-sm font-semibold mb-3">Evolução Mensal de KWp Instalado</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={evolucaoMensal}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="kwp" name="kWp" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela Placas por Marca e Potência */}
      <div className="solar-card p-4">
        <h3 className="text-sm font-semibold mb-3">Placas por Marca e Potência</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 px-3">Marca</th>
                <th className="py-2 px-3">Potência</th>
                <th className="py-2 px-3">Quantidade</th>
                <th className="py-2 px-3">%</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const map: Record<string, number> = {};
                let total = 0;
                filtered.forEach(c => {
                  const marca = c._marcaPlacaNorm;
                  if (!marca) return;
                  const key = `${marca}||${c.potencia_placa || 'N/I'}`;
                  const qtd = c.qtd_placas || 0;
                  map[key] = (map[key] || 0) + qtd;
                  total += qtd;
                });
                return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([key, qtd]) => {
                  const [marca, pot] = key.split('||');
                  return (
                    <tr key={key} className="border-b border-border/30 hover:bg-muted/30">
                      <td className="py-2 px-3">{marca}</td>
                      <td className="py-2 px-3">{pot}W</td>
                      <td className="py-2 px-3 font-medium">{qtd}</td>
                      <td className="py-2 px-3 text-muted-foreground">{total ? ((qtd / total) * 100).toFixed(1) : 0}%</td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
