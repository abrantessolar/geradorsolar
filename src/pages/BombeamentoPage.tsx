import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Waves, AlertTriangle } from 'lucide-react';
import { calcularPlacasBombeamento, AVISO_VALIDACAO } from '@/lib/dimensionamento';

export default function BombeamentoPage() {
  const [cv, setCv] = useState('');

  const cvNum = parseFloat(cv.replace(',', '.')) || 0;
  const placas = useMemo(() => calcularPlacasBombeamento(cvNum), [cvNum]);

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/ferramentas" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Ferramentas
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <Waves className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dimensionamento de Bombeamento</h1>
          <p className="text-sm text-muted-foreground">Placas solares para bomba, por CV</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1.5">Potência da bomba (CV)</label>
          <input
            type="number"
            inputMode="decimal"
            value={cv}
            onChange={e => setCv(e.target.value)}
            placeholder="Ex: 3"
            className="solar-input"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Regra: 2,5 placas de 600W por CV, arredondado para o próximo múltiplo de 8 (mínimo 8 placas).
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Placas sugeridas (600W)</div>
            <div className="text-3xl font-bold text-primary mt-1">{placas > 0 ? placas : '—'}</div>
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
