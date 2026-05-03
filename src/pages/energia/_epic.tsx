import { useEffect, useRef, useState } from "react";
import { Music, VolumeX } from "lucide-react";

// Mapeia etapas (antigas ou novas) para metadados épicos
export const EPIC_STAGES: { key: string; title: string; icon: string; aura: string }[] = [
  { key: "Faísca",   title: "Indicador Faísca",   icon: "⚡",  aura: "rgba(245,230,200,0.6)" },
  { key: "Volt",     title: "Indicador Volt",     icon: "🔆", aura: "rgba(245,200,80,0.7)" },
  { key: "Ampere",   title: "Indicador Ampere",   icon: "⚡⚡", aura: "rgba(245,166,35,0.85)" },
  { key: "Megawatt", title: "Indicador Megawatt", icon: "🔥", aura: "rgba(232,101,26,0.9)" },
  { key: "Gigawatt", title: "Indicador Gigawatt", icon: "🌟", aura: "rgba(255,215,80,1)" },
  { key: "Master",   title: "Indicador Master",   icon: "👑", aura: "rgba(255,180,40,1)" },
  { key: "Supernova",title: "Indicador Supernova",icon: "💫", aura: "rgba(255,140,200,1)" },
];

// Mapeamento de nomes legados para novos
const LEGACY_MAP: Record<string, string> = {
  Raio: "Faísca", Painel: "Volt", Gerador: "Ampere", Usina: "Megawatt", Central: "Gigawatt", "Sol Maior": "Gigawatt",
};

// Pega metadata épica por nome do banco (se não achar, usa default genérico)
export function epicMetaByName(nome?: string | null) {
  const k = epicName(nome);
  return EPIC_STAGES.find(s => s.key === k) || { key: k, title: nome || k, icon: "⭐", aura: "rgba(245,166,35,0.7)" };
}
export const epicName = (n?: string | null) => (n ? (LEGACY_MAP[n] || n) : "Faísca");
export const epicMeta = (n?: string | null) => {
  const k = epicName(n);
  return EPIC_STAGES.find(s => s.key === k) || EPIC_STAGES[0];
};

// Partículas flutuantes
export function EpicParticles({ count = 18 }: { count?: number }) {
  const items = Array.from({ length: count });
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {items.map((_, i) => {
        const left = (i * 53) % 100;
        const top = (i * 37) % 100;
        const size = 2 + (i % 4);
        const delay = (i % 7) * 0.6;
        const dur = 6 + (i % 5);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${left}%`, top: `${top}%`,
              width: size, height: size,
              borderRadius: "50%",
              background: "radial-gradient(circle, #F5E6C8, transparent 70%)",
              animation: `ev-float ${dur}s ease-in-out ${delay}s infinite`,
              opacity: 0.65,
            }}
          />
        );
      })}
    </div>
  );
}

// Botão flutuante de música de fundo épica
const TRACK = "https://cdn.pixabay.com/audio/2022/03/15/audio_8cb749ec9e.mp3";
const TRACK_FALLBACK = "https://cdn.pixabay.com/audio/2023/06/06/audio_3741b40cb1.mp3";
const TARGET_VOLUME = 0.25;
export function EpicMusicToggle() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [on, setOn] = useState<boolean>(() => localStorage.getItem("energia_musica_ativa") !== "false");
  const fadeRef = useRef<number | null>(null);

  const fade = (to: number, done?: () => void) => {
    const a = audioRef.current; if (!a) return;
    if (fadeRef.current) clearInterval(fadeRef.current);
    const step = (to - a.volume) / 12;
    fadeRef.current = window.setInterval(() => {
      const next = a.volume + step;
      if ((step > 0 && next >= to) || (step < 0 && next <= to) || step === 0) {
        a.volume = to;
        if (fadeRef.current) clearInterval(fadeRef.current);
        fadeRef.current = null;
        done?.();
      } else {
        a.volume = Math.max(0, Math.min(1, next));
      }
    }, 40);
  };

  useEffect(() => {
    const a = new Audio(TRACK);
    a.loop = true; a.volume = 0; a.preload = "auto";
    a.addEventListener("error", () => { if (a.src !== TRACK_FALLBACK) a.src = TRACK_FALLBACK; });
    audioRef.current = a;
    if (on) a.play().catch(() => {/* autoplay bloqueado */});
    const onFirstClick = () => {
      if (on && a.paused) a.play().catch(() => {});
      if (on) fade(TARGET_VOLUME);
      window.removeEventListener("click", onFirstClick);
      window.removeEventListener("touchstart", onFirstClick);
    };
    window.addEventListener("click", onFirstClick);
    window.addEventListener("touchstart", onFirstClick);
    const onVis = () => {
      if (!audioRef.current) return;
      if (document.hidden) audioRef.current.pause();
      else if (on) audioRef.current.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("click", onFirstClick);
      window.removeEventListener("touchstart", onFirstClick);
      document.removeEventListener("visibilitychange", onVis);
      a.pause(); audioRef.current = null;
      if (fadeRef.current) clearInterval(fadeRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = () => {
    const next = !on; setOn(next); localStorage.setItem("energia_musica_ativa", next ? "true" : "false");
    const a = audioRef.current; if (!a) return;
    if (next) { a.play().catch(() => {}); fade(TARGET_VOLUME); }
    else fade(0, () => a.pause());
  };

  return (
    <button onClick={toggle}
      className="flex items-center justify-center text-lg"
      style={{
        position: "fixed", bottom: 88, left: 16, zIndex: 50,
        width: 48, height: 48, borderRadius: "50%",
        background: "rgba(20,12,0,0.9)", border: "1px solid #C17F24",
        boxShadow: "0 4px 16px rgba(0,0,0,0.5), 0 0 12px rgba(245,166,35,0.3)",
        color: "#F5A623",
      }}
      title={on ? "Silenciar música" : "Tocar música épica"}
      aria-label={on ? "Silenciar música" : "Tocar música"}
    >
      <span style={{ fontSize: 20, lineHeight: 1 }}>{on ? "🎵" : "🔇"}</span>
    </button>
  );
}

// Overlay de conquista de etapa
export function EpicLevelUpOverlay({ etapa, onClose }: { etapa: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  const meta = epicMeta(etapa);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.85)", animation: "ev-epic-entrance .4s ease-out" }}>
      <div className="absolute inset-0">
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} style={{
            position: "absolute", left: "50%", top: "50%",
            width: 6, height: 6, borderRadius: "50%",
            background: "#F5A623",
            transform: `translate(-50%,-50%) rotate(${i * 12}deg) translateY(-${100 + (i%5)*30}px)`,
            opacity: 0.85, boxShadow: "0 0 12px #F5A623",
            animation: `ev-float ${1.5 + (i%4)*0.4}s ease-out`,
          }} />
        ))}
      </div>
      <div className="text-center ev-enter">
        <div className="text-7xl mb-4" style={{ filter: "drop-shadow(0 0 30px #F5A623)" }}>{meta.icon}</div>
        <div className="ev-font-epic text-3xl font-black ev-text-glow" style={{ color: "#F5A623" }}>NOVO NÍVEL</div>
        <div className="ev-font-epic text-4xl font-black mt-2 ev-sparkle" style={{ color: "#F5E6C8" }}>{meta.title}</div>
      </div>
    </div>
  );
}
