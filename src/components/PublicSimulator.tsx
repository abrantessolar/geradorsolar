import { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Zap, ArrowRight, Search, Plus, Minus, Trash2, ChevronDown, Lock, Shield, AlertTriangle } from 'lucide-react';
import { searchCidadesDB } from '@/data/supabaseStore';
import { supabase } from '@/integrations/supabase/client';
import { MONTH_LABELS, MONTH_KEYS, SEASONAL_FACTORS } from '@/data/types';
import type { EquipmentCatalogItem } from '@/data/types';

const LOSS = 0.21;

interface CityResult {
  cidade: string;
  uf: string;
  monthly: number[];
}

interface SimEquipment {
  id: string;
  catalog: EquipmentCatalogItem;
  quantity: number;
  hoursPerDay: number;
  daysPerMonth: number;
  kmPerMonth?: number;
}

const QUICK_CITIES = [
  { cidade: 'TRES LAGOAS', uf: 'MS', label: 'Três Lagoas' },
  { cidade: 'AGUA CLARA', uf: 'MS', label: 'Água Clara' },
  { cidade: 'CASTILHO', uf: 'SP', label: 'Castilho' },
  { cidade: 'ANDRADINA', uf: 'SP', label: 'Andradina' },
];

const LS_KEY = 'tls_lead_data';

function getSavedLead(): { nome: string; telefone: string } | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.nome && parsed.telefone) return parsed;
    }
  } catch {}
  return null;
}

