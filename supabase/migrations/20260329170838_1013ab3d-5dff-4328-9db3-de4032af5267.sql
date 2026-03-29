
-- Create leads table
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  telefone text NOT NULL,
  cidade text NOT NULL,
  uf text NOT NULL DEFAULT 'MS',
  consumo_kwh numeric NOT NULL,
  resultado_placas integer NOT NULL,
  resultado_potencia_kwp numeric NOT NULL,
  status text NOT NULL DEFAULT 'novo',
  observacoes text,
  atribuido_para uuid,
  criado_em timestamp with time zone NOT NULL DEFAULT now(),
  atualizado_em timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Public can insert leads (from simulator)
CREATE POLICY "Anon insere leads" ON public.leads FOR INSERT TO anon WITH CHECK (true);

-- Authenticated users can read all leads
CREATE POLICY "Autenticados leem leads" ON public.leads FOR SELECT TO authenticated USING (true);

-- Authenticated users can update leads
CREATE POLICY "Autenticados atualizam leads" ON public.leads FOR UPDATE TO authenticated USING (true);

-- Admins can delete leads
CREATE POLICY "Admins deletam leads" ON public.leads FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- Authenticated can insert leads too
CREATE POLICY "Autenticados inserem leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (true);

-- Enable realtime for leads
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;

-- Trigger for atualizado_em
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
