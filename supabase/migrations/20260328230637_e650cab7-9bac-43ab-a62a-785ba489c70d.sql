
-- Add numero_proposta column to propostas
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS numero_proposta text UNIQUE;

-- Create sequence function for proposal numbers
CREATE OR REPLACE FUNCTION public.generate_numero_proposta()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(
    CAST(REPLACE(numero_proposta, 'TLS-', '') AS integer)
  ), 0) + 1
  INTO next_num
  FROM public.propostas
  WHERE numero_proposta IS NOT NULL AND numero_proposta LIKE 'TLS-%';
  
  NEW.numero_proposta := 'TLS-' || LPAD(next_num::text, 4, '0');
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS set_numero_proposta ON public.propostas;
CREATE TRIGGER set_numero_proposta
  BEFORE INSERT ON public.propostas
  FOR EACH ROW
  WHEN (NEW.numero_proposta IS NULL)
  EXECUTE FUNCTION public.generate_numero_proposta();

-- Create fotos_portfolio table
CREATE TABLE IF NOT EXISTS public.fotos_portfolio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  descricao text,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fotos_portfolio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fotos visíveis para todos" ON public.fotos_portfolio FOR SELECT TO public USING (true);
CREATE POLICY "Admins inserem fotos" ON public.fotos_portfolio FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins atualizam fotos" ON public.fotos_portfolio FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins deletam fotos" ON public.fotos_portfolio FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- Create logos_parceiros table
CREATE TABLE IF NOT EXISTS public.logos_parceiros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  nome text NOT NULL,
  url_site text,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.logos_parceiros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Logos visíveis para todos" ON public.logos_parceiros FOR SELECT TO public USING (true);
CREATE POLICY "Admins inserem logos" ON public.logos_parceiros FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins atualizam logos" ON public.logos_parceiros FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins deletam logos" ON public.logos_parceiros FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- Create storage bucket for site content
INSERT INTO storage.buckets (id, name, public) VALUES ('site-content', 'site-content', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Public read site-content" ON storage.objects FOR SELECT TO public USING (bucket_id = 'site-content');
CREATE POLICY "Admins upload site-content" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'site-content' AND public.is_admin(auth.uid()));
CREATE POLICY "Admins delete site-content" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'site-content' AND public.is_admin(auth.uid()));
