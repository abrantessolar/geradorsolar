import { useState } from 'react';
import * as Icons from 'lucide-react';
import { ScaleMilestone } from '../types';

/**
 * Escala de empolgação como cinco módulos fotovoltaicos de alturas
 * crescentes, que "acendem" em dourado conforme a nota sobe.
 */
export default function ExcitementScale({ milestones, onSelect }: { milestones: ScaleMilestone[]; onSelect: (value: number) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const atual = milestones.find((m) => m.value === hover);

  return (
    <div>
      <div className="ca-scale-read">
        {atual ? (
          <>
            <span className="ca-em-num">{atual.value}</span>
            <span className="ca-em-txt">{atual.label}</span>
          </>
        ) : (
          <span className="ca-em-txt ca-idle">Toque em uma das opções abaixo</span>
        )}
      </div>

      <div className="ca-scale" style={{ marginBottom: 10 }}>
        {milestones.map((m, i) => (
          <button
            key={m.value}
            className={`ca-cell ${hover === m.value ? 'ca-sel' : ''}`}
            style={{ '--i': i, '--glow': hover === m.value ? Math.max(0.18, m.value / 14) : 0 } as React.CSSProperties}
            onMouseEnter={() => setHover(m.value)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onSelect(m.value)}
          >
            {m.icon && (() => {
              const IconComp = (Icons as unknown as Record<string, Icons.LucideIcon>)[m.icon];
              return IconComp ? <IconComp className="w-4 h-4" /> : null;
            })()}
            <span className="ca-num">{m.value}</span>
          </button>
        ))}
      </div>
      <div className="ca-scale-legend">
        <span>Só olhando</span>
        <span>Pronto para decidir</span>
      </div>
    </div>
  );
}
