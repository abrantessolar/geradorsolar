import { useEffect } from "react";

// Metadados de cada nível da trilha de indicação.
export const EPIC_STAGES: { key: string; title: string; icon: string; aura: string }[] = [
  { key: "Faísca",   title: "Bronze",   icon: "", aura: "" },
  { key: "Volt",     title: "Prata",    icon: "", aura: "" },
  { key: "Ampere",   title: "Ouro",     icon: "", aura: "" },
  { key: "Megawatt", title: "Platina",  icon: "", aura: "" },
  { key: "Gigawatt", title: "Diamante", icon: "", aura: "" },
  { key: "Master",   title: "Diamante", icon: "", aura: "" },
  { key: "Supernova",title: "Diamante", icon: "", aura: "" },
];

// Mapeamento de nomes legados para novos (mantém compatibilidade com dados já gravados)
const LEGACY_MAP: Record<string, string> = {
  Raio: "Faísca", Painel: "Volt", Gerador: "Ampere", Usina: "Megawatt", Central: "Gigawatt", "Sol Maior": "Gigawatt",
};

// Pega metadata do nível pelo nome salvo no banco (se não achar, usa um default neutro)
export function epicMetaByName(nome?: string | null) {
  const k = epicName(nome);
  return EPIC_STAGES.find(s => s.key === k) || { key: k, title: nome || k, icon: "", aura: "" };
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

// Aviso de novo nível — card simples, sem confete nem som.
export function EpicLevelUpOverlay({ etapa, onClose }: { etapa: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  const meta = epicMeta(etapa);
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(10,18,30,0.55)", animation: "ev-fade-in .3s ease-out" }}
      onClick={onClose}
    >
      <div className="ev-card ev-enter p-7 max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
        <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: "#F5A623" }}>Parabéns!</div>
        <div className="text-xl font-extrabold" style={{ color: "#1A2233" }}>Você subiu para o nível {meta.title}</div>
      </div>
    </div>
  );
}
