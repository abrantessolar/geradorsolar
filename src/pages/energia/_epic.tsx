import { useEffect, useRef, useState } from "react";
import { Music, VolumeX } from "lucide-react";

// Mapeia etapas (antigas ou novas) para metadados épicos
export const EPIC_STAGES: { key: string; title: string; icon: string; aura: string }[] = [
  { key: "Faísca",   title: "Indicador Faísca",   icon: "⚡",  aura: "rgba(245,230,200,0.6)" },
  { key: "Volt",     title: "Indicador Volt",     icon: "🔆", aura: "rgba(245,200,80,0.7)" },
  { key: "Ampere",   title: "Indicador Ampere",   icon: "⚡⚡", aura: "rgba(245,166,35,0.85)" },
  { key: "Megawatt", title: "Indicador Megawatt", icon: "🔥", aura: "rgba(232,101,26,0.9)" },
  { key: "Gigawatt", title: "Indicador Gigawatt", icon: "🌟", aura: "rgba(255,215,80,1)" },
];

// Mapeamento de nomes legados para novos
const LEGACY_MAP: Record<string, string> = {
  Raio: "Faísca", Painel: "Volt", Gerador: "Ampere", Usina: "Megawatt", Central: "Gigawatt", "Sol Maior": "Gigawatt",
};
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

// Botão flutuante de música
const TRACK = "https://cdn.pixabay.com/audio/2022/10/30/audio_347111d654.mp3"; // epic orchestral free
export function EpicMusicToggle() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [on, setOn] = useState<boolean>(() => localStorage.getItem("ev_music") === "1");

  useEffect(() => {
    const a = new Audio(TRACK);
    a.loop = true; a.volume = 0;
    audioRef.current = a;
    return () => { a.pause(); audioRef.current = null; };
  }, []);

  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    if (on) {
      a.play().catch(() => {});
      let v = 0; const target = 0.3;
      const t = setInterval(() => { v = Math.min(target, v + 0.03); a.volume = v; if (v >= target) clearInterval(t); }, 80);
      return () => clearInterval(t);
    } else {
      let v = a.volume; const t = setInterval(() => {
        v = Math.max(0, v - 0.05); a.volume = v;
        if (v <= 0) { a.pause(); clearInterval(t); }
      }, 60);
      return () => clearInterval(t);
    }
  }, [on]);

  const toggle = () => { const v = !on; setOn(v); localStorage.setItem("ev_music", v ? "1" : "0"); };
  return (
    <button onClick={toggle}
      className="fixed top-3 right-3 z-50 w-10 h-10 rounded-full ev-card-glow flex items-center justify-center"
      style={{ background: "rgba(30,18,0,0.85)", border: "1px solid rgba(245,166,35,0.6)", color: "#F5A623" }}
      title={on ? "Silenciar música" : "Tocar música épica"}
    >
      {on ? <Music className="w-4 h-4 ev-sparkle" /> : <VolumeX className="w-4 h-4" />}
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
