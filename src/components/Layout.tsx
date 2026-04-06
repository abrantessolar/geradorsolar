import { Link, useLocation } from 'react-router-dom';
import { Calculator, Settings, Menu, X, LogOut, HardHat, Package, DollarSign, Users } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNewLeadsCount } from '@/components/LeadNotification';
import logoImg from '@/assets/logo.png';

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, signOut, permissions } = useAuth();
  const isProposal = location.pathname.startsWith('/proposta/');
  const newLeadsCount = useNewLeadsCount();

  if (isProposal) return <>{children}</>;

  

  const hasAnyGestor = permissions.gestor_obras || permissions.gestor_materiais || permissions.gestor_equipamentos;

  const navItems = [
    ...(permissions.estoque ? [{ path: '/estoque', label: 'Estoque', icon: Package, badge: 0 }] : []),
    ...(permissions.calculadora ? [{ path: '/orcamentos', label: 'Calculadora', icon: Calculator, badge: 0 }] : []),
    ...(permissions.gestor_clientes ? [{ path: '/clientes', label: 'Clientes', icon: Users, badge: 0 }] : []),
    ...(permissions.gestor_custos ? [{ path: '/custos', label: 'Custos', icon: DollarSign, badge: 0 }] : []),
    ...(permissions.admin ? [{ path: '/admin', label: 'Admin', icon: Settings, badge: newLeadsCount }] : []),
    ...(hasAnyGestor ? [{ path: '/gestor', label: 'Gestor', icon: HardHat, badge: 0 }] : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="no-print sticky top-0 z-50 bg-card border-b border-border/50 shadow-sm">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3 group">
            <img src={logoImg} alt="Três Lagoas Solar" className="w-10 h-10 object-contain" />
            <div className="hidden sm:block">
              <span className="text-lg font-bold text-primary leading-none">Três Lagoas Solar</span>
              <span className="block text-xs text-muted-foreground">Energia Limpa</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <nav className="flex items-center gap-1">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 relative ${
                    location.pathname === item.path
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                  {item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </nav>
            {profile && (
              <div className="flex items-center gap-3 ml-4 pl-4 border-l border-border/50">
                <span className="text-xs text-muted-foreground">{profile.nome}</span>
                <button onClick={signOut} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive transition-colors" title="Sair">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileOpen && (
          <nav className="md:hidden border-t border-border/50 p-2 animate-fade-in-up">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${
                  location.pathname === item.path
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
            {profile && (
              <button onClick={() => { signOut(); setMobileOpen(false); }}
                className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-muted w-full text-left">
                <LogOut className="w-4 h-4" /> Sair ({profile.nome})
              </button>
            )}
          </nav>
        )}
      </header>

      <main className="container py-6">{children}</main>

      <footer className="no-print border-t border-border/50 py-6 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Três Lagoas Solar — Energia Limpa</p>
      </footer>
    </div>
  );
}
