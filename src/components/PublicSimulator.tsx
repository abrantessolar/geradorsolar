import { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Zap, ArrowRight, Search, Plus, Trash2, ChevronDown, Lock, Shield } from 'lucide-react';
import { searchCidadesDB } from '@/data/supabaseStore';
import { supabase } from '@/integrations/supabase/client';
import { MONTH_LABELS, MONTH_KEYS, SEASONAL_FACTORS, EQUIPMENT_CATALOG, EquipmentCatalogItem } from '@/data/types';

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

const CATEGORIES = [...new Set(EQUIPMENT_CATALOG.map(e => e.category))];

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
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);

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
      if (eq.catalog.unit === 'km') {
        return total + eq.catalog.powerKw * (eq.kmPerMonth || 0) * eq.quantity;
      }
      return total + eq.catalog.powerKw * eq.hoursPerDay * eq.daysPerMonth * eq.quantity;
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
      return { name: label, Geração: gen, Consumo: cons };
    });

    const totalGen = chartData.reduce((s, d) => s + d.Geração, 0);
    const avgGen = Math.round(totalGen / 12);
    const surplus = Math.max(0, avgGen - totalConsumption);

    return { panelCount, powerKwp: actualKwp, avgGen, surplus, chartData, totalConsumption: Math.round(totalConsumption) };
  }, [selectedCity, avgConsumption, equipmentMonthlyKwh]);

  const handleSimulate = () => {
    if (selectedCity && avgConsumption) {
      setShowResults(true);
    }
  };

  const handleQuickCity = async (city: typeof QUICK_CITIES[0]) => {
    setCitySearch(`${city.label} - ${city.uf}`);
    setShowCityDropdown(false);
    // Load irradiation data
    const results = await searchCidadesDB(city.cidade);
    const match = results.find(r => r.uf === city.uf);
    if (match) {
      setSelectedCity(match);
    }
    setShowResults(false);
  };

  const handleUnlock = async () => {
    if (!leadName.trim() || !leadPhone.trim()) return;
    if (!results || !selectedCity) return;

    setSavingLead(true);
    try {
      // Save lead to database
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

      // Send email notification (fire and forget)
      supabase.functions.invoke('notify-lead', { body: leadData }).catch(() => {});

      // Save to localStorage
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
                className="solar-input pl-10 text-lg"
                placeholder="Digite sua cidade..."
                value={citySearch}
                onChange={e => {
                  setCitySearch(e.target.value);
                  setShowCityDropdown(true);
                  setSelectedCity(null);
                  setShowResults(false);
                }}
                onFocus={() => setShowCityDropdown(true)}
              />
            </div>
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
              className="solar-input text-lg"
              placeholder="Ex: 350"
              value={avgConsumption}
              onChange={e => { setAvgConsumption(e.target.value); setShowResults(false); }}
            />
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
                  {CATEGORIES.map(cat => (
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
                  {EQUIPMENT_CATALOG.filter(e => e.category === selectedCategory).map(eq => (
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
                    {equipments.map(eq => (
                      <div key={eq.id} className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-muted text-sm">
                        <span className="font-medium flex-1 min-w-[120px]">{eq.catalog.label}</span>

                        <label className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">Qtd:</span>
                          <input
                            type="number" min={1} max={20}
                            className="w-14 px-2 py-1 rounded border border-border bg-background text-center text-sm"
                            value={eq.quantity}
                            onChange={e => updateEquipment(eq.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                          />
                        </label>

                        {eq.catalog.unit === 'km' ? (
                          <label className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">km/mês:</span>
                            <input
                              type="number" min={0}
                              className="w-20 px-2 py-1 rounded border border-border bg-background text-center text-sm"
                              value={eq.kmPerMonth || 0}
                              onChange={e => updateEquipment(eq.id, 'kmPerMonth', Math.max(0, parseInt(e.target.value) || 0))}
                            />
                          </label>
                        ) : (
                          <>
                            <label className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">h/dia:</span>
                              <input
                                type="number" min={0} max={24} step={0.5}
                                className="w-16 px-2 py-1 rounded border border-border bg-background text-center text-sm"
                                value={eq.hoursPerDay}
                                onChange={e => updateEquipment(eq.id, 'hoursPerDay', Math.max(0, parseFloat(e.target.value) || 0))}
                              />
                            </label>
                            <label className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">dias/mês:</span>
                              <input
                                type="number" min={0} max={30}
                                className="w-16 px-2 py-1 rounded border border-border bg-background text-center text-sm"
                                value={eq.daysPerMonth}
                                onChange={e => updateEquipment(eq.id, 'daysPerMonth', Math.max(0, parseInt(e.target.value) || 0))}
                              />
                            </label>
                          </>
                        )}

                        <span className="text-xs font-semibold text-secondary ml-auto">
                          +{Math.round(
                            eq.catalog.unit === 'km'
                              ? eq.catalog.powerKw * (eq.kmPerMonth || 0) * eq.quantity
                              : eq.catalog.powerKw * eq.hoursPerDay * eq.daysPerMonth * eq.quantity
                          )} kWh/mês
                        </span>

                        <button
                          onClick={() => removeEquipment(eq.id)}
                          className="p-1 rounded hover:bg-destructive/10 text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

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
            disabled={!selectedCity || !avgConsumption}
            className="w-full solar-btn-primary text-lg py-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 max-w-sm w-full space-y-4 text-center">
                      <div className="text-4xl">🌞</div>
                      <h3 className="text-xl font-black text-primary">Sua simulação está pronta!</h3>
                      <p className="text-sm text-muted-foreground">
                        Para ver o resultado completo gratuitamente, informe:
                      </p>
                      <div className="space-y-3 text-left">
                        <div>
                          <label className="block text-sm font-medium mb-1">Nome</label>
                          <input
                            className="solar-input"
                            placeholder="Seu nome completo"
                            value={leadName}
                            onChange={e => setLeadName(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">WhatsApp</label>
                          <input
                            className="solar-input"
                            placeholder="(XX) XXXXX-XXXX"
                            value={leadPhone}
                            onChange={e => setLeadPhone(e.target.value)}
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleUnlock}
                        disabled={!leadName.trim() || !leadPhone.trim() || savingLead}
                        className="w-full solar-btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {savingLead ? 'Salvando...' : '🔓 Ver minha simulação grátis'}
                      </button>
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <Shield className="w-3 h-3" /> Seus dados estão seguros
                      </p>
                    </div>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ResultCard label="Placas necessárias" value={`${results.panelCount}`} icon="🔆" />
                <ResultCard label="Potência do sistema" value={`${results.powerKwp.toFixed(2)} kWp`} icon="⚡" />
                <ResultCard label="Geração estimada/mês" value={`${results.avgGen} kWh`} icon="📊" />
                <ResultCard label="Consumo total/mês" value={`${results.totalConsumption} kWh`} icon="📈" />
              </div>

              <div className="h-72 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={results.chartData} barGap={2}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Geração" fill="hsl(80, 37%, 26%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Consumo" fill="hsl(40, 79%, 60%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {isUnlocked && (
                <div className="text-center space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground italic">
                    Essa é uma estimativa informativa. Para receber uma proposta completa e personalizada, fale com um de nossos consultores!
                  </p>
                  <a
                    href="https://wa.me/5567996448995?text=Fiz uma simulação no site e gostaria de uma proposta completa"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 transition-all"
                  >
                    Quero minha proposta completa <ArrowRight className="w-5 h-5" />
                  </a>
                </div>
              )}

              {/* Min height to ensure blur area is big enough */}
              {!isUnlocked && <div className="h-20" />}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ResultCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-muted rounded-xl p-4 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xl font-black text-primary">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
