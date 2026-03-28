import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Sun, Lock, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { user, loading: authLoading, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Redirect if already authenticated
  if (!authLoading && user) {
    return user.role === 'admin' ? <Navigate to="/admin" replace /> : <Navigate to="/calculadora" replace />;
  }

  const handleLogin = async () => {
    if (!email || !password) { setError('Preencha e-mail e senha.'); return; }
    setError('');
    setLoading(true);
    const err = await signIn(email, password);
    if (err) {
      setError('E-mail ou senha incorretos.');
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!forgotEmail) return;
    await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}reset-password`,
    });
    setForgotSent(true);
  };

  if (showForgot) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full solar-card p-8 space-y-6 animate-fade-in-up">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-primary">Redefinir Senha</h1>
          </div>
          {forgotSent ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">Link de redefinição enviado para seu e-mail.</p>
              <button onClick={() => { setShowForgot(false); setForgotSent(false); }} className="solar-btn-outline text-sm">Voltar ao login</button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">E-mail cadastrado</label>
                <input className="solar-input" type="email" placeholder="seu@email.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} />
              </div>
              <button className="w-full solar-btn-primary" onClick={handleForgot}>Enviar link de redefinição</button>
              <button onClick={() => setShowForgot(false)} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">Voltar ao login</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full solar-card p-8 space-y-6 animate-fade-in-up">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mx-auto mb-4">
            <Sun className="w-8 h-8 text-secondary" />
          </div>
          <h1 className="text-2xl font-bold text-primary">Três Lagoas Solar</h1>
          <p className="text-sm text-muted-foreground">Acesse o sistema</p>
        </div>
        <div className="space-y-3">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">E-mail</label>
            <input className="solar-input" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Senha</label>
            <input className="solar-input" type="password" placeholder="••••••••" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleLogin(); }} />
          </div>
          <button className="w-full solar-btn-primary" onClick={handleLogin} disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
          <button onClick={() => setShowForgot(true)} className="w-full text-sm text-primary hover:underline">
            Esqueci minha senha
          </button>
        </div>
      </div>
    </div>
  );
}
