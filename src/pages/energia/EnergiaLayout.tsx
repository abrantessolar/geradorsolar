import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Home, Map, Gift, ScrollText, LogOut, Trophy, Sun } from "lucide-react";
import { useEnergia } from "@/contexts/EnergiaContext";
import { EpicParticles, EpicMusicToggle } from "./_epic";

export default function EnergiaLayout({ children }: { children: ReactNode }) {
  const { indicador, setIndicador, setCpf } = useEnergia();
  const nav = useNavigate();

  const logout = () => { setIndicador(null); setCpf(""); nav("/energia"); };

  const tabs = [
    { to: "/energia/dashboard", icon: Home, label: "Início" },
    { to: "/energia/trilha", icon: Map, label: "Trilha" },
    { to: "/energia/premios", icon: Gift, label: "Relíquias" },
    { to: "/energia/indicacoes", icon: ScrollText, label: "Indicações" },
  ];

  return (
    <div className="ev-epic pb-10">
      <EpicParticles />
      <EpicMusicToggle />
      <header className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between"
        style={{ background: "linear-gradient(180deg, rgba(13,10,0,0.95), rgba(26,15,0,0.85))", borderBottom: "1px solid rgba(245,166,35,0.35)", backdropFilter: "blur(10px)" }}>
        <div className="flex items-center gap-2">
          <Sun className="w-6 h-6 ev-sparkle" style={{ color: "#F5A623" }} />
          <span className="ev-font-epic font-bold tracking-wide" style={{ color: "#F5E6C8" }}>Energia que Volta</span>
        </div>
        <div className="flex items-center gap-3">
          <NavLink to="/energia/ranking" title="Hall dos Guerreiros" style={{ color: "#F5A623" }}>
            <Trophy className="w-5 h-5" />
          </NavLink>
          {indicador && (
            <button onClick={logout} title="Sair" style={{ color: "#A08060" }}>
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Top navigation */}
      <nav className="sticky top-0 z-20"
        style={{ background: "rgba(20,12,0,0.95)", borderBottom: "1px solid #C17F24", backdropFilter: "blur(8px)" }}>
        <div className="max-w-3xl mx-auto flex overflow-x-auto ev-scroll">
          {tabs.map(t => (
            <NavLink key={t.to} to={t.to}
              className={({ isActive }) =>
                `flex-1 min-w-[88px] flex flex-col items-center py-2.5 text-[11px] gap-1 ev-font-epic transition-all border-b-2 ${isActive ? "ev-text-glow" : ""}`
              }
              style={({ isActive }) => ({
                color: isActive ? "#F5A623" : "#A08060",
                borderBottomColor: isActive ? "#F5A623" : "transparent",
              })}
            >
              <t.icon className="w-5 h-5" />
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-5 relative z-10">{children}</main>
    </div>
  );
}
