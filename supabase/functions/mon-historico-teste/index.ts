// Função de TESTE, descartável — serve só pra descobrir até onde a
// FoxESS guarda histórico de geração antes de construir o backfill de
// verdade (Fase 3 da Central de Monitoramento). Depois de rodar e ler o
// resultado, pode apagar esta função.
//
// O que faz: pega o primeiro dispositivo ativo (via /op/v0/device/list)
// e tenta /op/v0/device/report/query (dimension="month", variável
// "generation") pra cada mês desde janeiro/2025 até o mês atual,
// respeitando o limite de 1 chamada/seg por endpoint da FoxESS. Devolve
// o resultado bruto de cada mês — onde a resposta virar vazia/erro é
// onde o histórico real da conta termina.
//
// Autenticação: mesmo segredo compartilhado da coleta (x-mon-cron-secret
// = MON_CRON_SECRET), porque usa a mesma FOXESS_API_KEY internamente —
// não precisa de credencial nova, mas ainda assim exige segredo (AGENTS.md:
// função privilegiada tem que autenticar quem chama).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { crypto as stdCrypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-mon-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FOXESS_API_TOKEN = Deno.env.get("FOXESS_API_KEY");
const MON_CRON_SECRET = Deno.env.get("MON_CRON_SECRET");
const FOXESS_BASE = "https://www.foxesscloud.com";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function foxessMd5(texto: string): Promise<string> {
  const buf = await stdCrypto.subtle.digest("MD5", new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function foxessHeaders(path: string): Promise<Record<string, string>> {
  const timestamp = Date.now().toString();
  const signature = await foxessMd5(`${path}\r\n${FOXESS_API_TOKEN}\r\n${timestamp}`);
  return { token: FOXESS_API_TOKEN!, timestamp, signature, lang: "en", "Content-Type": "application/json" };
}

async function foxessPost(path: string, body: unknown): Promise<{ errno?: number; msg?: string; result: unknown }> {
  const res = await fetch(FOXESS_BASE + path, {
    method: "POST",
    headers: await foxessHeaders(path),
    body: JSON.stringify(body),
  });
  const textoBruto = await res.text();
  let data: any;
  try {
    data = JSON.parse(textoBruto);
  } catch {
    throw new Error(
      `FoxESS ${path} retornou algo não-JSON (HTTP ${res.status} ${res.statusText}): ${textoBruto.slice(0, 300) || "(corpo vazio)"}`
    );
  }
  return { errno: data.errno, msg: data.msg, result: data.result ?? data };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const segredoRecebido = req.headers.get("x-mon-cron-secret");
  if (!MON_CRON_SECRET || !segredoRecebido || segredoRecebido !== MON_CRON_SECRET) {
    return json({ error: "x-mon-cron-secret ausente ou incorreto (mesmo segredo usado na coleta)" }, 401);
  }
  if (!FOXESS_API_TOKEN) {
    return json({ error: "FOXESS_API_KEY não configurado em Secrets" }, 500);
  }

  try {
    // 1) pega o SN de um dispositivo ativo pra usar nos testes.
    const lista = await foxessPost("/op/v0/device/list", { currentPage: 1, pageSize: 5 });
    const dispositivos = (lista.result as any)?.data ?? [];
    const primeiro = dispositivos[0];
    if (!primeiro) {
      return json({ error: "device/list não retornou nenhum dispositivo", lista });
    }
    const sn = primeiro.deviceSN;
    const stationName = primeiro.stationName;
    const stationID = primeiro.stationID;

    // 2) tenta relatório mensal de "generation" desde janeiro/2025 até o
    // mês atual — pra achar onde o histórico de verdade termina.
    const hoje = new Date();
    const meses: Array<{ ano: number; mes: number }> = [];
    for (let ano = 2025; ano <= hoje.getUTCFullYear(); ano++) {
      const mesFinal = ano === hoje.getUTCFullYear() ? hoje.getUTCMonth() + 1 : 12;
      for (let mes = 1; mes <= mesFinal; mes++) {
        meses.push({ ano, mes });
      }
    }

    const resultados: Array<Record<string, unknown>> = [];
    for (const { ano, mes } of meses) {
      try {
        const r = await foxessPost("/op/v0/device/report/query", {
          sn,
          year: ano,
          month: mes,
          dimension: "month",
          variables: ["generation"],
        });
        resultados.push({ ano, mes, errno: r.errno, msg: r.msg, result: r.result });
      } catch (e) {
        resultados.push({ ano, mes, erro: e instanceof Error ? e.message : String(e) });
      }
      // respeita o limite de 1 chamada/segundo por endpoint da FoxESS.
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }

    return json({ usina_testada: { sn, stationID, stationName }, resultados });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
