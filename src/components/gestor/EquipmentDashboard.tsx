import React, { useState, useMemo } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { ClienteBase } from './ClientesList';

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#f59e0b', '#ec4899'];

type Props = { clientes: ClienteBase[] };

export default function EquipmentDashboard({ clientes }: Props) {
  const [periodo, setPeriodo] = useState('tudo');
  const [filterConc, setFilterConc] = useState('');
  const [filterMarcaPlaca, setFilterMarcaPlaca] = useState('');
  const [filterMarcaInv, setFilterMarcaInv] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterKwpRange, setFilterKwpRange] = useState('');

  const filtered = useMemo(() => {
    return clientes.filter(c => {
      // Only installed clients
      if (!c.instalado_em && !c.id.startsWith('proj-')) return true; // include all for dashboard
      if (filterConc && c.concessionaria !== filterConc) return false;
      if (filterMarcaPlaca && c.marca_placa !== filterMarcaPlaca) return false;
      if (filterMarcaInv && c.marca_inversor !== filterMarcaInv) return false;
      if (filterTipo && (c.tipo_inversor || 'String').toLowerCase() !== filterTipo.toLowerCase()) return false;
      if (periodo !== 'tudo' && c.instalado_em) {
        const d = new Date(c.instalado_em);
        const now = new Date();
        const months = parseInt(periodo);
        const cutoff = new Date(now.getFullYear(), now.getMonth() - months, now.getDate());
        if (d < cutoff) return false;
      }
      if (filterKwpRange) {
        const k = c.kwp || (c.qtd_placas && c.potencia_placa ? (c.qtd_placas * parseFloat(c.potencia_placa || '0')) / 1000 : 0);
        if (filterKwpRange === '0-3' && (k < 0 || k > 3)) return false;
        if (filterKwpRange === '3-6' && (k < 3 || k > 6)) return false;
        if (filterKwpRange === '6-10' && (k < 6 || k > 10)) return false;
        if (filterKwpRange === '10+' && k < 10) return false;
      }
      return true;
    });
  }, [clientes, periodo, filterConc, filterMarcaPlaca, filterMarcaInv, filterTipo, filterKwpRange]);

  // Computed stats
  const stats = useMemo(() => {
    let totalPlacas = 0, totalKwp = 0, totalInversores = 0, totalMicros = 0, count = 0;
    filtered.forEach(c => {
      count++;
      totalPlacas += c.qtd_placas || 0;
      const k = c.kwp || (c.qtd_placas && c.potencia_placa ? (c.qtd_placas * parseFloat(c.potencia_placa || '0')) / 1000 : 0);
      totalKwp += k;
      if (c.tipo_inversor?.toLowerCase() === 'micro') {
        totalMicros += c.qtd_inversores || 0;
        totalInversores += c.qtd_inversores || 0;
      } else {
        totalInversores += c.qtd_inversores || 1;
      }
    });
    return { totalSistemas: count, totalPlacas, totalKwp, totalInversores, totalMicros, mediaKwp: count ? totalKwp / count : 0 };
  }, [filtered]);

  // Placas por marca
  const placasMarca = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(c => { const m = c.marca_placa || 'N/I'; map[m] = (map[m] || 0) + (c.qtd_placas || 0); });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  // Inversores por marca
  const inversoresMarca = useMemo(() => {
    const map: Record<string, { string: number; micro: number }> = {};
    filtered.forEach(c => {
      const m = c.marca_inversor || 'N/I';
      if (!map[m]) map[m] = { string: 0, micro: 0 };
      const qtd = c.qtd_inversores || 1;
      if (c.tipo_inversor?.toLowerCase() === 'micro') map[m].micro += qtd;
      else map[m].string += qtd;
    });
    return Object.entries(map).map(([name, v]) => ({ name, string: v.string, micro: v.micro, total: v.string + v.micro })).sort((a, b) => b.total - a.total);
  }, [filtered]);

  // Concessionárias
  const concData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(c => { const m = c.concessionaria || 'N/I'; map[m] = (map[m] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  // KWp por faixa
  const kwpFaixas = useMemo(() => {
    const faixas = { '0-3 kWp': 0, '3-6 kWp': 0, '6-10 kWp': 0, '10+ kWp': 0 };
    filtered.forEach(c => {
      const k = c.kwp || (c.qtd_placas && c.potencia_placa ? (c.qtd_placas * parseFloat(c.potencia_placa || '0')) / 1000 : 0);
      if (k <= 3) faixas['0-3 kWp']++;
      else if (k <= 6) faixas['3-6 kWp']++;
      else if (k <= 10) faixas['6-10 kWp']++;
      else faixas['10+ kWp']++;
    });
    return Object.entries(faixas).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // Evolução mensal
  const evolucaoMensal = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(c => {
      if (!c.instalado_em) return;
      const d = new Date(c.instalado_em);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const k = c.kwp || (c.qtd_placas && c.potencia_placa ? (c.qtd_placas * parseFloat(c.potencia_placa || '0')) / 1000 : 0);
      map[key] = (map[key] || 0) + k;
    });
    return Object.entries(map).sort().map(([mes, kwp]) => ({ mes, kwp: Math.round(kwp * 100) / 100 }));
  }, [filtered]);

  // Unique values for filters
  const concessionarias = useMemo(() => [...new Set(clientes.map(c => c.concessionaria).filter(Boolean))].sort(), [clientes]);
  const marcasPlaca = useMemo(() => [...new Set(clientes.map(c => c.marca_placa).filter(Boolean))].sort(), [clientes]);
  const marcasInv = useMemo(() => [...new Set(clientes.map(c => c.marca_inversor).filter(Boolean))].sort(), [clientes]);

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
        {/* Placas por Marca */}
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

        {/* Inversores por Marca */}
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

        {/* KWp por faixa */}
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

        {/* Concessionárias */}
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

        {/* Evolução Mensal */}
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
                  const key = `${c.marca_placa || 'N/I'}||${c.potencia_placa || 'N/I'}`;
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
