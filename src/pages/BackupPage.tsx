import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BatteryCharging, AlertTriangle, ArrowLeft } from 'lucide-react';
import CargasEditor from '@/components/dimensionamento/CargasEditor';
import { Carga, Quimica, calcularEnergiaDiariaWh, calcularBateria, AVISO_VALIDACAO } from '@/lib/dimensionamento';

type UnidadeAutonomia = 'horas' | 'dias';

export default function BackupPage() {
  const [cargas, setCargas] = useState<Carga[]>([]);
  const [unidade, setUnidade] = useState<UnidadeAutonomia>('horas');
  const [autonomia, setAutonomia] = useState('4');
  const [quimica, setQuimica] = useState<Quimica>('litio');

  const eaWh = useMemo(() => calcularEnergiaDiariaWh(cargas), [cargas]);
  const autonomiaNum = parseFloat(autonomia.replace(',', '.')) || 0;
  const dias = unidade === 'horas' ? autonomiaNum / 24 : autonomiaNum;

  const bateria = useMemo(() => calcularBateria(eaWh, dias, quimica), [eaWh, dias, quimica]);

  const fmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="max-w-3xl mx-auto">
      <Link to="/ferramentas" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Ferramentas
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <BatteryCharging className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dimensionamento de Backup</h1>
          <p className="text-sm text-muted-foreground">Bateria do circuito de emergência</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Entradas */}
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5">Cargas do circuito de backup</label>
            <CargasEditor cargas={cargas} onChange={setCargas} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5">Autonomia desejada</label>
              <input
                type="number"
                inputMode="decimal"
                value={autonomia}
                onChange={e => setAutonomia(e.target.value)}
                className="solar-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Unidade</label>
              <select
                value={unidade}
                onChange={e => setUnidade(e.target.value as UnidadeAutonomia)}
                className="solar-input"
              >
                <option value="horas">Horas</option>
                <option value="dias">Dias</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Química da bateria</label>
            <select value={quimica} onChange={e => setQuimica(e.target.value as Quimica)} className="solar-input">
              <option value="litio">Lítio</option>
              <option value="chumbo">Chumbo</option>
            </select>
          </div>
        </div>

        {/* Resultados */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Consumo do circuito</div>
            <div className="text-xl font-semibold text-foreground mt-1">{fmt(eaWh / 1000)} kWh/dia</div>
          </div>

          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Banco de baterias</div>
            <div className="text-lg font-semibold text-foreground mt-1">{bateria.descricao || '—'}</div>
            {bateria.energiaBancoKWh > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Energia nominal de banco: {fmt(bateria.energiaBancoKWh)} kWh
              </p>
            )}
          </div>

          <div className="p-4 rounded-xl bg-muted/50 border border-border">
            <p className="text-sm text-muted-foreground">
              A quantidade de placas para reduzir sua conta de energia é calculada separadamente no nosso
              simulador padrão.
            </p>
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
