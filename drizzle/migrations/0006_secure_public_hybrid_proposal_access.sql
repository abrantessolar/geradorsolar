DROP POLICY IF EXISTS "Proposta hibrida acessível por código" ON public.propostas_hibridas;

CREATE OR REPLACE FUNCTION public.get_proposta_hibrida_public(_codigo text)
RETURNS SETOF public.propostas_hibridas
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.*
  FROM public.propostas_hibridas p
  WHERE p.codigo_acesso = _codigo
    AND length(_codigo) >= 10
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_proposta_hibrida_public(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_proposta_hibrida_public(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.marcar_proposta_hibrida_visualizada(_codigo text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _codigo IS NULL OR length(_codigo) < 10 THEN
    RAISE EXCEPTION 'Código inválido';
  END IF;
  UPDATE public.propostas_hibridas
     SET visualizado_em = COALESCE(visualizado_em, now()),
         status = CASE WHEN status = 'enviada' THEN 'visualizada' ELSE status END
   WHERE codigo_acesso = _codigo;
END;
$$;
REVOKE ALL ON FUNCTION public.marcar_proposta_hibrida_visualizada(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.marcar_proposta_hibrida_visualizada(text) TO anon, authenticated;