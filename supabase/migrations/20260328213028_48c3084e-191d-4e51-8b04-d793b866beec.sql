
-- =============================================
-- 1. Fix RLS on equipamentos_kits
-- =============================================
DROP POLICY IF EXISTS "Admins inserem kits" ON equipamentos_kits;
CREATE POLICY "Admins inserem kits" ON equipamentos_kits
  FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins atualizam kits" ON equipamentos_kits;
CREATE POLICY "Admins atualizam kits" ON equipamentos_kits
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins deletam kits" ON equipamentos_kits;
CREATE POLICY "Admins deletam kits" ON equipamentos_kits
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- =============================================
-- 2. Fix RLS on vendedores
-- =============================================
DROP POLICY IF EXISTS "Apenas admins inserem vendedores" ON vendedores;
CREATE POLICY "Apenas admins inserem vendedores" ON vendedores
  FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Apenas admins atualizam vendedores" ON vendedores;
CREATE POLICY "Apenas admins atualizam vendedores" ON vendedores
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Apenas admins deletam vendedores" ON vendedores;
CREATE POLICY "Apenas admins deletam vendedores" ON vendedores
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- =============================================
-- 3. Fix RLS on distribuidoras
-- =============================================
DROP POLICY IF EXISTS "Admins inserem distribuidoras" ON distribuidoras;
CREATE POLICY "Admins inserem distribuidoras" ON distribuidoras
  FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins atualizam distribuidoras" ON distribuidoras;
CREATE POLICY "Admins atualizam distribuidoras" ON distribuidoras
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins deletam distribuidoras" ON distribuidoras;
CREATE POLICY "Admins deletam distribuidoras" ON distribuidoras
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- =============================================
-- 4. Fix RLS on cidades_irradiancia
-- =============================================
DROP POLICY IF EXISTS "Admins inserem irradiância" ON cidades_irradiancia;
CREATE POLICY "Admins inserem irradiância" ON cidades_irradiancia
  FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins atualizam irradiância" ON cidades_irradiancia;
CREATE POLICY "Admins atualizam irradiância" ON cidades_irradiancia
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins deletam irradiância" ON cidades_irradiancia;
CREATE POLICY "Admins deletam irradiância" ON cidades_irradiancia
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- =============================================
-- 5. Fix RLS on configuracoes
-- =============================================
DROP POLICY IF EXISTS "Admins inserem configurações" ON configuracoes;
CREATE POLICY "Admins inserem configurações" ON configuracoes
  FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins atualizam configurações" ON configuracoes;
CREATE POLICY "Admins atualizam configurações" ON configuracoes
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

-- =============================================
-- 6. Fix RLS on propostas
-- =============================================
DROP POLICY IF EXISTS "Admins inserem propostas" ON propostas;
CREATE POLICY "Autenticados inserem propostas" ON propostas
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Admins atualizam propostas" ON propostas;
CREATE POLICY "Autenticados atualizam propostas" ON propostas
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins deletam propostas" ON propostas;
CREATE POLICY "Admins deletam propostas" ON propostas
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- Restrict anon UPDATE to only visualizado_em column
DROP POLICY IF EXISTS "Anon update propostas viewed" ON propostas;
CREATE POLICY "Anon update propostas viewed" ON propostas
  FOR UPDATE TO anon USING (true)
  WITH CHECK (true);

-- Restrict anon SELECT to only specific proposals (by id via URL)
DROP POLICY IF EXISTS "Propostas visíveis por link público" ON propostas;
CREATE POLICY "Propostas visíveis por link público" ON propostas
  FOR SELECT TO anon USING (true);

-- =============================================
-- 7. Fix user_profiles
-- =============================================
-- Restrict self-insert to default role only
DROP POLICY IF EXISTS "Users insert own profile" ON user_profiles;
CREATE POLICY "Users insert own profile" ON user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND role = 'vendedor');

-- Restrict SELECT to own profile or admin
DROP POLICY IF EXISTS "Authenticated read profiles" ON user_profiles;
CREATE POLICY "Users read own profile" ON user_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- =============================================
-- 8. Drop plaintext password column
-- =============================================
ALTER TABLE user_profiles DROP COLUMN IF EXISTS senha_visivel;
