import { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import { VideoDef } from '../config/videos';
import { track } from '../lib/analytics';

/**
 * Prova social (seção 14 da spec). Mostra só os cases habilitados; se
 * nenhum estiver habilitado, o step pula direto (ninguém fica olhando pra
 * uma tela vazia). O usuário nunca é obrigado a assistir inteiro.
 */
export default function TestimonialCase({ cases, onContinue, onSkip }: { cases: Array<VideoDef & { key: string }>; onContinue: () => void; onSkip: () => void }) {
  const [playing, setPlaying] = useState<string | null>(null);
  const habilitados = cases.filter((c) => c.enabled && c.src);

  useEffect(() => {
    if (habilitados.length === 0) onContinue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (habilitados.length === 0) return null;

  return (
    <div className="space-y-3">
      {habilitados.map((c) => (
        <div key={c.key} className="rounded-2xl border overflow-hidden" style={{ borderColor: '#E3E8EF' }}>
          {playing === c.key ? (
            <video
              src={c.src}
              poster={c.thumbnail}
              controls
              autoPlay
              className="w-full aspect-video"
              onPlay={() => track('video_started', { stepId: `testimonial_${c.key}` })}
              onEnded={() => track('video_completed', { stepId: `testimonial_${c.key}` })}
            />
          ) : (
            <button
              onClick={() => { setPlaying(c.key); track('video_started', { stepId: `testimonial_${c.key}_open` }); }}
              className="w-full flex items-center gap-3 p-4 text-left"
            >
              <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#1A3C5E' }}>
                <Play className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#F5A623' }}>{c.category}</p>
                <p className="font-semibold" style={{ color: '#1A2233' }}>{c.title}</p>
                {c.description && <p className="text-sm mt-0.5" style={{ color: '#6B7585' }}>{c.description}</p>}
              </div>
            </button>
          )}
        </div>
      ))}

      <div className="flex gap-3 pt-1">
        <button onClick={onContinue} className="flex-1 h-12 rounded-xl font-bold" style={{ background: '#F5A623', color: '#1A2233' }}>
          Continuar
        </button>
        <button onClick={() => { track('video_skipped', { stepId: 'testimonials' }); onSkip(); }} className="px-4 h-12 rounded-xl font-semibold" style={{ color: '#6B7585' }}>
          Pular
        </button>
      </div>
    </div>
  );
}
