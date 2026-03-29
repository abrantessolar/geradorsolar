
CREATE TABLE public.equipamentos_calculadora (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  categoria text NOT NULL,
  potencia_kw numeric NOT NULL,
  tipo_medicao text NOT NULL DEFAULT 'hora',
  dias_mes_padrao integer NOT NULL DEFAULT 30,
  horas_dia_padrao numeric,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamp with time zone NOT NULL DEFAULT now(),
  atualizado_em timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.equipamentos_calculadora ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipamentos visíveis para todos" ON public.equipamentos_calculadora FOR SELECT TO public USING (true);
CREATE POLICY "Admins inserem equipamentos" ON public.equipamentos_calculadora FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins atualizam equipamentos" ON public.equipamentos_calculadora FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins deletam equipamentos" ON public.equipamentos_calculadora FOR DELETE TO authenticated USING (is_admin(auth.uid()));

INSERT INTO public.equipamentos_calculadora (nome, categoria, potencia_kw, tipo_medicao, dias_mes_padrao, horas_dia_padrao) VALUES
('Ar 9.000 BTU Inverter', 'Ar-condicionado', 0.86, 'hora', 30, 8),
('Ar 9.000 BTU Tradicional', 'Ar-condicionado', 1.05, 'hora', 30, 8),
('Ar 12.000 BTU Inverter', 'Ar-condicionado', 1.10, 'hora', 30, 8),
('Ar 12.000 BTU Tradicional', 'Ar-condicionado', 1.35, 'hora', 30, 8),
('Ar 18.000 BTU Inverter', 'Ar-condicionado', 1.60, 'hora', 30, 8),
('Ar 18.000 BTU Tradicional', 'Ar-condicionado', 2.05, 'hora', 30, 8),
('Ar 24.000 BTU Inverter', 'Ar-condicionado', 2.00, 'hora', 30, 8),
('Ar 24.000 BTU Tradicional', 'Ar-condicionado', 2.80, 'hora', 30, 8),
('Ar 30.000 BTU Inverter', 'Ar-condicionado', 2.80, 'hora', 30, 8),
('Ar 30.000 BTU Tradicional', 'Ar-condicionado', 3.80, 'hora', 30, 8),
('Ar 36.000 BTU Inverter', 'Ar-condicionado', 3.30, 'hora', 30, 8),
('Ar 36.000 BTU Tradicional', 'Ar-condicionado', 4.40, 'hora', 30, 8),
('Ar 48.000 BTU Inverter', 'Ar-condicionado', 4.20, 'hora', 30, 8),
('Ar 48.000 BTU Tradicional', 'Ar-condicionado', 5.80, 'hora', 30, 8),
('Ar 60.000 BTU Inverter', 'Ar-condicionado', 5.20, 'hora', 30, 8),
('Ar 60.000 BTU Tradicional', 'Ar-condicionado', 7.20, 'hora', 30, 8),
('Air Fryer', 'Cozinha', 1.50, 'hora', 25, 0.5),
('Forno de embutir elétrico', 'Cozinha', 2.50, 'hora', 20, 1),
('Fogão de indução', 'Cozinha', 3.50, 'hora', 25, 1.5),
('Geladeira pequena 1 porta', 'Refrigeração', 0.10, 'hora', 30, 24),
('Geladeira grande 2 portas', 'Refrigeração', 0.17, 'hora', 30, 24),
('Freezer horizontal 1 porta', 'Refrigeração', 0.12, 'hora', 30, 24),
('Freezer horizontal 2 portas', 'Refrigeração', 0.20, 'hora', 30, 24),
('Cervejeira', 'Refrigeração', 0.09, 'hora', 30, 24),
('Adega climatizada', 'Refrigeração', 0.11, 'hora', 30, 24),
('Secadora de roupas', 'Lavanderia', 3.00, 'hora', 15, 1),
('Lava e Seca', 'Lavanderia', 2.50, 'hora', 15, 1),
('Bomba de piscina 1/4 CV', 'Piscina', 0.18, 'hora', 30, 1),
('Bomba de piscina 1/3 CV', 'Piscina', 0.25, 'hora', 30, 1),
('Bomba de piscina 1/2 CV', 'Piscina', 0.37, 'hora', 30, 1),
('Bomba de piscina 3/4 CV', 'Piscina', 0.55, 'hora', 30, 1),
('Aquecedor de piscina 15.000L', 'Piscina', 6.00, 'hora', 20, 4),
('Aquecedor de piscina 25.000L', 'Piscina', 9.00, 'hora', 20, 4),
('Veículo elétrico', 'Veículo Elétrico', 0.20, 'km', 30, NULL);