export default function PublicSimulator() {
  const [avgConsumption, setAvgConsumption] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [selectedCity, setSelectedCity] = useState<CityResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [cityResults, setCityResults] = useState<CityResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [equipments, setEquipments] = useState<SimEquipment[]>([]);
  const [showEquipmentPanel, setShowEquipmentPanel] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');

  // Dynamic equipment catalog from DB
  const [dbEquipment, setDbEquipment] = useState<EquipmentCatalogItem[]>([]);
  const [dbCategories, setDbCategories] = useState<string[]>([]);

  useEffect(() => {
    const loadEquipment = async () => {
      const { data } = await supabase.from('equipamentos_calculadora').select('*').eq('ativo', true).order('categoria').order('nome');
      if (data && data.length > 0) {
        const mapped: EquipmentCatalogItem[] = (data as any[]).map(d => ({
          type: d.id,
          label: d.nome,
          category: d.categoria,
          powerKw: Number(d.potencia_kw),
          defaultHoursPerDay: Number(d.horas_dia_padrao) || 0,
          defaultDaysPerMonth: d.dias_mes_padrao,
          unit: d.tipo_medicao === 'km' ? 'km' as const : 'day' as const,
          fatorServico: Number(d.fator_servico) || 0.80,
        }));
        setDbEquipment(mapped);
        const cats = [...new Set(mapped.map(e => e.category))];
        setDbCategories(cats);
        if (!selectedCategory && cats.length > 0) setSelectedCategory(cats[0]);
      }
    };
    loadEquipment();
  }, []);

  // Validation state
  const [errors, setErrors] = useState<{ city?: string; consumption?: string }>({});

  // Lead capture state
  const savedLead = getSavedLead();
  const [isUnlocked, setIsUnlocked] = useState(!!savedLead);
  const [leadName, setLeadName] = useState(savedLead?.nome || '');
  const [leadPhone, setLeadPhone] = useState(savedLead?.telefone || '');
  const [savingLead, setSavingLead] = useState(false);

  useEffect(() => {
    if (citySearch.length < 2) {
      setCityResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      const results = await searchCidadesDB(citySearch);
      setCityResults(results);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [citySearch]);

  const equipmentMonthlyKwh = useMemo(() => {
    return equipments.reduce((total, eq) => {
      const fator = eq.catalog.fatorServico ?? 1;
      if (eq.catalog.unit === 'km') {
        return total + eq.catalog.powerKw * fator * (eq.kmPerMonth || 0) * eq.quantity;
      }
      return total + eq.catalog.powerKw * fator * eq.hoursPerDay * eq.daysPerMonth * eq.quantity;
    }, 0);
  }, [equipments]);

  const results = useMemo(() => {
    if (!selectedCity || !avgConsumption) return null;
    const avg = parseFloat(avgConsumption);
    if (isNaN(avg) || avg <= 0) return null;

    const totalConsumption = avg + equipmentMonthlyKwh;
    const irrValues = selectedCity.monthly;
    const avgIrr = irrValues.reduce((a, b) => a + b, 0) / 12;

    const avgDaily = totalConsumption / 30;
    const powerKwp = avgDaily / (avgIrr * (1 - LOSS));
    const panelCount = Math.ceil(powerKwp / 0.570);
    const actualKwp = panelCount * 0.570;

    const chartData = MONTH_LABELS.map((label, i) => {
      const gen = Math.round(actualKwp * irrValues[i] * 30 * (1 - LOSS));
      const cons = Math.round(totalConsumption * SEASONAL_FACTORS[MONTH_KEYS[i]]);
      const row: any = { name: label, Geração: gen, Consumo: cons };
      // Add equipment bars
      equipments.forEach(eq => {
        const fator = eq.catalog.fatorServico ?? 1;
        const eqKwh = eq.catalog.unit === 'km'
          ? eq.catalog.powerKw * fator * (eq.kmPerMonth || 0) * eq.quantity
          : eq.catalog.powerKw * fator * eq.hoursPerDay * eq.daysPerMonth * eq.quantity;
        const eqLabel = eq.quantity > 1 ? `${eq.catalog.label} (x${eq.quantity})` : eq.catalog.label;
        row[eqLabel] = Math.round(eqKwh * SEASONAL_FACTORS[MONTH_KEYS[i]]);
      });
      return row;
    });

    const totalGen = chartData.reduce((s, d) => s + d.Geração, 0);
    const avgGen = Math.round(totalGen / 12);
    const surplus = Math.max(0, avgGen - totalConsumption);

    return { panelCount, powerKwp: actualKwp, avgGen, surplus, chartData, totalConsumption: Math.round(totalConsumption) };
  }, [selectedCity, avgConsumption, equipmentMonthlyKwh, equipments]);

  const handleSimulate = () => {
    const newErrors: { city?: string; consumption?: string } = {};
    if (!selectedCity) newErrors.city = '⚠ Selecione uma cidade para calcular a irradiância correta';
    if (!avgConsumption || parseFloat(avgConsumption) <= 0) newErrors.consumption = '⚠ Informe o consumo mensal em kWh';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    setShowResults(true);
  };

  const handleQuickCity = async (city: typeof QUICK_CITIES[0]) => {
    setCitySearch(`${city.label} - ${city.uf}`);
    setShowCityDropdown(false);
    setErrors(prev => ({ ...prev, city: undefined }));
    const results = await searchCidadesDB(city.cidade);
    const match = results.find(r => r.uf === city.uf);
    if (match) setSelectedCity(match);
    setShowResults(false);
  };

  const handleUnlock = async () => {
    if (!leadName.trim() || !leadPhone.trim()) return;
    if (!results || !selectedCity) return;

    setSavingLead(true);
    try {
      const leadData = {
        nome: leadName.trim(),
        telefone: leadPhone.trim(),
        cidade: selectedCity.cidade,
        uf: selectedCity.uf,
        consumo_kwh: parseFloat(avgConsumption) + equipmentMonthlyKwh,
        resultado_placas: results.panelCount,
        resultado_potencia_kwp: results.powerKwp,
      };
      await supabase.from('leads').insert(leadData);
      supabase.functions.invoke('notify-lead', { body: leadData }).catch(() => {});
      localStorage.setItem(LS_KEY, JSON.stringify({ nome: leadName.trim(), telefone: leadPhone.trim() }));
      setIsUnlocked(true);
    } catch (err) {
      console.error('Error saving lead:', err);
    }
    setSavingLead(false);
  };

  const addEquipment = (catalog: EquipmentCatalogItem) => {
    setEquipments(prev => [...prev, {
      id: crypto.randomUUID(),
      catalog,
      quantity: 1,
      hoursPerDay: catalog.defaultHoursPerDay,
      daysPerMonth: catalog.defaultDaysPerMonth,
      kmPerMonth: catalog.unit === 'km' ? 1000 : undefined,
    }]);
    setShowResults(false);
  };

  const removeEquipment = (id: string) => {
    setEquipments(prev => prev.filter(e => e.id !== id));
    setShowResults(false);
  };

  const updateEquipment = (id: string, field: string, value: number) => {
    setEquipments(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
    setShowResults(false);
  };

  const EQUIPMENT_COLORS = ['#E67E22', '#3498DB', '#9B59B6', '#1ABC9C', '#E74C3C', '#F39C12', '#2ECC71', '#8E44AD'];

  return (
    <section id="simulador" className="py-20 md:py-28 bg-muted">
      <div className="container max-w-4xl">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-bold uppercase tracking-widest mb-4">
            Simulador Gratuito
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-primary mb-4">Simule seu Projeto Solar</h2>
          <p className="text-foreground/60 text-lg">Descubra quantas placas você precisa para a sua conta de luz</p>
        </div>

        <div className="solar-card p-8 space-y-6">
          {/* Step 1: Cidade */}
          <div className="relative">
            <label className="block text-sm font-bold text-foreground mb-2">1. Sua cidade</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                className={`solar-input pl-10 text-lg ${errors.city ? 'border-destructive' : ''}`}
                placeholder="Clique ou escreva a cidade"
                value={citySearch}
                onChange={e => {
                  setCitySearch(e.target.value);
                  setShowCityDropdown(true);
                  setSelectedCity(null);
                  setShowResults(false);
                  if (errors.city) setErrors(prev => ({ ...prev, city: undefined }));
                }}
                onFocus={() => setShowCityDropdown(true)}
              />
            </div>
            {errors.city && (
              <p className="text-sm mt-1 flex items-center gap-1 text-destructive animate-fade-in-up">
                <AlertTriangle className="w-3.5 h-3.5" style={{ color: '#E8B84B' }} />
                {errors.city}
              </p>
            )}
            {/* Quick city buttons */}
            <div className="flex flex-wrap gap-2 mt-2">
              {QUICK_CITIES.map(c => (
                <button
                  key={c.cidade}
                  onClick={() => handleQuickCity(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                    selectedCity?.cidade === c.cidade && selectedCity?.uf === c.uf
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted-foreground/5 text-muted-foreground hover:bg-muted-foreground/10 border-border'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            {showCityDropdown && (cityResults.length > 0 || searching) && (
              <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto">
                {searching && <div className="px-4 py-3 text-sm text-muted-foreground">Buscando...</div>}
                {cityResults.map((c, i) => (
                  <button
                    key={i}
                    className="w-full text-left px-4 py-3 hover:bg-muted text-sm transition-colors"
                    onClick={() => {
                      setSelectedCity(c);
                      setCitySearch(`${c.cidade} - ${c.uf}`);
                      setShowCityDropdown(false);
                      setErrors(prev => ({ ...prev, city: undefined }));
                    }}
                  >
                    <span className="font-medium">{c.cidade}</span>
                    <span className="text-muted-foreground"> — {c.uf}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Step 2: Consumo */}
          <div>
            <label className="block text-sm font-bold text-foreground mb-2">2. Consumo médio mensal (kWh)</label>
            <input
              type="number"
              className={`solar-input text-lg ${errors.consumption ? 'border-destructive' : ''}`}
              placeholder="Ex: 350"
              value={avgConsumption}
              onChange={e => {
                setAvgConsumption(e.target.value);
                setShowResults(false);
                if (errors.consumption) setErrors(prev => ({ ...prev, consumption: undefined }));
              }}
            />
            {errors.consumption && (
              <p className="text-sm mt-1 flex items-center gap-1 text-destructive animate-fade-in-up">
                <AlertTriangle className="w-3.5 h-3.5" style={{ color: '#E8B84B' }} />
                {errors.consumption}
              </p>
            )}
          </div>

          {/* Equipamentos Adicionais */}
          <div>
            <button
              type="button"
              onClick={() => setShowEquipmentPanel(!showEquipmentPanel)}
              className="flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Clique aqui para adicionar +Ar condicionado, ou outros eletrodomésticos.
              <ChevronDown className={`w-4 h-4 transition-transform ${showEquipmentPanel ? 'rotate-180' : ''}`} />
            </button>

            {showEquipmentPanel && (
              <div className="mt-4 space-y-4 animate-fade-in-up">
                <p className="text-xs text-muted-foreground">
                  Adicione equipamentos que pretende instalar para um dimensionamento mais preciso.
                </p>

                <div className="flex flex-wrap gap-2">
                  {dbCategories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        selectedCategory === cat
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted-foreground/10 text-muted-foreground hover:bg-muted-foreground/20'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {dbEquipment.filter(e => e.category === selectedCategory).map(eq => (
                    <button
                      key={eq.type}
                      onClick={() => addEquipment(eq)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:border-primary hover:bg-primary/5 text-left text-sm transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">{eq.label}</span>
                      <span className="text-xs text-muted-foreground ml-auto shrink-0">{(eq.powerKw * 1000).toFixed(0)}W</span>
                    </button>
                  ))}
                </div>

                {equipments.length > 0 && (
                  <div className="space-y-3 pt-2 border-t border-border">
                    <h4 className="text-sm font-bold text-foreground">Equipamentos adicionados</h4>
                    {equipments.map(eq => {
                      const eqKwh = eq.catalog.unit === 'km'
                        ? eq.catalog.powerKw * (eq.kmPerMonth || 0) * eq.quantity
                        : eq.catalog.powerKw * eq.hoursPerDay * eq.daysPerMonth * eq.quantity;
                      return (
                        <div key={eq.id} className="p-3 rounded-lg bg-muted text-sm space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{eq.catalog.label}</span>
                            <button onClick={() => removeEquipment(eq.id)} className="p-1 rounded hover:bg-destructive/10 text-destructive transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            {eq.catalog.unit === 'km' ? (
                              <label className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground">km/mês:</span>
                                <input type="number" min={0}
                                  className="w-20 px-2 py-1 rounded border border-border bg-background text-center text-sm"
                                  value={eq.kmPerMonth || 0}
                                  onChange={e => updateEquipment(eq.id, 'kmPerMonth', Math.max(0, parseInt(e.target.value) || 0))} />
                              </label>
                            ) : (
                              <>
                                <label className="flex items-center gap-1">
                                  <span className="text-xs text-muted-foreground">h/dia:</span>
                                  <input type="number" min={0} max={24} step={0.5}
                                    className="w-16 px-2 py-1 rounded border border-border bg-background text-center text-sm"
                                    value={eq.hoursPerDay}
                                    onChange={e => updateEquipment(eq.id, 'hoursPerDay', Math.max(0, parseFloat(e.target.value) || 0))} />
                                </label>
                                <label className="flex items-center gap-1">
                                  <span className="text-xs text-muted-foreground">dias/mês:</span>
                                  <input type="number" min={0} max={30}
                                    className="w-16 px-2 py-1 rounded border border-border bg-background text-center text-sm"
                                    value={eq.daysPerMonth}
                                    onChange={e => updateEquipment(eq.id, 'daysPerMonth', Math.max(0, parseInt(e.target.value) || 0))} />
                                </label>
                              </>
                            )}

                            {/* Quantity controls */}
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">Qtd:</span>
                              <button onClick={() => updateEquipment(eq.id, 'quantity', Math.max(1, eq.quantity - 1))}
                                className="w-7 h-7 rounded bg-muted-foreground/10 flex items-center justify-center hover:bg-muted-foreground/20 transition-colors"
                                disabled={eq.quantity <= 1}>
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-8 text-center font-semibold text-sm">{eq.quantity}</span>
                              <button onClick={() => updateEquipment(eq.id, 'quantity', Math.min(20, eq.quantity + 1))}
                                className="w-7 h-7 rounded bg-muted-foreground/10 flex items-center justify-center hover:bg-muted-foreground/20 transition-colors">
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <div className="text-xs font-semibold text-secondary text-right">
                            Consumo total: +{Math.round(eqKwh)} kWh/mês
                          </div>
                        </div>
                      );
                    })}

                    {equipmentMonthlyKwh > 0 && (
                      <div className="text-right text-sm font-bold text-primary">
                        Consumo adicional: +{Math.round(equipmentMonthlyKwh)} kWh/mês
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleSimulate}
            className="w-full solar-btn-primary text-lg py-4 flex items-center justify-center gap-2"
          >
            <Zap className="w-5 h-5" /> Simular
          </button>

          {/* Results */}
          {showResults && results && (
            <div className="space-y-6 pt-6 border-t border-border animate-fade-in-up relative">
              {/* Blurred overlay when not unlocked */}
              {!isUnlocked && (
                <>
                  <div className="absolute inset-0 z-10" style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
                    <div className="absolute inset-0 bg-background/40" />
                  </div>
                  {/* Unlock card */}
                  <div className="absolute inset-0 z-20 flex items-center justify-center px-4">
                    <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
                      <div className="mx-auto w-14 h-14 rounded-full bg-secondary/10 flex items-center justify-center">
                        <Lock className="w-7 h-7 text-secondary" />
                      </div>
                      <h3 className="text-lg font-bold text-primary">Resultado pronto!</h3>
                      <p className="text-sm text-muted-foreground">
                        Preencha seu nome e WhatsApp para desbloquear o resultado completo da simulação.
                      </p>
                      <div className="space-y-3 text-left">
                        <input
                          className="solar-input"
                          placeholder="Seu nome"
                          value={leadName}
                          onChange={e => setLeadName(e.target.value)}
                        />
                        <input
                          className="solar-input"
                          placeholder="WhatsApp (XX) XXXXX-XXXX"
                          value={leadPhone}
                          onChange={e => setLeadPhone(e.target.value)}
                        />
                      </div>
                      <button
                        onClick={handleUnlock}
                        disabled={savingLead || !leadName.trim() || !leadPhone.trim()}
                        className="w-full solar-btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {savingLead ? 'Enviando...' : (
                          <>
                            <Shield className="w-4 h-4" /> Desbloquear resultado
                          </>
                        )}
                      </button>
                      <p className="text-xs text-muted-foreground">
                        Seus dados estão seguros. Não fazemos spam.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Results content */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-xl bg-primary/5">
                  <p className="text-2xl md:text-3xl font-bold text-primary">{results.panelCount}</p>
                  <p className="text-xs text-muted-foreground">Placas solares</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-secondary/5">
                  <p className="text-2xl md:text-3xl font-bold text-secondary">{results.powerKwp.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">kWp do sistema</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-primary/5">
                  <p className="text-2xl md:text-3xl font-bold text-primary">{results.avgGen}</p>
                  <p className="text-xs text-muted-foreground">kWh/mês gerados</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-secondary/5">
                  <p className="text-2xl md:text-3xl font-bold text-secondary">{results.totalConsumption}</p>
                  <p className="text-xs text-muted-foreground">kWh/mês consumo total</p>
                </div>
              </div>

              {/* Chart */}
              <div className="h-64 md:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={results.chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => `${v} kWh`} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="Geração" fill="#4A5A2A" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Consumo" stackId="consumption" fill="#E8B84B" radius={[3, 3, 0, 0]} />
                    {equipments.map((eq, idx) => {
                      const eqLabel = eq.quantity > 1 ? `${eq.catalog.label} (x${eq.quantity})` : eq.catalog.label;
                      return <Bar key={eq.id} dataKey={eqLabel} stackId="consumption" fill={EQUIPMENT_COLORS[idx % EQUIPMENT_COLORS.length]} radius={[2, 2, 0, 0]} />;
                    })}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* CTA */}
              <div className="text-center pt-4">
                <a
                  href="https://wa.me/5567999999999?text=Olá!%20Fiz%20uma%20simulação%20no%20site%20e%20gostaria%20de%20um%20orçamento."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 solar-btn-secondary text-lg px-8 py-4"
                >
                  Solicitar Orçamento <ArrowRight className="w-5 h-5" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
