import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Home, Map, Gift, ClipboardList, LogOut, Trophy, Sun } from "lucide-react";
import { useEnergia } from "@/contexts/EnergiaContext";

export default function EnergiaLayout({ children }: { children: ReactNode }) {
  const { indicador, setIndicador, setCpf } = useEnergia();
  const nav = useNavigate();

  const logout = () => { setIndicador(null); setCpf(""); nav("/energia"); };

  const tabs = [
    { to: "/energia/dashboard", icon: Home, label: "Início" },
    { to: "/energia/trilha", icon: Map, label: "Trilha" },
    { to: "/energia/premios", icon: Gift, label: "Prêmios" },
    { to: "/energia/indicacoes", icon: ClipboardList, label: "Indicações" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8E7] to-[#FFEFD0] pb-24">
      <header className="sticky top-0 z-30 bg-[#1A3C5E] text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <Sun className="w-6 h-6 text-[#F5A623]" />
          <span className="font-bold">Energia que Volta</span>
        </div>
        <div className="flex items-center gap-3">
          <NavLink to="/energia/ranking" className="text-white/90 hover:text-[#F5A623]" title="Ranking">
            <Trophy className="w-5 h-5" />
          </NavLink>
          {indicador && (
            <button onClick={logout} className="text-white/80 hover:text-white" title="Sair">
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#1A3C5E]/10 shadow-lg z-30">
        <div className="max-w-3xl mx-auto grid grid-cols-4">
          {tabs.map(t => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                `flex flex-col items-center py-3 text-xs gap-1 transition-colors ${
                  isActive ? "text-[#E8651A]" : "text-[#1A3C5E]/60 hover:text-[#1A3C5E]"
                }`
              }
            >
              <t.icon className="w-5 h-5" />
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
