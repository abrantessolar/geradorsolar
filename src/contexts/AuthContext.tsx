import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  user_id: string;
  nome: string;
  email: string;
  role: string;
  ativo: boolean;
  ultimo_acesso?: string | null;
  criado_em?: string;
  acesso_painel_gestor?: boolean;
}

interface AuthContextType {
  session: any;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isOrcamentista: boolean;
  isVendedor: boolean;
  hasGestorAccess: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const SESSION_MAX_HOURS = 8;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (data) {
      setProfile(data as unknown as UserProfile);
      // Update last access
      supabase.from('user_profiles').update({ ultimo_acesso: new Date().toISOString() }).eq('user_id', userId).then(() => {});
    } else {
      setProfile(null);
    }
  };

  const checkSessionAge = (session: any) => {
    if (!session) return false;
    const iat = session.user?.last_sign_in_at;
    if (iat) {
      const diff = (Date.now() - new Date(iat).getTime()) / (1000 * 60 * 60);
      if (diff > SESSION_MAX_HOURS) {
        supabase.auth.signOut();
        return false;
      }
    }
    return true;
  };

  useEffect(() => {
    let mounted = true;

    // Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session && checkSessionAge(session)) {
        setSession(session);
        // Use setTimeout to avoid Supabase deadlock on nested calls
        setTimeout(async () => {
          if (mounted) {
            await fetchProfile(session.user.id);
            setLoading(false);
          }
        }, 0);
      } else {
        setSession(null);
        setProfile(null);
        setLoading(false);
      }
    });

    // Then get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      if (session && checkSessionAge(session)) {
        setSession(session);
        await fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    // Safety timeout - never stay loading forever
    const timeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 5000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{
      session,
      profile,
      loading,
      isAdmin: profile?.role === 'admin',
      isOrcamentista: profile?.role === 'orcamentista',
      isVendedor: profile?.role === 'vendedor',
      hasGestorAccess: profile?.acesso_painel_gestor === true || profile?.role === 'admin',
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
