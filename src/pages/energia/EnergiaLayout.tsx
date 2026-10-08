import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Home, Map, Gift, ScrollText, LogOut, Trophy, Sun } from "lucide-react";
import { useEnergia } from "@/contexts/EnergiaContext";

export default function EnergiaLayout({ children }: { children: ReactNode }) {
  const { indicador, setIndicador, setCpf } = useEnergia();
  const nav = useNavigate();

  const logout = () => { setIndicador(null); setCpf(""); nav("/energia"); };

  const tabs = [
    { to: "/energia/dashboard", icon: Home, label: "Início" },
    { to: "/energia/trilha", icon: Map, label: "Nível" },
    { to: "/energia/premios", icon: Gift, label: "Prêmios" },
    { to: "/energia/indicacoes", icon: ScrollText, label: "Indicações" },
  ];

  return (
    <div className="ev-epic pb-10">
      <header className="relative z-30 px-4 py-3 flex items-center justify-between" style={{ background: "#1A3C5E" }}>
        <div className="flex items-center gap-2">
          <Sun className="w-6 h-6" style={{ color: "#F5A623" }} />
          <span className="font-bold tracking-wide" style={{ color: "#FFFFFF" }}>Energia que Volta</span>
        </div>
        <div className="flex items-center gap-3">
          <NavLink to="/energia/ranking" title="Ranking" style={{ color: "#F5A623" }}>
            <Trophy className="w-5 h-5" />
          </NavLink>
          {indicador && (
            <button onClick={logout} title="Sair" style={{ color: "#AEB9C9" }}>
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Navegação */}
      <nav className="relative z-20" style={{ background: "#FFFFFF", borderBottom: "1px solid #E3E8EF" }}>
        <div className="max-w-3xl mx-auto flex overflow-x-auto ev-scroll">
          {tabs.map(t => (
            <NavLink key={t.to} to={t.to}
              className={({ isActive }) =>
                `flex-1 min-w-[88px] flex flex-col items-center py-2.5 text-[11px] gap-1 font-medium transition-all border-b-2 ${isActive ? "" : ""}`
              }
              style={({ isActive }) => ({
                color: isActive ? "#F5A623" : "#6B7585",
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

      <footer className="relative z-10 mt-8 pb-6 text-center">
        <a
          href="/docs/regulamento-energia-que-volta.pdf"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#8891A0", fontSize: 11, textDecoration: "underline" }}
        >
          Termos do Programa
        </a>
      </footer>
    </div>
  );
}
