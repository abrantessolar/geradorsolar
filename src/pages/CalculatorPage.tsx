import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Minus, ChevronDown, ChevronUp, Zap, Sun, TrendingUp, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  ClientData, MonthlyConsumption, ConsumptionMode, ConsumerUnit, EquipmentItem,
  MONTH_LABELS, MONTH_KEYS, EQUIPMENT_CATALOG, SEASONAL_FACTORS, AVAILABILITY_FEE,
} from '@/data/types';
import {
  estimateFullConsumption, calcEquipmentMonthly, calcDimensioning,
  findBestInverter, findPanel, calcTotalPrice, calcInstallments,
  formatCurrency, formatNumber,
} from '@/data/calculations';
import { getSettings, saveProposal } from '@/data/store';
import type { Proposal } from '@/data/types';

const EQUIPMENT_COLORS = [
  '#E67E22', '#3498DB', '#9B59B6', '#1ABC9C', '#E74C3C',
  '#F39C12', '#2ECC71', '#8E44AD', '#16A085', '#D35400',
];

export default function CalculatorPage() {
  const settings = getSettings();
  const navigate = useNavigate();

  const [client, setClient] = useState<ClientData>({
    id: '', name: '', city: 'Três Lagoas', networkType: 'bifasica',
    roofType: 'ceramica', kwhPrice: 0.85, seller: settings.sellers[0] || '',
  });

  const [mode, setMode] = useState<ConsumptionMode>('average');
  const [units, setUnits] = useState<ConsumerUnit[]>([{ id: '1', name: 'Principal', averageKwh: 350 }]);
  const [monthly, setMonthly] = useState<MonthlyConsumption>({
    jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0,
    jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0,
  });
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [eqOpen, setEqOpen] = useState(false);
  const [adjustments, setAdjustments] = useState<Record<string, { panelDelta: number }>>({
    acesso: { panelDelta: 0 }, excellence: { panelDelta: 0 }, premium: { panelDelta: 0 },
  });

  const totalAverage = units.reduce((s, u) => s + u.averageKwh, 0);

  const consumption = useMemo<MonthlyConsumption>(() => {
    if (mode === 'average') {
      const result = {} as any;
      MONTH_KEYS.forEach(k => result[k] = Math.round(totalAverage * SEASONAL_FACTORS[k]));
      return result;
    }
    return monthly;
  }, [mode, totalAverage, monthly]);

  const irradiation = settings.irradiation[client.city] || 5.0;

  const systemCards = useMemo(() => {
    return (['acesso', 'excellence', 'premium'] as const).map(line => {
      const baseDim = calcDimensioning(consumption, equipment, client.networkType, irradiation, client.kwhPrice, 0, settings.systemLoss);
      const panel = findPanel(line);
      const adjustedPanels = baseDim.panelCount + (adjustments[line]?.panelDelta || 0);
      const finalPanels = Math.max(1, adjustedPanels);
      const powerKwp = finalPanels * 0.570;
      const inverter = findBestInverter(line, powerKwp);
      const totalPrice = calcTotalPrice(inverter, panel, finalPanels);
      const dim = calcDimensioning(consumption, equipment, client.networkType, irradiation, client.kwhPrice, totalPrice, settings.systemLoss);

      return {
        line, inverter, panel, panelCount: finalPanels, totalPrice,
        installments: calcInstallments(totalPrice),
        dimensioning: { ...dim, panelCount: finalPanels, powerKwp },
      };
    });
  }, [consumption, equipment, client, irradiation, adjustments, settings.systemLoss]);

  const chartData = useMemo(() => {
    const baseDim = systemCards[0]?.dimensioning;
    if (!baseDim) return [];
    return MONTH_KEYS.map((k, i) => {
      const gen = baseDim.powerKwp * irradiation * 30 * (1 - settings.systemLoss / 100) * SEASONAL_FACTORS[k];
      const base = consumption[k];
      const row: any = { month: MONTH_LABELS[i], geração: Math.round(gen), consumo: base };
      equipment.forEach((eq, j) => {
        row[eq.label || `Equip ${j + 1}`] = Math.round(calcEquipmentMonthly(eq) * SEASONAL_FACTORS[k]);
      });
      return row;
    });
  }, [consumption, equipment, systemCards, irradiation, settings.systemLoss]);

  const handleEstimate = () => {
    setMonthly(estimateFullConsumption(monthly));
  };

  const addEquipment = (catIdx: number) => {
    const cat = EQUIPMENT_CATALOG[catIdx];
    setEquipment(prev => [...prev, {
      id: Date.now().toString(), type: cat.type, label: cat.label,
      dailyKwh: cat.dailyKwh, daysPerMonth: 30, hoursPerDay: 8,
      unit: cat.unit, value: cat.unit === 'km' ? 1000 : cat.unit === 'use' ? 1 : 8,
    }]);
  };

  const removeEquipment = (id: string) => setEquipment(prev => prev.filter(e => e.id !== id));

  const updateEquipment = (id: string, field: string, value: number) => {
    setEquipment(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const generateProposal = (lineIdx: number) => {
    const card = systemCards[lineIdx];
    const proposal: Proposal = {
      id: Date.now().toString(36),
      clientData: { ...client, id: Date.now().toString() },
      consumption, consumerUnits: units, equipment,
      selectedLine: card.line,
      selectedKit: { inverter: card.inverter, panel: card.panel, panelCount: card.panelCount },
      totalPrice: card.totalPrice,
      installmentValues: card.installments,
      cetApplied: null,
      status: 'enviada',
      createdAt: new Date().toISOString(),
      dimensioning: card.dimensioning,
    };
    saveProposal(proposal);
    navigate(`/proposta/${proposal.id}`);
  };

  const LINE_LABELS: Record<string, { title: string; sub: string }> = {
    acesso: { title: 'ACESSO', sub: 'Equipamentos nacionais' },
    excellence: { title: 'EXCELLENCE', sub: 'Importados intermediários' },
    premium: { title: 'PREMIUM', sub: 'Top de linha' },
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2 animate-fade-in-up">
        <div className="inline-flex items-center gap-2 solar-badge bg-secondary/20 text-secondary-foreground">
          <Zap className="w-3.5 h-3.5" /> Calculadora Solar
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-primary text-balance" style={{ lineHeight: '1.1' }}>
          Dimensione seu sistema solar
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Preencha os dados abaixo para calcular o sistema ideal para seu cliente.
        </p>
      </div>

      {/* Client Data */}
      <section className="solar-card p-6 space-y-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <h2 className="text-xl font-bold text-primary flex items-center gap-2">
          <Sun className="w-5 h-5 text-secondary" /> Dados do Cliente
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome completo</label>
            <input className="solar-input" value={client.name} onChange={e => setClient(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Cidade</label>
            <input className="solar-input" value={client.city} onChange={e => setClient(p => ({ ...p, city: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tipo de rede</label>
            <select className="solar-input" value={client.networkType} onChange={e => setClient(p => ({ ...p, networkType: e.target.value as any }))}>
              <option value="monofasica">Monofásica</option>
              <option value="bifasica">Bifásica</option>
              <option value="trifasica">Trifásica</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tipo de telhado</label>
            <select className="solar-input" value={client.roofType} onChange={e => setClient(p => ({ ...p, roofType: e.target.value as any }))}>
              <option value="ceramica">Cerâmica</option>
              <option value="metalico">Metálico</option>
              <option value="fibrocimento">Fibrocimento</option>
              <option value="laje">Laje</option>
              <option value="solo">Solo</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Valor kWh (R$)</label>
            <input className="solar-input" type="number" step="0.01" value={client.kwhPrice}
              onChange={e => setClient(p => ({ ...p, kwhPrice: parseFloat(e.target.value) || 0 }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Vendedor</label>
            <select className="solar-input" value={client.seller} onChange={e => setClient(p => ({ ...p, seller: e.target.value }))}>
              {settings.sellers.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* Consumption */}
      <section className="solar-card p-6 space-y-4 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <h2 className="text-xl font-bold text-primary flex items-center gap-2">
          <Zap className="w-5 h-5 text-secondary" /> Consumo de Energia
        </h2>

        <div className="flex gap-2">
          <button onClick={() => setMode('average')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'average' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            Média mensal
          </button>
          <button onClick={() => setMode('monthly')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'monthly' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            Mês a mês
          </button>
        </div>

        {mode === 'average' ? (
          <div className="space-y-3">
            {units.map((u, i) => (
              <div key={u.id} className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">UC {i + 1}: {u.name}</label>
                  <input className="solar-input" type="number" placeholder="kWh/mês" value={u.averageKwh || ''}
                    onChange={e => setUnits(prev => prev.map(x => x.id === u.id ? { ...x, averageKwh: parseFloat(e.target.value) || 0 } : x))} />
                </div>
                {units.length > 1 && (
                  <button onClick={() => setUnits(prev => prev.filter(x => x.id !== u.id))}
                    className="p-3 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                    <Minus className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {units.length < 4 && (
              <button onClick={() => setUnits(prev => [...prev, { id: Date.now().toString(), name: `UC ${prev.length + 1}`, averageKwh: 0 }])}
                className="flex items-center gap-2 text-sm text-primary font-medium hover:underline">
                <Plus className="w-4 h-4" /> Adicionar unidade consumidora
              </button>
            )}
            <p className="text-sm text-muted-foreground">
              Consumo total: <span className="font-semibold text-foreground">{formatNumber(totalAverage, 0)} kWh/mês</span>
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {MONTH_KEYS.map((k, i) => (
                <div key={k}>
                  <label className="block text-xs font-medium mb-1">{MONTH_LABELS[i]}</label>
                  <input className="solar-input text-sm" type="number" placeholder="kWh"
                    value={monthly[k] || ''}
                    onChange={e => setMonthly(prev => ({ ...prev, [k]: parseFloat(e.target.value) || 0 }))} />
                </div>
              ))}
            </div>
            <button onClick={handleEstimate} className="solar-btn-outline text-sm py-2 px-4">
              Estimar consumo completo
            </button>
          </div>
        )}
      </section>

      {/* Equipment */}
      <section className="solar-card p-6 space-y-4 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
        <button onClick={() => setEqOpen(!eqOpen)} className="w-full flex items-center justify-between">
          <h2 className="text-xl font-bold text-primary flex items-center gap-2">
            <Plus className="w-5 h-5 text-secondary" /> Equipamentos Adicionais
          </h2>
          {eqOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
        </button>

        {eqOpen && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {EQUIPMENT_CATALOG.map((cat, i) => (
                <button key={cat.type} onClick={() => addEquipment(i)}
                  className="text-left text-sm px-3 py-2 rounded-lg bg-muted hover:bg-muted/70 transition-colors flex justify-between items-center">
                  <span>{cat.label}</span>
                  <Plus className="w-4 h-4 text-primary" />
                </button>
              ))}
            </div>

            {equipment.length > 0 && (
              <div className="space-y-3 border-t border-border pt-4">
                {equipment.map((eq, idx) => (
                  <div key={eq.id} className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-muted/50" style={{ borderLeft: `4px solid ${EQUIPMENT_COLORS[idx % EQUIPMENT_COLORS.length]}` }}>
                    <span className="text-sm font-medium flex-1 min-w-[150px]">{eq.label}</span>
                    {eq.unit === 'km' ? (
                      <div className="flex items-center gap-1">
                        <input type="number" className="solar-input w-24 text-sm py-1" value={eq.value}
                          onChange={e => updateEquipment(eq.id, 'value', parseFloat(e.target.value) || 0)} />
                        <span className="text-xs text-muted-foreground">km/mês</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1">
                          <input type="number" className="solar-input w-16 text-sm py-1" value={eq.daysPerMonth}
                            onChange={e => updateEquipment(eq.id, 'daysPerMonth', parseFloat(e.target.value) || 0)} />
                          <span className="text-xs text-muted-foreground">d/mês</span>
                        </div>
                        {eq.unit === 'day' && (
                          <div className="flex items-center gap-1">
                            <input type="number" className="solar-input w-16 text-sm py-1" value={eq.hoursPerDay}
                              onChange={e => updateEquipment(eq.id, 'hoursPerDay', parseFloat(e.target.value) || 0)} />
                            <span className="text-xs text-muted-foreground">h/dia</span>
                          </div>
                        )}
                        {eq.unit === 'use' && (
                          <div className="flex items-center gap-1">
                            <input type="number" className="solar-input w-16 text-sm py-1" value={eq.value}
                              onChange={e => updateEquipment(eq.id, 'value', parseFloat(e.target.value) || 0)} />
                            <span className="text-xs text-muted-foreground">usos/dia</span>
                          </div>
                        )}
                      </>
                    )}
                    <span className="text-xs font-semibold text-primary min-w-[80px] text-right">
                      {formatNumber(calcEquipmentMonthly(eq), 0)} kWh/mês
                    </span>
                    <button onClick={() => removeEquipment(eq.id)} className="text-destructive hover:text-destructive/80">
                      <Minus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Chart */}
      <section className="solar-card p-6 space-y-4 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
        <h2 className="text-xl font-bold text-primary flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-secondary" /> Gráfico Mensal
        </h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => `${v} kWh`} />
              <Legend />
              <Bar dataKey="geração" fill="hsl(80,37%,26%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="consumo" stackId="consumption" fill="hsl(40,79%,60%)" radius={[0, 0, 0, 0]} />
              {equipment.map((eq, idx) => (
                <Bar key={eq.id} dataKey={eq.label} stackId="consumption"
                  fill={EQUIPMENT_COLORS[idx % EQUIPMENT_COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* System Cards */}
      <section className="space-y-4 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
        <h2 className="text-2xl font-bold text-primary text-center">Sistemas Recomendados</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {systemCards.map((card, idx) => {
            const meta = LINE_LABELS[card.line];
            const isMiddle = idx === 1;
            return (
              <div key={card.line} className={`solar-card p-6 space-y-4 relative ${isMiddle ? 'ring-2 ring-secondary md:scale-105' : ''}`}>
                {isMiddle && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 solar-badge bg-secondary text-secondary-foreground">
                    Recomendado
                  </span>
                )}
                <div className="text-center">
                  <h3 className="text-lg font-bold text-primary">{meta.title}</h3>
                  <p className="text-xs text-muted-foreground">{meta.sub}</p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Inversor</span><span className="font-medium">{card.inverter?.brand} {card.inverter?.model}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Placas</span><span className="font-medium">{card.panelCount}× {card.panel?.brand}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Potência</span><span className="font-medium">{formatNumber(card.dimensioning.powerKwp)} kWp</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Geração/mês</span><span className="font-medium">{formatNumber(card.dimensioning.monthlyGeneration, 0)} kWh</span></div>
                </div>

                <div className="text-center py-3 border-y border-border">
                  <p className="text-2xl font-bold text-primary">{formatCurrency(card.totalPrice)}</p>
                </div>

                <div className="space-y-1 text-xs">
                  {Object.entries(card.installments).map(([n, v]) => (
                    <div key={n} className="flex justify-between">
                      <span className="text-muted-foreground">{n}×</span>
                      <span className="font-medium">{formatCurrency(v)}</span>
                    </div>
                  ))}
                </div>

                {/* Adjust slider */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Ajustar placas: {card.panelCount}</label>
                  <input type="range"
                    min={-Math.max(0, systemCards[0].dimensioning.panelCount - 1)}
                    max={10}
                    value={adjustments[card.line]?.panelDelta || 0}
                    onChange={e => setAdjustments(p => ({ ...p, [card.line]: { panelDelta: parseInt(e.target.value) } }))}
                    className="w-full accent-primary" />
                </div>

                <button onClick={() => generateProposal(idx)}
                  className="w-full solar-btn-primary flex items-center justify-center gap-2">
                  Gerar Proposta <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Financial Summary */}
      {systemCards[1] && (
        <section className="solar-card p-6 space-y-4 animate-fade-in-up" style={{ animationDelay: '600ms' }}>
          <h2 className="text-xl font-bold text-primary">Viabilidade Financeira (Excellence)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Economia mensal', value: formatCurrency(systemCards[1].dimensioning.monthlySavings) },
              { label: 'Payback', value: `${formatNumber(systemCards[1].dimensioning.paybackYears)} anos` },
              { label: 'Retorno 10 anos', value: formatCurrency(systemCards[1].dimensioning.return10) },
              { label: 'Retorno 25 anos', value: formatCurrency(systemCards[1].dimensioning.return25) },
            ].map(item => (
              <div key={item.label} className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                <p className="text-lg font-bold text-primary">{item.value}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
