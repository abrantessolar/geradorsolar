import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'orcamentista' | 'vendedor';

export interface AuthUser {
  id: string;
  email: string;
  nome: string;
  role: UserRole;
  user_id: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
  return useContext(AuthContext);
}

const SESSION_MAX_AGE = 8 * 60 * 60 * 1000; // 8 hours

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string, email: string) => {
    // Check session age
    const sessionStart = parseInt(localStorage.getItem('session_start') || '0');
    if (sessionStart && Date.now() - sessionStart > SESSION_MAX_AGE) {
      await supabase.auth.signOut();
      localStorage.removeItem('session_start');
      setUser(null);
      setLoading(false);
      return;
    }

    let { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // Bootstrap: create profile for existing admin user
    if (!data && email === 'contato@treslagoassolar.com.br') {
      await supabase.from('user_profiles').insert({
        user_id: userId,
        nome: 'Administrador',
        email,
        role: 'admin',
        senha_visivel: '#Proposta01',
      });
      const result = await supabase.from('user_profiles').select('*').eq('user_id', userId).maybeSingle();
      data = result.data;
    }

    if (data && (data as any).ativo) {
      setUser({
        id: (data as any).id,
        email: (data as any).email,
        nome: (data as any).nome,
        role: (data as any).role as UserRole,
        user_id: (data as any).user_id,
      });
      // Update last access (fire and forget)
      supabase.from('user_profiles')
        .update({ ultimo_acesso: new Date().toISOString() })
        .eq('user_id', userId)
        .then();
    } else if (data && !(data as any).ativo) {
      await supabase.auth.signOut();
      setUser(null);
    } else {
      // No profile found - sign out
      await supabase.auth.signOut();
      setUser(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setTimeout(() => loadProfile(session.user.id, session.user.email || ''), 0);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user.id, session.user.email || '');
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    localStorage.setItem('session_start', Date.now().toString());
    return null;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('session_start');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
