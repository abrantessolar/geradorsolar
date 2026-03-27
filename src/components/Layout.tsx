import { Link, useLocation } from 'react-router-dom';
import { Sun, Calculator, Settings, Menu, X, LogOut, FileText } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();

  const isProposal = location.pathname.startsWith('/proposta/');
  const isLogin = location.pathname === '/login';
  const isReset = location.pathname === '/reset-password';

  if (isProposal || isLogin || isReset) return <>{children}</>;

  const NAV_ITEMS = [
    { path: '/calculadora', label: 'Calculadora', icon: Calculator },
    {
      path: '/admin',
      label: user?.role === 'admin' ? 'Admin' : user?.role === 'orcamentista' ? 'Painel' : 'Propostas',
      icon: user?.role === 'admin' ? Settings : FileText,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="no-print sticky top-0 z-50 bg-card border-b border-border/50 shadow-sm">
        <div className="container flex items-center justify-between h-16">
          <Link to="/calculadora" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <Sun className="w-6 h-6 text-secondary" />
            </div>
            <div className="hidden sm:block">
              <span className="text-lg font-bold text-primary leading-none">Três Lagoas Solar</span>
              <span className="block text-xs text-muted-foreground">Energia Limpa</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(item => (
              <Link key={item.path} to={item.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  location.pathname === item.path
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-muted'
                }`}>
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
            {user && (
              <button onClick={signOut}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-muted transition-colors">
                <LogOut className="w-4 h-4" /> Sair
              </button>
            )}
          </nav>

          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileOpen && (
          <nav className="md:hidden border-t border-border/50 p-2 animate-fade-in-up">
            {NAV_ITEMS.map(item => (
              <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${
                  location.pathname === item.path
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-muted'
                }`}>
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
            {user && (
              <button onClick={() => { signOut(); setMobileOpen(false); }}
                className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive w-full text-left">
                <LogOut className="w-4 h-4" /> Sair
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
