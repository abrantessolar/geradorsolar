// Central de Monitoramento TLS — recalcula a comparação de desempenho
// (mediana de kWh/kWp + desvio_pct + estado baixo_desempenho) pra TODO o
// `mon_diario`, usando a frota inteira (FoxESS + Solis juntas) como base
// de comparação, não mais por cidade (ver migração
// drizzle/migrations/0010_mon_recalcular_desvio_global.sql pra entender
// por que — grupo por cidade era pequeno/incompleto demais pra
// significar algo; pedido do usuário em 2026-10-17 foi comparar com
// todas as usinas, independente da cidade).
//
// Chamada MANUALMENTE (workflow_dispatch) uma vez agora, pra recalcular
// o histórico já gravado pelos dois backfills. Daqui pra frente, também
// deve ser chamada no fim de cada job diário que grava mon_diario
// (mon-backfill-diario-cron da FoxESS; a Solis ainda não tem um
// equivalente diário — ver nota no painel) pra manter a comparação
// atualizada com os dados mais recentes.
//
// Toda a conta é feita num só statement SQL (PERCENTILE_CONT, set-based)
// dentro da função `recalcular_desvio_global()` — sem loop em JS, sem
// chamada de API de marca nenhuma, então não tem limite de execução
// nem rate limit pra se preocupar aqui, diferente dos backfills.
//
// Autenticação: mesmo segredo compartilhado das outras funções
// privilegiadas (AGENTS.md: função privilegiada autentica quem chama).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-mon-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const MON_CRON_SECRET = Deno.env.get("MON_CRON_SECRET");

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function autorizado(req: Request): boolean {
  const segredo = req.headers.get("x-mon-cron-secret");
  return !!segredo && !!MON_CRON_SECRET && segredo === MON_CRON_SECRET;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (!autorizado(req)) {
    return json({ error: "x-mon-cron-secret ausente ou incorreto (mesmo segredo usado na coleta)" }, 401);
  }

  const { error } = await supabaseAdmin.rpc("recalcular_desvio_global");
  if (error) return json({ error: `Falha ao recalcular: ${error.message}` }, 500);

  return json({ ok: true });
});
