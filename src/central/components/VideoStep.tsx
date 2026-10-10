import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { VideoDef } from '../config/videos';
import { track } from '../lib/analytics';

/**
 * <VideoStep /> reutilizável entre etapas. Se o vídeo estiver desativado ou
 * sem src configurado, passa direto para o próximo passo (seção 15 da spec:
 * "cada vídeo precisa poder ser ativado/desativado"). Nunca é pop-up.
 */
export default function VideoStep({ video, stepId, onContinue }: { video: VideoDef | undefined; stepId: string; onContinue: () => void }) {
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const milestonesFired = useRef(new Set<number>());

  useEffect(() => {
    if (!video?.enabled || !video.src) {
      onContinue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!video?.enabled || !video.src) return null;

  const handleTimeUpdate = () => {
    const el = videoRef.current;
    if (!el || !el.duration) return;
    const pct = (el.currentTime / el.duration) * 100;
    [25, 50, 75].forEach((marco) => {
      if (pct >= marco && !milestonesFired.current.has(marco)) {
        milestonesFired.current.add(marco);
        track(`video_${marco}` as 'video_25', { stepId });
      }
    });
  };

  return (
    <div className="ca-actions">
      <div className="ca-vp">
        <video
          ref={videoRef}
          src={video.src}
          poster={video.thumbnail}
          muted={muted}
          playsInline
          controls
          onPlay={() => track('video_started', { stepId })}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => track('video_completed', { stepId })}
        />
        <button
          onClick={() => setMuted((m) => !m)}
          style={{ position: 'absolute', bottom: 12, right: 12, width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer', zIndex: 1 }}
          aria-label={muted ? 'Ativar som' : 'Silenciar'}
        >
          {muted ? <VolumeX className="w-4 h-4" style={{ color: '#fff' }} /> : <Volume2 className="w-4 h-4" style={{ color: '#fff' }} />}
        </button>
      </div>
      <div className="ca-actions" style={{ flexDirection: 'row', gap: 10 }}>
        <button onClick={onContinue} className="ca-btn ca-btn-primary" style={{ flex: 1 }}>
          Continuar
        </button>
        <button
          onClick={() => { track('video_skipped', { stepId }); onContinue(); }}
          className="ca-btn ca-btn-text"
          style={{ flex: 'none', width: 'auto', padding: '0 16px' }}
        >
          Pular
        </button>
      </div>
    </div>
  );
}
