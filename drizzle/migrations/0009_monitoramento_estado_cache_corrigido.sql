-- Central de Monitoramento TLS — Fase 2: cache de estado por usina.
--
-- O painel de saúde da frota (semáforo normal/sem_geracao/offline) não
-- pode recalcular o estado de cada usina no navegador toda vez que a
-- tela abre — isso ficaria lento com a frota crescendo e duplicaria a
-- lógica de decisão em dois lugares. Em vez disso, a edge function
-- `mon-coleta` escreve o estado já calculado aqui a cada ciclo de
-- coleta, e o front só lê.

ALTER TABLE public.mon_usinas
  ADD COLUMN estado_atual text NOT NULL DEFAULT 'normal'
    CHECK (estado_atual IN ('normal', 'sem_geracao', 'baixo_desempenho', 'offline')),
  ADD COLUMN estado_atualizado_em timestamptz;

CREATE INDEX mon_usinas_estado_idx ON public.mon_usinas (estado_atual) WHERE estado_atual <> 'normal';

-- Mesmo padrão de GRANT das demais tabelas mon_* (RLS por si só não
-- libera nada sem o GRANT de nível de tabela).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mon_usinas TO authenticated;
GRANT ALL ON public.mon_usinas TO service_role;
