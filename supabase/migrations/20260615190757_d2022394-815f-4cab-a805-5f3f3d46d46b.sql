-- 1) Dia de leitura na base de clientes
ALTER TABLE public.clientes_base ADD COLUMN IF NOT EXISTS dia_leitura integer;

-- 2) Permitir que tarefas de pós-venda apontem para clientes_base (migração de instalados)
ALTER TABLE public.tarefas_posvenda ALTER COLUMN projeto_id DROP NOT NULL;

ALTER TABLE public.tarefas_posvenda
  ADD COLUMN IF NOT EXISTS cliente_base_id uuid REFERENCES public.clientes_base(id) ON DELETE CASCADE;

ALTER TABLE public.tarefas_posvenda
  ADD CONSTRAINT tarefas_posvenda_owner_chk CHECK (
    (projeto_id IS NOT NULL AND cliente_base_id IS NULL)
    OR (projeto_id IS NULL AND cliente_base_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_tarefas_posvenda_cliente_base
  ON public.tarefas_posvenda(cliente_base_id);