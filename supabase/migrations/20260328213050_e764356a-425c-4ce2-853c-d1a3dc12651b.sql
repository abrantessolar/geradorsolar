
-- Restrict anon UPDATE on propostas to only allow setting visualizado_em
-- Create a trigger function that prevents anon from changing other columns
CREATE OR REPLACE FUNCTION restrict_anon_proposal_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow visualizado_em to be changed by anon
  IF NEW.cliente IS DISTINCT FROM OLD.cliente
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.valor_total IS DISTINCT FROM OLD.valor_total
     OR NEW.vendedor_id IS DISTINCT FROM OLD.vendedor_id
     OR NEW.cidade IS DISTINCT FROM OLD.cidade
     OR NEW.uf IS DISTINCT FROM OLD.uf
     OR NEW.consumo_mensal IS DISTINCT FROM OLD.consumo_mensal
     OR NEW.linha IS DISTINCT FROM OLD.linha
     OR NEW.num_placas IS DISTINCT FROM OLD.num_placas
     OR NEW.potencia_kwp IS DISTINCT FROM OLD.potencia_kwp
     OR NEW.cet IS DISTINCT FROM OLD.cet
     OR NEW.dados_completos IS DISTINCT FROM OLD.dados_completos
     OR NEW.criador_user_id IS DISTINCT FROM OLD.criador_user_id
  THEN
    RAISE EXCEPTION 'Anon users can only update visualizado_em';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS restrict_anon_update ON propostas;
CREATE TRIGGER restrict_anon_update
  BEFORE UPDATE ON propostas
  FOR EACH ROW
  WHEN (current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'anon')
  EXECUTE FUNCTION restrict_anon_proposal_update();

-- Also restrict propostas INSERT to authenticated users who are logged in
DROP POLICY IF EXISTS "Autenticados inserem propostas" ON propostas;
CREATE POLICY "Autenticados inserem propostas" ON propostas
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = criador_user_id);

-- Restrict propostas UPDATE for authenticated to own proposals or admin
DROP POLICY IF EXISTS "Autenticados atualizam propostas" ON propostas;
CREATE POLICY "Autenticados atualizam propostas" ON propostas
  FOR UPDATE TO authenticated USING (auth.uid() = criador_user_id OR is_admin(auth.uid()));
