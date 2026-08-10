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

export interface UserPermissions {
  calculadora: boolean;
  gestor_obras: boolean;
  gestor_clientes: boolean;
  gestor_materiais: boolean;
  gestor_equipamentos: boolean;
  gestor_custos: boolean;
  estoque: boolean;
  admin: boolean;
  importar_dados: boolean;
  sincronizar_sheets: boolean;
  zerar_base: boolean;
  /** Responsável exclusivo pelo pós-venda (recebe avisos/badge). Não é herdada por admin. */
  posvenda: boolean;
}

const DEFAULT_PERMISSIONS: UserPermissions = {
  calculadora: false, gestor_obras: false, gestor_clientes: false,
  gestor_materiais: false, gestor_equipamentos: false, gestor_custos: false,
  estoque: false, admin: false, importar_dados: false, sincronizar_sheets: false, zerar_base: false,
  posvenda: false,
};

interface AuthContextType {
  session: any;
  profile: UserProfile | null;
  permissions: UserPermissions;
  loading: boolean;
  isAdmin: boolean;
  isGestor: boolean;
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
  const [permissions, setPermissions] = useState<UserPermissions>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const [{ data: profileData }, { data: permsData }] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('user_permissions').select('*').eq('user_id', userId).maybeSingle(),
    ]);
    if (profileData) {
      setProfile(profileData as unknown as UserProfile);
      supabase.from('user_profiles').update({ ultimo_acesso: new Date().toISOString() }).eq('user_id', userId).then(() => {});
    } else {
      setProfile(null);
    }
    if (permsData) {
      const p = permsData as any;
      // Admin always has all permissions
      if (p.admin || profileData?.role === 'admin') {
        setPermissions({
          calculadora: true, gestor_obras: true, gestor_clientes: true,
          gestor_materiais: true, gestor_equipamentos: true, gestor_custos: true,
          estoque: true, admin: true, importar_dados: true, sincronizar_sheets: true, zerar_base: true,
          posvenda: p.posvenda ?? false,
        });
      } else {
        setPermissions({
          calculadora: p.calculadora ?? false,
          gestor_obras: p.gestor_obras ?? false,
          gestor_clientes: p.gestor_clientes ?? false,
          gestor_materiais: p.gestor_materiais ?? false,
          gestor_equipamentos: p.gestor_equipamentos ?? false,
          gestor_custos: p.gestor_custos ?? false,
          estoque: p.estoque ?? false,
          admin: p.admin ?? false,
          importar_dados: p.importar_dados ?? false,
          sincronizar_sheets: p.sincronizar_sheets ?? false,
          zerar_base: p.zerar_base ?? false,
          posvenda: p.posvenda ?? false,
        });
      }
    } else {
      // No permissions row — fallback based on role
      if (profileData?.role === 'admin') {
        setPermissions({
          calculadora: true, gestor_obras: true, gestor_clientes: true,
          gestor_materiais: true, gestor_equipamentos: true, gestor_custos: true,
          estoque: true, admin: true, importar_dados: true, sincronizar_sheets: true, zerar_base: true,
          posvenda: false,
        });
      } else {
        setPermissions(DEFAULT_PERMISSIONS);
      }
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session && checkSessionAge(session)) {
        setSession(session);
        setTimeout(async () => {
          if (mounted) {
            await fetchProfile(session.user.id);
            setLoading(false);
          }
        }, 0);
      } else {
        setSession(null);
        setProfile(null);
        setPermissions(DEFAULT_PERMISSIONS);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      if (session && checkSessionAge(session)) {
        setSession(session);
        await fetchProfile(session.user.id);
      }
      setLoading(false);
    });

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
    setPermissions(DEFAULT_PERMISSIONS);
  };

  return (
    <AuthContext.Provider value={{
      session,
      profile,
      permissions,
      loading,
      isAdmin: profile?.role === 'admin',
      isGestor: profile?.role === 'gestor',
      isOrcamentista: profile?.role === 'orcamentista',
      isVendedor: profile?.role === 'vendedor',
      hasGestorAccess: profile?.role === 'admin' || profile?.role === 'gestor' || profile?.acesso_painel_gestor === true,
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
