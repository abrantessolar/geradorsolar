import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Lock, Check, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      // Supabase handles the session automatically
    }
  }, []);

  const handleReset = async () => {
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError('Erro ao redefinir senha. Tente novamente.');
    } else {
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto mt-20 solar-card p-8 space-y-6 animate-fade-in-up">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-primary">Nova Senha</h1>
        <p className="text-sm text-muted-foreground">Digite sua nova senha abaixo</p>
      </div>

      {success ? (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-100 text-green-800 text-sm">
          <Check className="w-4 h-4" />
          Senha redefinida com sucesso! Redirecionando...
        </div>
      ) : (
        <div className="space-y-3">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Nova senha</label>
            <input className="solar-input" type="password" placeholder="••••••••" value={password}
              onChange={e => setPassword(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Confirmar senha</label>
            <input className="solar-input" type="password" placeholder="••••••••" value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleReset(); }} />
          </div>
          <button className="w-full solar-btn-primary" onClick={handleReset} disabled={loading}>
            {loading ? 'Redefinindo...' : 'Redefinir Senha'}
          </button>
        </div>
      )}
    </div>
  );
}
