import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sun, AlertTriangle } from 'lucide-react';
import CargasEditor from '@/components/dimensionamento/CargasEditor';
import {
  Carga,
  Quimica,
  calcularEnergiaDiariaWh,
  calcularBateria,
  calcularPlacasOffgrid,
  AVISO_VALIDACAO,
} from '@/lib/dimensionamento';
import { getDefaultIrradiance, getMinIrradiance, CIDADE_PADRAO } from '@/data/irradiancia';

const HSP_PADRAO = getMinIrradiance(getDefaultIrradiance()); // pior mês, Três Lagoas-MS (CRESESB)

export default function OffgridPage() {
  const [cargas, setCargas] = useState<Carga[]>([]);
  const [dias, setDias] = useState('2');
  const [quimica, setQuimica] = useState<Quimica>('litio');
  const [potenciaPlaca, setPotenciaPlaca] = useState<150 | 600>(600);
  const [hsp, setHsp] = useState(HSP_PADRAO.toFixed(2));

  const eaWh = useMemo(() => calcularEnergiaDiariaWh(cargas), [cargas]);
  const diasNum = parseFloat(dias.replace(',', '.')) || 0;
  const hspNum = parseFloat(hsp.replace(',', '.')) || 0;

  const bateria = useMemo(() => calcularBateria(eaWh, diasNum, quimica), [eaWh, diasNum, quimica]);
  const placas = useMemo(
    () => calcularPlacasOffgrid(eaWh, potenciaPlaca, hspNum),
    [eaWh, potenciaPlaca, hspNum]
  );

  const fmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="max-w-3xl mx-auto">
      <Link to="/ferramentas" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Ferramentas
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <Sun className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dimensionamento Offgrid</h1>
          <p className="text-sm text-muted-foreground">Placas + bateria a partir da lista de cargas</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Entradas */}
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5">Cargas do sistema</label>
            <CargasEditor cargas={cargas} onChange={setCargas} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Autonomia (dias)</label>
              <input
                type="number"
                inputMode="decimal"
                value={dias}
                onChange={e => setDias(e.target.value)}
                className="solar-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Química da bateria</label>
              <select value={quimica} onChange={e => setQuimica(e.target.value as Quimica)} className="solar-input">
                <option value="litio">Lítio</option>
                <option value="chumbo">Chumbo</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Potência da placa</label>
              <select
                value={potenciaPlaca}
                onChange={e => setPotenciaPlaca(Number(e.target.value) as 150 | 600)}
                className="solar-input"
              >
                <option value={600}>600 W</option>
                <option value={150}>150 W</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">HSP do local (kWh/m².dia)</label>
              <input
                type="number"
                inputMode="decimal"
                value={hsp}
                onChange={e => setHsp(e.target.value)}
                className="solar-input"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Pior mês em {CIDADE_PADRAO}/MS (CRESESB). Ajuste se o local for outro.
              </p>
            </div>
          </div>
        </div>

        {/* Resultados */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Consumo diário</div>
            <div className="text-xl font-semibold text-foreground mt-1">{fmt(eaWh / 1000)} kWh/dia</div>
          </div>

          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Placas (mínimo necessário)</div>
            <div className="text-3xl font-bold text-primary mt-1">{placas > 0 ? placas : '—'}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Piso de segurança, não recomendação ideal.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Banco de baterias</div>
            <div className="text-lg font-semibold text-foreground mt-1">
              {bateria.descricao || '—'}
            </div>
            {bateria.energiaBancoKWh > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Energia nominal de banco: {fmt(bateria.energiaBancoKWh)} kWh
              </p>
            )}
          </div>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">{AVISO_VALIDACAO}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
