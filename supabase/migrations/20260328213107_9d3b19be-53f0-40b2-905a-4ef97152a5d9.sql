
-- Fix function search path
CREATE OR REPLACE FUNCTION restrict_anon_proposal_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

-- Fix anon update policy to use WITH CHECK
DROP POLICY IF EXISTS "Anon update propostas viewed" ON propostas;
CREATE POLICY "Anon update propostas viewed" ON propostas
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);
