import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Sun, Zap, ArrowRight, Search } from 'lucide-react';
import { searchCidades } from '@/data/irradiancia';
import { MONTH_LABELS, MONTH_KEYS, SEASONAL_FACTORS } from '@/data/types';
import { estimateFullConsumption } from '@/data/calculations';

const LOSS = 0.21;

export default function PublicSimulator() {
  const [avgConsumption, setAvgConsumption] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [selectedCity, setSelectedCity] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  const cityResults = useMemo(() => {
    if (citySearch.length < 2) return [];
    return searchCidades(citySearch).slice(0, 8);
  }, [citySearch]);

  const results = useMemo(() => {
    if (!selectedCity || !avgConsumption) return null;
    const avg = parseFloat(avgConsumption);
    if (isNaN(avg) || avg <= 0) return null;

    // Build monthly consumption using seasonal factors
    const monthly: Record<string, number> = {};
    MONTH_KEYS.forEach(k => {
      monthly[k] = Math.round(avg * SEASONAL_FACTORS[k]);
    });

    // Get irradiation data
    const irr = selectedCity;
    const irrValues = [irr[2], irr[3], irr[4], irr[5], irr[6], irr[7], irr[8], irr[9], irr[10], irr[11], irr[12], irr[13]];
    const avgIrr = irrValues.reduce((a: number, b: number) => a + b, 0) / 12;

    // Dimensioning
    const avgDaily = avg / 30;
    const powerKwp = avgDaily / (avgIrr * (1 - LOSS));
    const panelCount = Math.ceil(powerKwp / 0.570);
    const actualKwp = panelCount * 0.570;

    // Monthly generation
    const chartData = MONTH_LABELS.map((label, i) => {
      const gen = Math.round(actualKwp * irrValues[i] * 30 * (1 - LOSS));
      const cons = monthly[MONTH_KEYS[i]];
      return { name: label, Geração: gen, Consumo: cons };
    });

    const totalGen = chartData.reduce((s, d) => s + d.Geração, 0);
    const totalCons = chartData.reduce((s, d) => s + d.Consumo, 0);
    const avgGen = Math.round(totalGen / 12);
    const surplus = Math.max(0, avgGen - avg);

    return { panelCount, powerKwp: actualKwp, avgGen, surplus, chartData };
  }, [selectedCity, avgConsumption]);

  const handleSimulate = () => {
    if (selectedCity && avgConsumption) {
      setShowResults(true);
    }
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
          {/* Consumo */}
          <div>
            <label className="block text-sm font-bold text-foreground mb-2">Consumo médio mensal (kWh)</label>
            <input
              type="number"
              className="solar-input text-lg"
              placeholder="Ex: 350"
              value={avgConsumption}
              onChange={e => { setAvgConsumption(e.target.value); setShowResults(false); }}
            />
          </div>

          {/* Cidade */}
          <div className="relative">
            <label className="block text-sm font-bold text-foreground mb-2">Cidade</label>
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
            {showCityDropdown && cityResults.length > 0 && (
              <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto">
                {cityResults.map((c: any, i: number) => (
                  <button
                    key={i}
                    className="w-full text-left px-4 py-3 hover:bg-muted text-sm transition-colors"
                    onClick={() => {
                      setSelectedCity(c);
                      setCitySearch(`${c[0]} - ${c[1]}`);
                      setShowCityDropdown(false);
                    }}
                  >
                    <span className="font-medium">{c[0]}</span>
                    <span className="text-muted-foreground"> — {c[1]}</span>
                  </button>
                ))}
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
            <div className="space-y-6 pt-6 border-t border-border animate-fade-in-up">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ResultCard label="Placas necessárias" value={`${results.panelCount}`} icon="🔆" />
                <ResultCard label="Potência do sistema" value={`${results.powerKwp.toFixed(2)} kWp`} icon="⚡" />
                <ResultCard label="Geração estimada/mês" value={`${results.avgGen} kWh`} icon="📊" />
                <ResultCard label="Excedente estimado" value={`${results.surplus} kWh`} icon="📈" />
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
