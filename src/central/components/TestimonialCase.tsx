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
    <div className="ca-actions">
      {habilitados.map((c) => (
        <div key={c.key} className="ca-vp" style={{ aspectRatio: playing === c.key ? '16/10' : undefined }}>
          {playing === c.key ? (
            <video
              src={c.src}
              poster={c.thumbnail}
              controls
              autoPlay
              onPlay={() => track('video_started', { stepId: `testimonial_${c.key}` })}
              onEnded={() => track('video_completed', { stepId: `testimonial_${c.key}` })}
            />
          ) : (
            <button
              onClick={() => { setPlaying(c.key); track('video_started', { stepId: `testimonial_${c.key}_open` }); }}
              style={{ all: 'unset', position: 'absolute', inset: 0, cursor: 'pointer' }}
            >
              <div className="ca-vp-poster">
                <p className="ca-vp-cat">{c.category}</p>
                <p className="ca-vp-title">{c.title}</p>
              </div>
              <span className="ca-vp-play"><Play className="w-5 h-5" /></span>
            </button>
          )}
        </div>
      ))}

      <div className="ca-actions" style={{ flexDirection: 'row', gap: 10 }}>
        <button onClick={onContinue} className="ca-btn ca-btn-primary" style={{ flex: 1 }}>
          Continuar
        </button>
        <button onClick={() => { track('video_skipped', { stepId: 'testimonials' }); onSkip(); }} className="ca-btn ca-btn-text" style={{ flex: 'none', width: 'auto', padding: '0 16px' }}>
          Pular
        </button>
      </div>
    </div>
  );
}
