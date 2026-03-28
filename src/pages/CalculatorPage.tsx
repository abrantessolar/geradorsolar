import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Minus, ChevronDown, ChevronUp, Zap, Sun, TrendingUp, ArrowRight, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  ClientData, MonthlyConsumption, ConsumptionMode, ConsumerUnit, EquipmentItem,
  MONTH_LABELS, MONTH_KEYS, EQUIPMENT_CATALOG, SEASONAL_FACTORS, UC_COLORS,
  BRAZILIAN_STATES, LINE_NAMES, LINE_SUBS,
} from '@/data/types';
import type { EquipmentCatalogItem } from '@/data/types';
import {
  estimateFullConsumption, calcEquipmentMonthly, calcDimensioning,
  findInverterForPanels, findPanel, calcTotalPrice, calcInstallments,
  formatCurrency, formatNumber, maxPanelsForInverter, calcMicroInverterCount,
} from '@/data/calculations';
import { getSettings, saveProposal, lookupIrradiation } from '@/data/store';
import { savePropostaDB, searchCidadesDB } from '@/data/supabaseStore';
import type { Proposal } from '@/data/types';

const EQUIPMENT_COLORS = [
  '#E67E22', '#3498DB', '#9B59B6', '#1ABC9C', '#E74C3C',
  '#F39C12', '#2ECC71', '#8E44AD', '#16A085', '#D35400',
];

const LINES = ['excellence', 'premium'] as const;

// Group equipment catalog by category
const EQUIPMENT_CATEGORIES = EQUIPMENT_CATALOG.reduce<Record<string, EquipmentCatalogItem[]>>((acc, item) => {
  if (!acc[item.category]) acc[item.category] = [];
  acc[item.category].push(item);
  return acc;
}, {});

const emptyMonthly = (): MonthlyConsumption => ({
  jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0,
  jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0,
});

