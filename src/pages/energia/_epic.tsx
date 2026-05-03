import { useEffect, useRef, useState } from "react";
import { Music, VolumeX } from "lucide-react";
import { evCall } from "@/lib/energiaApi";

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
export const epicName = (n?: string | null) => {
  if (!n) return "Faísca";
  const stripped = n.replace(/^Indicador\s+/i, "").trim();
  return LEGACY_MAP[stripped] || LEGACY_MAP[n] || stripped;
};
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

// Botão flutuante de música de fundo épica (singleton global p/ persistir entre rotas)
const TARGET_VOLUME = 0.06;
type GlobalAudio = { el: HTMLAudioElement; url: string };
function getGlobalAudio(url: string): GlobalAudio {
  const w = window as any;
  if (w.__energiaAudio && w.__energiaAudio.url === url) return w.__energiaAudio;
  if (w.__energiaAudio) { try { w.__energiaAudio.el.pause(); } catch {} }
  const el = new Audio(url);
  el.loop = true; el.volume = 0; el.preload = "auto";
  w.__energiaAudio = { el, url };
  return w.__energiaAudio;
}
export function EpicMusicToggle() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [on, setOn] = useState<boolean>(() => localStorage.getItem("energia_musica_ativa") !== "false");
  const [trackUrl, setTrackUrl] = useState<string>("");
  const fadeRef = useRef<number | null>(null);

  const fade = (to: number, done?: () => void) => {
    const a = audioRef.current; if (!a) return;
    if (fadeRef.current) clearInterval(fadeRef.current);
    const step = (to - a.volume) / 12;
    if (step === 0) { done?.(); return; }
    fadeRef.current = window.setInterval(() => {
      const next = a.volume + step;
      if ((step > 0 && next >= to) || (step < 0 && next <= to)) {
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
    let cancelled = false;
    evCall<{ valor: string | null }>("public_config", { chave: "musica_url" })
      .then(r => { if (!cancelled) setTrackUrl((r?.valor || "").trim()); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!trackUrl) return;
    const g = getGlobalAudio(trackUrl);
    audioRef.current = g.el;
    if (on && g.el.paused) {
      g.el.play().then(() => fade(TARGET_VOLUME)).catch(() => {});
    }
    const onFirstClick = () => {
      if (on && g.el.paused) g.el.play().catch(() => {});
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
      if (fadeRef.current) clearInterval(fadeRef.current);
      // não pausar nem destruir: singleton continua tocando entre rotas
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackUrl]);

  const toggle = () => {
    const next = !on; setOn(next); localStorage.setItem("energia_musica_ativa", next ? "true" : "false");
    const a = audioRef.current; if (!a) return;
    if (next) { a.play().catch(() => {}); fade(TARGET_VOLUME); }
    else fade(0, () => a.pause());
  };

  if (!trackUrl) return null;
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
