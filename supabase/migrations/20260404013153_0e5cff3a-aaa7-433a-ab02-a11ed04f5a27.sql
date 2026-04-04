
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  calculadora boolean NOT NULL DEFAULT false,
  gestor_obras boolean NOT NULL DEFAULT false,
  gestor_clientes boolean NOT NULL DEFAULT false,
  gestor_materiais boolean NOT NULL DEFAULT false,
  gestor_equipamentos boolean NOT NULL DEFAULT false,
  gestor_custos boolean NOT NULL DEFAULT false,
  estoque boolean NOT NULL DEFAULT false,
  admin boolean NOT NULL DEFAULT false,
  importar_dados boolean NOT NULL DEFAULT false,
  sincronizar_sheets boolean NOT NULL DEFAULT false,
  zerar_base boolean NOT NULL DEFAULT false
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage permissions" ON public.user_permissions
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users read own permissions" ON public.user_permissions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Insert permissions for existing users based on their roles
INSERT INTO public.user_permissions (user_id, calculadora, gestor_obras, gestor_clientes, gestor_materiais, gestor_equipamentos, gestor_custos, estoque, admin, importar_dados, sincronizar_sheets, zerar_base)
SELECT 
  up.user_id,
  CASE WHEN up.role IN ('admin', 'orcamentista', 'vendedor') THEN true ELSE false END,
  CASE WHEN up.role IN ('admin', 'gestor') OR up.acesso_painel_gestor THEN true ELSE false END,
  CASE WHEN up.role IN ('admin', 'gestor') OR up.acesso_painel_gestor THEN true ELSE false END,
  CASE WHEN up.role IN ('admin', 'gestor') OR up.acesso_painel_gestor THEN true ELSE false END,
  CASE WHEN up.role IN ('admin', 'gestor') OR up.acesso_painel_gestor THEN true ELSE false END,
  CASE WHEN up.role IN ('admin', 'gestor') OR up.acesso_painel_gestor THEN true ELSE false END,
  CASE WHEN up.role IN ('admin', 'gestor') OR up.acesso_painel_gestor THEN true ELSE false END,
  CASE WHEN up.role = 'admin' THEN true ELSE false END,
  CASE WHEN up.role = 'admin' THEN true ELSE false END,
  CASE WHEN up.role IN ('admin', 'gestor') OR up.acesso_painel_gestor THEN true ELSE false END,
  CASE WHEN up.role = 'admin' THEN true ELSE false END
FROM public.user_profiles up;