export default function CalculatorPage() {
  const settings = getSettings();
  const navigate = useNavigate();
  const activeSellers = settings.sellers.filter(s => s.active);

  const defaultDist = settings.distributors?.find(d => d.name === settings.defaultDistributor);
  const [selectedDistributor, setSelectedDistributor] = useState(settings.defaultDistributor || 'ELEKTRO');

  const [client, setClient] = useState<ClientData>({
    id: '', name: '', state: 'MS', city: 'Três Lagoas', networkType: 'bifasica',
    kwhPrice: defaultDist?.kwhPrice || 0.85, seller: activeSellers[0]?.name || '',
  });

  const [mode, setMode] = useState<ConsumptionMode>('average');
  const [units, setUnits] = useState<ConsumerUnit[]>([{ id: '1', name: 'Principal', averageKwh: 350 }]);
  const [monthlyUnits, setMonthlyUnits] = useState<{ id: string; name: string; values: MonthlyConsumption }[]>([
    { id: '1', name: 'UC 1', values: emptyMonthly() },
  ]);
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [eqOpen, setEqOpen] = useState(false);
  const [panelDelta, setPanelDelta] = useState(0);

  // City autocomplete
  const [citySuggestions, setCitySuggestions] = useState<{ cidade: string; uf: string }[]>([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [citySearching, setCitySearching] = useState(false);
  const cityRef = useRef<HTMLDivElement>(null);
  const cityTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleCityChange = (value: string) => {
    setClient(p => ({ ...p, city: value }));
    if (cityTimerRef.current) clearTimeout(cityTimerRef.current);
    if (value.length < 2) {
      setCitySuggestions([]);
      setShowCitySuggestions(false);
      return;
    }
    setCitySearching(true);
    cityTimerRef.current = setTimeout(async () => {
      const results = await searchCidadesDB(value);
      setCitySuggestions(results);
      setShowCitySuggestions(results.length > 0);
      setCitySearching(false);
    }, 300);
  };

  const selectCity = (cidade: string, uf: string) => {
    setClient(p => ({ ...p, city: cidade, state: uf }));
    setShowCitySuggestions(false);
  };

  const handleDistributorChange = (name: string) => {
    setSelectedDistributor(name);
    const dist = settings.distributors?.find(d => d.name === name);
    if (dist) {
      setClient(p => ({ ...p, kwhPrice: dist.kwhPrice }));
    }
  };

  const totalAverage = units.reduce((s, u) => s + u.averageKwh, 0);

  // Combine all monthly UCs into a single consumption object
  const combinedMonthly = useMemo<MonthlyConsumption>(() => {
    const result = emptyMonthly();
    monthlyUnits.forEach(mu => {
      MONTH_KEYS.forEach(k => {
        (result as any)[k] += mu.values[k];
      });
    });
    return result;
  }, [monthlyUnits]);

  const consumption = useMemo<MonthlyConsumption>(() => {
    if (mode === 'average') {
      const result = {} as any;
      MONTH_KEYS.forEach(k => result[k] = Math.round(totalAverage * SEASONAL_FACTORS[k]));
      return result;
    }
    return combinedMonthly;
  }, [mode, totalAverage, combinedMonthly]);

  // Try local first, then async DB lookup
  const localLookup = lookupIrradiation(client.state, client.city);
  const [dbIrr, setDbIrr] = useState<{ value: number; found: boolean; monthly: number[] | null } | null>(null);

  useEffect(() => {
    if (localLookup.found || !client.city || client.city.length < 2) {
      setDbIrr(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { getCidadesIrradianciaDB } = await import('@/data/supabaseStore');
      const monthly = await getCidadesIrradianciaDB(client.city, client.state);
      if (!cancelled && monthly) {
        const avg = monthly.reduce((a, b) => a + b, 0) / 12;
        setDbIrr({ value: avg, found: true, monthly });
      }
    })();
    return () => { cancelled = true; };
  }, [client.city, client.state, localLookup.found]);

  const irradiationLookup = dbIrr && dbIrr.found ? dbIrr : localLookup;
  const irradiation = irradiationLookup.value;
  const monthlyIrr = irradiationLookup.monthly;

  const basePanelCount = useMemo(() => {
    const baseDim = calcDimensioning(consumption, equipment, client.networkType, irradiation, client.kwhPrice, 0, settings.systemLoss);
    return baseDim.panelCount;
  }, [consumption, equipment, client.networkType, irradiation, client.kwhPrice, settings.systemLoss]);

  const finalPanels = Math.max(1, basePanelCount + panelDelta);

  const systemCards = useMemo(() => {
    return LINES.map(line => {
      const panel = findPanel(line);
      const panelPowerKwp = (panel?.power || 570) / 1000;
      const inverter = findInverterForPanels(line, finalPanels, panelPowerKwp);
      const powerKwp = finalPanels * panelPowerKwp;
      const totalPrice = calcTotalPrice(inverter, panel, finalPanels, line);
      const dim = calcDimensioning(consumption, equipment, client.networkType, irradiation, client.kwhPrice, totalPrice, settings.systemLoss);

      const isPremium = line === 'premium';
      const microCount = isPremium ? calcMicroInverterCount(finalPanels) : 0;
      const maxPanels = isPremium ? 999 : (inverter ? maxPanelsForInverter(inverter.power, panelPowerKwp) : 0);
      const panelsRemaining = isPremium ? 999 : maxPanels - finalPanels;

      const monthlyGeneration = powerKwp * irradiation * 30 * (1 - settings.systemLoss / 100);
      const surplus = monthlyGeneration - dim.avgMonthlyKwh;

      return {
        line, inverter, panel, panelCount: finalPanels, totalPrice, maxPanels, panelsRemaining, microCount,
        installments: calcInstallments(totalPrice),
        dimensioning: { ...dim, panelCount: finalPanels, powerKwp, monthlyGeneration, surplus },
      };
    });
  }, [consumption, equipment, client, irradiation, finalPanels, settings.systemLoss]);

  const chartData = useMemo(() => {
    const baseDim = systemCards[0]?.dimensioning;
    if (!baseDim) return [];
    return MONTH_KEYS.map((k, i) => {
      // Use monthly irradiance if available
      const irrMonth = monthlyIrr ? monthlyIrr[i] : irradiation * SEASONAL_FACTORS[k];
      const gen = baseDim.powerKwp * irrMonth * 30 * (1 - settings.systemLoss / 100);
      const row: any = { month: MONTH_LABELS[i], geração: Math.round(gen) };
      if (mode === 'average') {
        if (units.length > 1) {
          units.forEach((u, j) => {
            row[`UC ${j + 1}`] = Math.round(u.averageKwh * SEASONAL_FACTORS[k]);
          });
        } else {
          row['consumo'] = Math.round(totalAverage * SEASONAL_FACTORS[k]);
        }
      } else {
        if (monthlyUnits.length > 1) {
          monthlyUnits.forEach((mu, j) => {
            row[`UC ${j + 1}`] = mu.values[k];
          });
        } else {
          row['consumo'] = combinedMonthly[k];
        }
      }
      equipment.forEach((eq, idx) => {
        row[eq.label || `Equip ${idx + 1}`] = Math.round(calcEquipmentMonthly(eq) * SEASONAL_FACTORS[k]);
      });
      return row;
    });
  }, [consumption, equipment, systemCards, irradiation, monthlyIrr, settings.systemLoss, units, mode, monthlyUnits, combinedMonthly, totalAverage]);

  const handleEstimate = (unitIdx: number) => {
    setMonthlyUnits(prev => prev.map((mu, i) => {
      if (i !== unitIdx) return mu;
      return { ...mu, values: estimateFullConsumption(mu.values) };
    }));
  };

  const addEquipment = (cat: EquipmentCatalogItem) => {
    setEquipment(prev => [...prev, {
      id: Date.now().toString(),
      type: cat.type,
      label: cat.label,
      dailyKwh: cat.powerKw,
      daysPerMonth: cat.defaultDaysPerMonth,
      hoursPerDay: cat.defaultHoursPerDay,
      unit: cat.unit,
      value: cat.unit === 'km' ? 1000 : cat.defaultHoursPerDay,
      powerKw: cat.powerKw,
    }]);
  };

  const removeEquipment = (id: string) => setEquipment(prev => prev.filter(e => e.id !== id));

  const updateEquipment = (id: string, field: string, value: number) => {
    setEquipment(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const generateProposal = (lineIdx: number) => {
    const card = systemCards[lineIdx];
    const consumerUnitsForProposal: ConsumerUnit[] = mode === 'average'
      ? units
      : monthlyUnits.map(mu => ({
          id: mu.id,
          name: mu.name,
          averageKwh: MONTH_KEYS.reduce((s, k) => s + mu.values[k], 0) / 12,
          monthlyValues: mu.values,
        }));

    const proposal: Proposal = {
      id: crypto.randomUUID(),
      clientData: { ...client, id: crypto.randomUUID() },
      consumption, consumerUnits: consumerUnitsForProposal, equipment,
      selectedLine: card.line,
      selectedKit: { inverter: card.inverter, panel: card.panel, panelCount: card.panelCount },
      totalPrice: card.totalPrice,
      installmentValues: card.installments,
      cetApplied: null,
      status: 'enviada',
      createdAt: new Date().toISOString(),
      dimensioning: card.dimensioning,
    };
    // Save to localStorage (fallback) and Supabase
    saveProposal(proposal);
    savePropostaDB(proposal).then(dbId => {
      navigate(`/proposta/${dbId}`);
    }).catch(() => {
      navigate(`/proposta/${proposal.id}`);
    });
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
            <label className="block text-sm font-medium mb-1">Estado (UF)</label>
            <select className="solar-input" value={client.state} onChange={e => setClient(p => ({ ...p, state: e.target.value }))}>
              {BRAZILIAN_STATES.map(uf => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </div>
          <div className="relative" ref={cityRef}>
            <label className="block text-sm font-medium mb-1">Cidade</label>
            <input className="solar-input" value={client.city}
              onChange={e => handleCityChange(e.target.value)}
              onFocus={() => { if (citySuggestions.length > 0) setShowCitySuggestions(true); }}
              onBlur={() => setTimeout(() => setShowCitySuggestions(false), 200)}
            />
            {showCitySuggestions && citySuggestions.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {citySuggestions.map((s, i) => (
                  <button key={i} className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                    onMouseDown={() => selectCity(s.cidade, s.uf)}>
                    {s.cidade} — {s.uf}
                  </button>
                ))}
              </div>
            )}
            {!irradiationLookup.found && client.city && (
              <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#E8B84B' }}>
                <AlertTriangle className="w-3 h-3" />
                Cidade não encontrada. Usando irradiância de Três Lagoas — MS.
              </p>
            )}
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
            <label className="block text-sm font-medium mb-1">Distribuidora</label>
            <select className="solar-input" value={selectedDistributor}
              onChange={e => handleDistributorChange(e.target.value)}>
              {(settings.distributors || []).map(d => (
                <option key={d.name} value={d.name}>{d.name}</option>
              ))}
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
              {activeSellers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
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
                  <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: UC_COLORS[i % UC_COLORS.length] }} />
                    UC {i + 1}: {u.name}
                  </label>
                  <input className="solar-input" type="number" placeholder="kWh/mês" value={u.averageKwh || ''}
                    style={{ borderLeftWidth: '4px', borderLeftColor: UC_COLORS[i % UC_COLORS.length] }}
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
            {units.length < 10 && (
              <button onClick={() => setUnits(prev => [...prev, { id: Date.now().toString(), name: `UC ${prev.length + 1}`, averageKwh: 0 }])}
                className="flex items-center gap-2 text-sm text-primary font-medium hover:underline">
                <Plus className="w-4 h-4" /> Adicionar outra conta de luz
              </button>
            )}
            <p className="text-sm text-muted-foreground">
              Consumo total: <span className="font-semibold text-foreground">{formatNumber(totalAverage, 0)} kWh/mês</span>
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {monthlyUnits.map((mu, ucIdx) => (
              <div key={mu.id} className="space-y-3 p-4 rounded-lg border border-border/50"
                style={{ borderLeftWidth: '4px', borderLeftColor: UC_COLORS[ucIdx % UC_COLORS.length] }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: UC_COLORS[ucIdx % UC_COLORS.length] }} />
                    {mu.name}
                  </h3>
                  {monthlyUnits.length > 1 && (
                    <button onClick={() => setMonthlyUnits(prev => prev.filter(x => x.id !== mu.id))}
                      className="p-1 rounded bg-destructive/10 text-destructive hover:bg-destructive/20">
                      <Minus className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {MONTH_KEYS.map((k, i) => (
                    <div key={k}>
                      <label className="block text-xs font-medium mb-1">{MONTH_LABELS[i]}</label>
                      <input className="solar-input text-sm" type="number" placeholder="kWh"
                        value={mu.values[k] || ''}
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 0;
                          setMonthlyUnits(prev => prev.map(x => x.id === mu.id
                            ? { ...x, values: { ...x.values, [k]: val } }
                            : x
                          ));
                        }} />
                    </div>
                  ))}
                </div>
                <button onClick={() => handleEstimate(ucIdx)} className="solar-btn-outline text-sm py-2 px-4">
                  Estimar consumo completo
                </button>
              </div>
            ))}
            {monthlyUnits.length < 10 && (
              <button onClick={() => setMonthlyUnits(prev => [...prev, {
                id: Date.now().toString(),
                name: `UC ${prev.length + 1}`,
                values: emptyMonthly(),
              }])}
                className="flex items-center gap-2 text-sm text-primary font-medium hover:underline">
                <Plus className="w-4 h-4" /> Adicionar outra conta de luz
              </button>
            )}
            <p className="text-sm text-muted-foreground">
              Consumo total médio: <span className="font-semibold text-foreground">
                {formatNumber(MONTH_KEYS.reduce((s, k) => s + combinedMonthly[k], 0) / 12, 0)} kWh/mês
              </span>
            </p>
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
            {Object.entries(EQUIPMENT_CATEGORIES).map(([category, items]) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">{category}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {items.map(cat => (
                    <button key={cat.type} onClick={() => addEquipment(cat)}
                      className="text-left text-sm px-3 py-2 rounded-lg bg-muted hover:bg-muted/70 transition-colors flex justify-between items-center">
                      <span>{cat.label} <span className="text-xs text-muted-foreground">({cat.powerKw} kW)</span></span>
                      <Plus className="w-4 h-4 text-primary" />
                    </button>
                  ))}
                </div>
              </div>
            ))}

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
                          <input type="number" className="solar-input w-16 text-sm py-1" value={eq.hoursPerDay}
                            onChange={e => updateEquipment(eq.id, 'hoursPerDay', parseFloat(e.target.value) || 0)} />
                          <span className="text-xs text-muted-foreground">h/dia</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <input type="number" className="solar-input w-16 text-sm py-1" value={eq.daysPerMonth}
                            onChange={e => updateEquipment(eq.id, 'daysPerMonth', parseFloat(e.target.value) || 0)} />
                          <span className="text-xs text-muted-foreground">d/mês</span>
                        </div>
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
              <Bar dataKey="geração" fill="#4A5A2A" radius={[4, 4, 0, 0]} />
              {(mode === 'average' ? units.length > 1 : monthlyUnits.length > 1) ? (
                (mode === 'average' ? units : monthlyUnits).map((_, j) => (
                  <Bar key={j} dataKey={`UC ${j + 1}`} stackId="consumption"
                    fill={UC_COLORS[j % UC_COLORS.length]} />
                ))
              ) : (
                <Bar dataKey="consumo" stackId="consumption" fill="#E8B84B" />
              )}
              {equipment.map((eq, idx) => (
                <Bar key={eq.id} dataKey={eq.label} stackId="consumption"
                  fill={EQUIPMENT_COLORS[idx % EQUIPMENT_COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Unified Panel Adjustment */}
      <section className="solar-card p-6 space-y-4 animate-fade-in-up" style={{ animationDelay: '450ms' }}>
        <h2 className="text-xl font-bold text-primary text-center">Ajustar Quantidade de Placas</h2>
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={() => setPanelDelta(d => d - 1)}
            disabled={finalPanels <= 1}
            className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold hover:bg-primary/90 disabled:opacity-40 transition-all active:scale-95"
          >
            −
          </button>
          <div className="text-center">
            <p className="text-4xl font-bold text-primary">{finalPanels}</p>
            <p className="text-sm text-muted-foreground">placas</p>
          </div>
          <button
            onClick={() => setPanelDelta(d => d + 1)}
            className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold hover:bg-primary/90 transition-all active:scale-95"
          >
            +
          </button>
        </div>
        {panelDelta !== 0 && (
          <p className="text-center text-xs text-muted-foreground">
            Mínimo recomendado: {basePanelCount} placas ({panelDelta > 0 ? '+' : ''}{panelDelta} ajuste)
            <button onClick={() => setPanelDelta(0)} className="ml-2 text-primary underline">Resetar</button>
          </p>
        )}
      </section>

      {/* System Cards */}
      <section className="space-y-4 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
        <h2 className="text-2xl font-bold text-primary text-center">Sistemas Disponíveis</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {systemCards.map((card, idx) => {
            const isPremium = card.line === 'premium';
            const maxP = card.maxPanels;
            const remaining = card.panelsRemaining;
            const limitColor = isPremium ? undefined : (remaining <= 0 ? '#E84855' : remaining <= 2 ? '#E8B84B' : undefined);
            return (
              <div key={card.line} className="solar-card p-6 space-y-4 relative">
                <div className="text-center">
                  <h3 className="text-lg font-bold text-primary">{LINE_NAMES[card.line]}</h3>
                  <p className="text-xs text-muted-foreground">{LINE_SUBS[card.line]}</p>
                </div>

                <div className="space-y-2 text-sm">
                  {isPremium ? (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Micro inversores</span>
                      <span className="font-medium">{card.microCount}× {card.inverter?.brand} {card.inverter?.model}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between"><span className="text-muted-foreground">Inversor</span><span className="font-medium">{card.inverter?.brand} {card.inverter?.model}</span></div>
                      <div className="flex justify-between items-start">
                        <span className="text-muted-foreground">Suporta até</span>
                        <span className="font-medium text-right" style={limitColor ? { color: limitColor } : undefined}>
                          {maxP} placas
                          {remaining <= 0 && <span className="block text-xs">Limite atingido — inversor será atualizado na próxima placa</span>}
                        </span>
                      </div>
                    </>
                  )}
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
          <h2 className="text-xl font-bold text-primary">Viabilidade Financeira ({LINE_NAMES['excellence']})</h2>
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
