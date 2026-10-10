import { useState } from 'react';
import { ScaleMilestone } from '../types';

/**
 * Escala de empolgação (1/3/6/9/10). Reage com uma microanimação discreta
 * conforme a nota sobe — sem nada infantil (sem confete, sem emoji gigante).
 */
export default function ExcitementScale({ milestones, onSelect }: { milestones: ScaleMilestone[]; onSelect: (value: number) => void }) {
  const [hover, setHover] = useState<number | null>(null);

  return (
    <div className="space-y-2.5">
      {milestones.map((m) => {
        const intensidade = m.value / 10;
        const ativo = hover === m.value;
        return (
          <button
            key={m.value}
            onClick={() => onSelect(m.value)}
            onMouseEnter={() => setHover(m.value)}
            onMouseLeave={() => setHover(null)}
            className="w-full text-left flex items-center gap-3 p-4 rounded-2xl border transition-all active:scale-[0.98]"
            style={{
              borderColor: ativo ? '#F5A623' : '#E3E8EF',
              background: ativo ? '#FFF8EC' : '#FFFFFF',
              transform: ativo ? `scale(${1 + intensidade * 0.015})` : 'scale(1)',
            }}
          >
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ background: `rgba(245,166,35,${0.15 + intensidade * 0.55})`, color: '#1A2233' }}
            >
              {m.value}
            </span>
            <span className="font-medium" style={{ color: '#1A2233' }}>{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
