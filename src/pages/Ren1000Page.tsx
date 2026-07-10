import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calculator, CheckCircle2 } from 'lucide-react';

const TIPOS = [
  { value: 'residencial', label: 'Residencial', fa: 0.46 },
  { value: 'industrial', label: 'Industrial', fa: 0.69 },
  { value: 'comercio', label: 'Comércio, serviços e outras atividades', fa: 0.63 },
  { value: 'rural', label: 'Rural', fa: 0.53 },
  { value: 'servico_publico', label: 'Serviço público', fa: 0.57 },
];

const INVERSORES = [1.5, 2, 3, 4, 5, 6, 7, 7.5, 8, 10, 12, 15, 20, 25, 30, 35, 36, 37.5, 40, 50];

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const DENOMINADOR = 0.16 * 24 * 30; // 115,2

export default function Ren1000Page() {
  const [tipo, setTipo] = useState(TIPOS[0].value);
  const [modo, setModo] = useState<'media' | 'mensal'>('media');
  const [media, setMedia] = useState('');
  const [meses, setMeses] = useState<string[]>(Array(12).fill(''));

  const faObj = TIPOS.find(t => t.value === tipo)!;

  const consumoMedio = useMemo(() => {
    if (modo === 'media') return parseFloat(media.replace(',', '.')) || 0;
    const vals = meses.map(m => parseFloat(m.replace(',', '.')) || 0);
    const preenchidos = vals.filter((_, i) => meses[i].trim() !== '');
    if (preenchidos.length === 0) return 0;
    return vals.reduce((a, b) => a + b, 0) / (preenchidos.length || 1);
  }, [modo, media, meses]);

  const TETO_REN1000 = 50; // limite máximo pela REN 1000
  const resultadoExato = consumoMedio > 0 ? (consumoMedio / DENOMINADOR) * faObj.fa : 0;
  const resultadoBruto = Math.ceil(resultadoExato * 100) / 100;
  const resultado = Math.min(resultadoBruto, TETO_REN1000);
  const limitadoPeloTeto = resultadoBruto > TETO_REN1000;

  const inversorRecomendado = useMemo(() => {
    if (resultado <= 0) return null;
    return INVERSORES.find(inv => inv >= resultado) ?? null;
  }, [resultado]);

  const inversorAbaixo = useMemo(() => {
    if (!inversorRecomendado) return null;
    const idx = INVERSORES.indexOf(inversorRecomendado);
    return idx > 0 ? INVERSORES[idx - 1] : null;
  }, [inversorRecomendado]);

  const fmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="max-w-3xl mx-auto">
      <Link to="/ferramentas" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Ferramentas
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <Calculator className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calculadora REN 1000</h1>
          <p className="text-sm text-muted-foreground">Potência máxima de inversor permitida pela norma</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Entradas */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Tipo de instalação</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)} className="solar-input">
              {TIPOS.map(t => (
                <option key={t.value} value={t.value}>
                  {t.label} (FA = {Math.round(t.fa * 100)}%)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Modo de entrada do consumo</label>
            <div className="flex rounded-lg border border-input overflow-hidden">
              <button
                type="button"
                onClick={() => setModo('media')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${modo === 'media' ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground hover:bg-muted'}`}
              >
                Média
              </button>
              <button
                type="button"
                onClick={() => setModo('mensal')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${modo === 'mensal' ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground hover:bg-muted'}`}
              >
                Mês a mês
              </button>
            </div>
          </div>

          {modo === 'media' ? (
            <div>
              <label className="block text-sm font-medium mb-1.5">Consumo médio mensal (kWh)</label>
              <input
                type="number"
                inputMode="decimal"
                value={media}
                onChange={e => setMedia(e.target.value)}
                placeholder="Ex: 850"
                className="solar-input"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1.5">Consumo mês a mês (kWh)</label>
              <div className="grid grid-cols-3 gap-2">
                {MESES.map((mes, i) => (
                  <div key={mes}>
                    <span className="text-[11px] text-muted-foreground">{mes}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={meses[i]}
                      onChange={e => {
                        const next = [...meses];
                        next[i] = e.target.value;
                        setMeses(next);
                      }}
                      className="solar-input py-2 px-2 text-sm"
                    />
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Média calculada: <strong className="text-foreground">{fmt(consumoMedio)} kWh</strong>
              </p>
            </div>
          )}
        </div>

        {/* Resultados */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Potência máxima permitida</div>
            <div className="text-3xl font-bold text-primary mt-1">{fmt(resultado)} kW</div>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Fator de ajuste aplicado</div>
            <div className="text-xl font-semibold text-foreground mt-1">{Math.round(faObj.fa * 100)}%</div>
          </div>

          {resultado > 0 && (
            <div className="p-4 rounded-xl bg-muted/50 border border-border text-sm space-y-1">
              <div className="font-medium text-foreground">Detalhamento</div>
              <p className="text-muted-foreground">
                ({fmt(consumoMedio)} ÷ (0,16 × 24 × 30)) × {Math.round(faObj.fa * 100)}% = <strong className="text-foreground">{fmt(resultadoExato)} kW</strong>
              </p>
              <p className="text-muted-foreground">
                Arredondado para cima (conforme REN 1000): <strong className="text-foreground">{fmt(resultado)} kW</strong>
              </p>
            </div>
          )}

          {inversorRecomendado && (
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold">
                <CheckCircle2 className="w-5 h-5" />
                Inversor recomendado: {fmt(inversorRecomendado)} kW
              </div>
              {inversorAbaixo && (
                <p className="text-sm text-muted-foreground mt-1">
                  O modelo de {fmt(inversorAbaixo)} kW ficaria abaixo do limite e não seria permitido.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
