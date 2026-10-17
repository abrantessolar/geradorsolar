// Central de Monitoramento TLS — backfill de histórico diário da Solis.
//
// Equivalente ao mon-backfill-diario (FoxESS), mas com uma diferença
// estrutural importante: a FoxESS processa TODAS as usinas de um mês em
// uma única chamada da função (cabe no tempo de execução). A Solis não
// cabe: o endpoint de histórico por usina (`stationMonth`, ver
// mon-solis-teste) só existe no modo 1-usina-por-chamada, e com 292
// usinas respeitando o limite de 3 chamadas/5s da Solis (~1,7s de pausa
// entre chamadas), processar as 292 de um mês levaria ~500s — bem acima
// do limite de ~150s de uma função do Supabase.
//
// Por isso esta função é PAGINADA: cada chamada processa um mês inteiro,
// mas só uma PÁGINA de usinas (padrão: 30 por página, ~55s de pausas
// respeitando o rate limit — reduzido de 50 em 2026-10-17 depois de um
// 504 real em produção na página 3: com 50 usinas, a soma de pausas +
// latência da API + gravação em lote ficou perto demais do limite de
// execução da função, e num dia de latência um pouco mais alta passou
// do limite, sem a função nem conseguir responder o próprio erro — o
// gateway já cortava a chamada antes). O workflow
// (.github/workflows/mon-backfill-solis.yml)
// itera sobre os meses e, dentro de cada mês, sobre as páginas, usando o
// `total_paginas` devolvido na resposta pra saber quando passar pro
// próximo mês. Isso também faz o backfill ser retomável: se uma página
// falhar, só precisa rodar aquela página de novo (upsert é idempotente).
//
// Limitação conhecida (aceita por ora): como cada chamada só vê uma
// página de usinas, não calculamos `mediana_cidade`/`desvio_pct` aqui
// (precisaria ver TODAS as usinas da cidade no mesmo dia pra ter uma
// mediana correta, o que a FoxESS faz processando tudo de uma vez). Os
// registros da Solis em `mon_diario` ficam só com `kwh`/`kwh_por_kwp` e
// `estado` (normal/sem_geracao); mediana/desvio ficam null. Se quiser
// isso pra Solis também, precisa de um passo extra depois do backfill
// completo, recalculando por cidade com os dois conjuntos de dados
// (FoxESS + Solis) juntos.
//
// Autenticação: mesmo segredo compartilhado das outras funções
// privilegiadas (x-mon-cron-secret = MON_CRON_SECRET) — AGENTS.md:
// função privilegiada autentica quem chama antes de usar o service role.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { crypto as stdCrypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-mon-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const SOLIS_API_URL = Deno.env.get("SOLIS_API_URL");
const SOLIS_KEY_ID = Deno.env.get("SOLIS_KEY_ID");
const SOLIS_KEY_SECRET = Deno.env.get("SOLIS_KEY_SECRET");
const MON_CRON_SECRET = Deno.env.get("MON_CRON_SECRET");

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function autorizado(req: Request): boolean {
  const segredo = req.headers.get("x-mon-cron-secret");
  return !!segredo && !!MON_CRON_SECRET && segredo === MON_CRON_SECRET;
}

async function solisMd5Base64(texto: string): Promise<string> {
  const buf = await stdCrypto.subtle.digest("MD5", new TextEncoder().encode(texto));
  return btoa(Array.from(new Uint8Array(buf)).map((b) => String.fromCharCode(b)).join(""));
}

async function solisHmacSha1Base64(chave: string, texto: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(chave),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const assinatura = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(texto));
  return btoa(Array.from(new Uint8Array(assinatura)).map((b) => String.fromCharCode(b)).join(""));
}

// Mesma assinatura HMAC-SHA1 usada em mon-coleta/mon-solis-teste.
// Content-Type precisa ser exatamente "application/json" (sem charset) —
// confirmado em produção (2026-10-17).
async function solisPost(caminho: string, corpo: unknown): Promise<any> {
  const corpoTexto = JSON.stringify(corpo);
  const contentMd5 = await solisMd5Base64(corpoTexto);
  const contentType = "application/json";
  const data = new Date().toUTCString();
  const paraAssinar = `POST\n${contentMd5}\n${contentType}\n${data}\n${caminho}`;
  const assinatura = await solisHmacSha1Base64(SOLIS_KEY_SECRET!, paraAssinar);
  const authorization = `API ${SOLIS_KEY_ID}:${assinatura}`;

  const res = await fetch(SOLIS_API_URL + caminho, {
    method: "POST",
    headers: { "Content-MD5": contentMd5, "Content-Type": contentType, Date: data, Authorization: authorization },
    body: corpoTexto,
  });
  const textoBruto = await res.text();
  let dados: any;
  try {
    dados = JSON.parse(textoBruto);
  } catch {
    throw new Error(`Solis ${caminho} retornou algo não-JSON (HTTP ${res.status}): ${textoBruto.slice(0, 300) || "(corpo vazio)"}`);
  }
  if (dados.success !== true) {
    throw new Error(`Solis ${caminho} code=${dados.code} ${dados.msg ?? ""}`);
  }
  return dados.data;
}

