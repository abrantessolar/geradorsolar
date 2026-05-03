import { ReactNode } from "react";
import { NavLink, Navigate, useNavigate } from "react-router-dom";
import { LayoutDashboard, Gift, Map, Coins, Users, ClipboardList, PackageCheck, Settings, LogOut, Sun } from "lucide-react";
import { evClearAdminToken, evGetAdminToken } from "@/lib/energiaApi";

const items = [
  { to: "/energia/admin", icon: LayoutDashboard, label: "Visão geral", end: true },
  { to: "/energia/admin/premios", icon: Gift, label: "Prêmios" },
  { to: "/energia/admin/trilha", icon: Map, label: "Trilha" },
  { to: "/energia/admin/pontuacao", icon: Coins, label: "Pontuação" },
  { to: "/energia/admin/clientes", icon: Users, label: "Clientes" },
  { to: "/energia/admin/indicacoes", icon: ClipboardList, label: "Indicações" },
  { to: "/energia/admin/resgates", icon: PackageCheck, label: "Resgates" },
  { to: "/energia/admin/configuracoes", icon: Settings, label: "Configurações" },
];

export default function EnergiaAdminLayout({ children }: { children: ReactNode }) {
  const nav = useNavigate();
  const token = evGetAdminToken();
  if (!token) return <Navigate to="/energia/admin/login" replace />;

  const sair = () => { evClearAdminToken(); nav("/energia/admin/login"); };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-60 bg-[#1A3C5E] text-white flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center gap-2">
          <Sun className="w-6 h-6 text-[#F5A623]" />
          <div>
            <div className="font-bold text-sm">Energia que Volta</div>
            <div className="text-[10px] text-white/60">Admin</div>
          </div>
        </div>
        <nav className="flex-1 py-2">
          {items.map(it => (
            <NavLink
              key={it.to}
              to={it.to}
              end={(it as any).end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition ${isActive ? "bg-[#F5A623] text-[#1A3C5E] font-bold" : "hover:bg-white/10"}`
              }
            >
              <it.icon className="w-4 h-4" /> {it.label}
            </NavLink>
          ))}
        </nav>
        <button onClick={sair} className="m-3 p-2 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center gap-2 text-sm">
          <LogOut className="w-4 h-4" /> Sair
        </button>
      </aside>
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
