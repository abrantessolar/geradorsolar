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
    <div className="space-y-4">
      <div className="rounded-2xl overflow-hidden relative" style={{ background: '#1A2233' }}>
        <video
          ref={videoRef}
          src={video.src}
          poster={video.thumbnail}
          muted={muted}
          playsInline
          controls
          className="w-full aspect-video"
          onPlay={() => track('video_started', { stepId })}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => track('video_completed', { stepId })}
        />
        <button
          onClick={() => setMuted((m) => !m)}
          className="absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          aria-label={muted ? 'Ativar som' : 'Silenciar'}
        >
          {muted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
        </button>
      </div>
      <div className="flex gap-3">
        <button onClick={onContinue} className="flex-1 h-12 rounded-xl font-bold" style={{ background: '#F5A623', color: '#1A2233' }}>
          Continuar
        </button>
        <button
          onClick={() => { track('video_skipped', { stepId }); onContinue(); }}
          className="px-4 h-12 rounded-xl font-semibold" style={{ color: '#6B7585' }}
        >
          Pular
        </button>
      </div>
    </div>
  );
}