const SOLIS_PAUSA_MS = 1700; // ~3 chamadas/5s = 1 chamada a cada ~1,67s
const TAMANHO_PAGINA_PADRAO = 30; // 30 * 1,7s ≈ 51s de pausas, com folga maior pro limite de ~150s da função

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!autorizado(req)) {
    return json({ error: "x-mon-cron-secret ausente ou incorreto (mesmo segredo usado na coleta)" }, 401);
  }
  if (!SOLIS_API_URL || !SOLIS_KEY_ID || !SOLIS_KEY_SECRET) {
    return json({ error: "SOLIS_API_URL, SOLIS_KEY_ID ou SOLIS_KEY_SECRET não configurados em Secrets" }, 500);
  }

  let ano: number, mes: number, pagina: number, tamanhoPagina: number;
  try {
    const body = await req.json();
    ano = Number(body.ano);
    mes = Number(body.mes);
    pagina = body.pagina != null ? Number(body.pagina) : 0;
    tamanhoPagina = body.tamanho_pagina != null ? Number(body.tamanho_pagina) : TAMANHO_PAGINA_PADRAO;
    if (!ano || !mes || mes < 1 || mes > 12 || pagina < 0 || tamanhoPagina < 1) throw new Error("parâmetros inválidos");
  } catch {
    return json({ error: "corpo precisa ser { ano: number, mes: number, pagina?: number, tamanho_pagina?: number }" }, 400);
  }

  // Usinas Solis ativas, em ordem estável (por id_externo) pra paginação
  // consistente entre chamadas.
  const { data: todasUsinas, error: erroUsinas } = await supabaseAdmin
    .from("mon_usinas")
    .select("id, id_externo, kwp")
    .eq("ativo", true)
    .eq("marca", "solis")
    .order("id_externo", { ascending: true });
  if (erroUsinas) return json({ error: `Falha ao listar usinas: ${erroUsinas.message}` }, 500);

  const totalUsinas = todasUsinas?.length ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(totalUsinas / tamanhoPagina));
  const inicio = pagina * tamanhoPagina;
  const usinasDaPagina = (todasUsinas ?? []).slice(inicio, inicio + tamanhoPagina) as Array<{
    id: string;
    id_externo: string;
    kwp: number | null;
  }>;

  if (usinasDaPagina.length === 0) {
    return json({
      usinas_processadas: 0,
      dias_gravados: 0,
      erros: [],
      pagina,
      total_paginas: totalPaginas,
      total_usinas: totalUsinas,
      proxima_pagina: null,
    });
  }

  const mesTexto = `${ano}-${String(mes).padStart(2, "0")}`;
  const erros: string[] = [];
  const linhas: Array<{ usina_id: string; data: string; kwh: number; kwh_por_kwp: number | null; estado: "normal" | "sem_geracao" }> = [];

  for (const usina of usinasDaPagina) {
    try {
      const dados = await solisPost("/v1/api/stationMonth", {
        money: "BRL",
        month: mesTexto,
        id: usina.id_externo,
      });
      const registros: Array<{ dateStr: string; energy: number }> = Array.isArray(dados) ? dados : [];
      for (const r of registros) {
        if (!r?.dateStr) continue;
        const kwh = Number(r.energy) || 0;
        linhas.push({
          usina_id: usina.id,
          data: r.dateStr,
          kwh,
          kwh_por_kwp: usina.kwp ? kwh / usina.kwp : null,
          estado: kwh === 0 ? "sem_geracao" : "normal",
        });
      }
    } catch (e) {
      erros.push(`Usina ${usina.id} (stationId ${usina.id_externo}), ${mesTexto}: ${e instanceof Error ? e.message : e}`);
    }
    await new Promise((resolve) => setTimeout(resolve, SOLIS_PAUSA_MS));
  }

  let diasGravados = 0;
  if (linhas.length > 0) {
    const { error: erroUpsert } = await supabaseAdmin.from("mon_diario").upsert(linhas, { onConflict: "usina_id,data" });
    if (erroUpsert) erros.push(`Falha ao gravar mon_diario: ${erroUpsert.message}`);
    else diasGravados = linhas.length;
  }

  return json({
    usinas_processadas: usinasDaPagina.length,
    dias_gravados: diasGravados,
    erros,
    pagina,
    total_paginas: totalPaginas,
    total_usinas: totalUsinas,
    proxima_pagina: pagina + 1 < totalPaginas ? pagina + 1 : null,
  });
});
