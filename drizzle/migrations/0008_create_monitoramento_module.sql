-- Central de Monitoramento TLS — Fase 1 (base)
-- Módulo ISOLADO: tabelas e políticas próprias, sem FK nem dependência do
-- fluxo de proposta ongrid (`projetos`). O único ponto de contato com o
-- resto do sistema é a FK opcional para `clientes_base`, usada só pra
-- vincular usina ↔ cliente.
--
-- Por ora não há interface de cliente — todas as tabelas ficam restritas à
-- equipe (mesmo padrão `has_panel_access(auth.uid())` usado em
-- `tarefas_posvenda`, `rastreamento_obras`, etc. — ver migração
-- 20260616230334). Quando a área do cliente for construída, entra uma
-- política de SELECT adicional restrita por `cliente_base_id = auth.uid()`
-- (ou equivalente), sem tocar nas políticas de staff abaixo.

-- ── mon_usinas ──────────────────────────────────────────────────────────
CREATE TABLE public.mon_usinas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marca text NOT NULL,
  id_externo text NOT NULL,
  sn_inversor text,
  modelo text,
  kwp numeric,
  cidade text,
  data_instalacao date,
  cliente_base_id uuid REFERENCES public.clientes_base(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  vinculo_confirmado boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (marca, id_externo)
);

CREATE INDEX mon_usinas_cliente_base_id_idx ON public.mon_usinas (cliente_base_id);
CREATE INDEX mon_usinas_sem_vinculo_idx ON public.mon_usinas (vinculo_confirmado) WHERE vinculo_confirmado = false;

CREATE TRIGGER update_mon_usinas_updated_at
  BEFORE UPDATE ON public.mon_usinas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── mon_leituras ────────────────────────────────────────────────────────
-- Snapshot de cada coleta (polling de 15–30min). Retenção: ver nota no
-- final do arquivo — por ora guarda tudo, a limpeza fica pra quando o
-- volume justificar.
CREATE TABLE public.mon_leituras (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usina_id uuid NOT NULL REFERENCES public.mon_usinas(id) ON DELETE CASCADE,
  coletado_em timestamptz NOT NULL DEFAULT now(),
  potencia_w numeric,
  energia_dia_kwh numeric,
  energia_total_kwh numeric,
  online boolean NOT NULL DEFAULT true,
  alarmes text[] NOT NULL DEFAULT '{}'
);

CREATE INDEX mon_leituras_usina_tempo_idx ON public.mon_leituras (usina_id, coletado_em DESC);

-- ── mon_diario ──────────────────────────────────────────────────────────
-- Agregado diário usado nas comparações (mediana por cidade / fallback HSP).
CREATE TABLE public.mon_diario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usina_id uuid NOT NULL REFERENCES public.mon_usinas(id) ON DELETE CASCADE,
  data date NOT NULL,
  kwh numeric,
  kwh_por_kwp numeric,
  mediana_cidade numeric,
  esperado_hsp numeric,
  desvio_pct numeric,
  estado text NOT NULL DEFAULT 'normal' CHECK (estado IN ('normal', 'baixo_desempenho', 'sem_geracao', 'offline')),
  UNIQUE (usina_id, data)
);

CREATE INDEX mon_diario_data_idx ON public.mon_diario (data);

-- ── mon_chamados ────────────────────────────────────────────────────────
-- Fila de contato (CRM do pós-venda) — reativa, separada da agenda de
-- lembretes de `tarefas_posvenda` (ritual de calendário, fluxo diferente).
-- No máximo um chamado aberto por usina: índice único parcial garante isso.
CREATE TABLE public.mon_chamados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usina_id uuid NOT NULL REFERENCES public.mon_usinas(id) ON DELETE CASCADE,
  cliente_base_id uuid REFERENCES public.clientes_base(id) ON DELETE SET NULL,
  tipo text NOT NULL CHECK (tipo IN ('offline', 'sem_geracao', 'baixo_desempenho', 'solicitado_cliente')),
  etapa text NOT NULL DEFAULT 'novo' CHECK (etapa IN ('novo', 'contato_feito', 'aguardando_cliente', 'visita_agendada', 'resolvido')),
  responsavel uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  aberto_em timestamptz NOT NULL DEFAULT now(),
  resolvido_em timestamptz,
  resolucao text CHECK (resolucao IN ('auto', 'manual')),
  prazo timestamptz
);

CREATE UNIQUE INDEX mon_chamados_um_aberto_por_usina_idx ON public.mon_chamados (usina_id) WHERE resolvido_em IS NULL;
CREATE INDEX mon_chamados_etapa_idx ON public.mon_chamados (etapa) WHERE resolvido_em IS NULL;

-- ── mon_chamado_eventos ─────────────────────────────────────────────────
CREATE TABLE public.mon_chamado_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id uuid NOT NULL REFERENCES public.mon_chamados(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('contato', 'mudanca_etapa', 'observacao', 'visita_agendada')),
  mensagem text,
  usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX mon_chamado_eventos_chamado_idx ON public.mon_chamado_eventos (chamado_id, criado_em);

-- ── mon_guias_reconexao ─────────────────────────────────────────────────
-- Passo a passo editável de reconfiguração de Wi-Fi por marca/modelo.
CREATE TABLE public.mon_guias_reconexao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marca text NOT NULL,
  modelo text,
  titulo text NOT NULL,
  conteudo text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX mon_guias_reconexao_marca_idx ON public.mon_guias_reconexao (marca, modelo);

CREATE TRIGGER update_mon_guias_reconexao_updated_at
  BEFORE UPDATE ON public.mon_guias_reconexao
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── RLS — tudo restrito à equipe, sem acesso anon/cliente nesta fase ─────
ALTER TABLE public.mon_usinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mon_leituras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mon_diario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mon_chamados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mon_chamado_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mon_guias_reconexao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipe gerencia mon_usinas" ON public.mon_usinas
  FOR ALL TO authenticated
  USING (public.has_panel_access(auth.uid()))
  WITH CHECK (public.has_panel_access(auth.uid()));

CREATE POLICY "Equipe gerencia mon_leituras" ON public.mon_leituras
  FOR ALL TO authenticated
  USING (public.has_panel_access(auth.uid()))
  WITH CHECK (public.has_panel_access(auth.uid()));

CREATE POLICY "Equipe gerencia mon_diario" ON public.mon_diario
  FOR ALL TO authenticated
  USING (public.has_panel_access(auth.uid()))
  WITH CHECK (public.has_panel_access(auth.uid()));

CREATE POLICY "Equipe gerencia mon_chamados" ON public.mon_chamados
  FOR ALL TO authenticated
  USING (public.has_panel_access(auth.uid()))
  WITH CHECK (public.has_panel_access(auth.uid()));

CREATE POLICY "Equipe gerencia mon_chamado_eventos" ON public.mon_chamado_eventos
  FOR ALL TO authenticated
  USING (public.has_panel_access(auth.uid()))
  WITH CHECK (public.has_panel_access(auth.uid()));

CREATE POLICY "Equipe gerencia mon_guias_reconexao" ON public.mon_guias_reconexao
  FOR ALL TO authenticated
  USING (public.has_panel_access(auth.uid()))
  WITH CHECK (public.has_panel_access(auth.uid()));

-- A service role (usada pela edge function de coleta) ignora RLS por
-- padrão no Supabase — não precisa de policy própria pra `anon`/`service_role`.

-- Nota de retenção (não implementada nesta fase): quando o volume de
-- mon_leituras justificar, agendar uma rotina (pg_cron) que apague linhas
-- de mon_leituras com mais de 90 dias, já que mon_diario guarda o
-- agregado permanentemente.
