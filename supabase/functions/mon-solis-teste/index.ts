// Função de TESTE, descartável — serve só pra validar a autenticação
// HMAC-SHA1 da SolisCloud e confirmar como o endpoint de listagem de
// usinas (userStationList) se comporta na prática (paginação, total
// de plantas) antes de construir a integração de verdade (equivalente
// à Fase 1 que fizemos pra FoxESS). Depois de rodar e ler o resultado,
// pode apagar esta função.
//
// Autenticação da SolisCloud (bem diferente da FoxESS): cada request
// precisa de um header Authorization = "API " + KeyId + ":" + Sign,
// onde Sign é um HMAC-SHA1 (base64) calculado sobre:
//   VERBO + "\n" + Content-MD5 + "\n" + Content-Type + "\n" + Date + "\n" + Recurso
// usando o KeySecret como chave. Content-MD5 é o hash MD5 (base64) do
// corpo da requisição. Date tem que estar em GMT e próximo do horário
// real (a Solis rejeita com HTTP 408 se o relógio divergir > 15min).
//
// Autenticação desta função: mesmo segredo compartilhado das outras
// (x-mon-cron-secret = MON_CRON_SECRET), igual ao padrão já usado em
// mon-coleta/mon-historico-teste/mon-backfill-diario (AGENTS.md: função
// privilegiada tem que autenticar quem chama).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { crypto as stdCrypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-mon-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SOLIS_API_URL = Deno.env.get("SOLIS_API_URL"); // ex: https://www.soliscloud.com:13333
const SOLIS_KEY_ID = Deno.env.get("SOLIS_KEY_ID");
const SOLIS_KEY_SECRET = Deno.env.get("SOLIS_KEY_SECRET");
const MON_CRON_SECRET = Deno.env.get("MON_CRON_SECRET");

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function autorizado(req: Request): boolean {
  return req.headers.get("x-mon-cron-secret") === MON_CRON_SECRET;
}

function paraBase64(buf: ArrayBuffer): string {
  return btoa(Array.from(new Uint8Array(buf)).map((b) => String.fromCharCode(b)).join(""));
}

async function md5Base64(texto: string): Promise<string> {
  const buf = await stdCrypto.subtle.digest("MD5", new TextEncoder().encode(texto));
  return paraBase64(buf);
}

async function hmacSha1Base64(chave: string, texto: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(chave),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const assinatura = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(texto));
  return paraBase64(assinatura);
}

// Chama um endpoint da SolisCloud assinado com HMAC-SHA1, conforme o
// "SolisCloud Platform API Document" (single account permission).
async function solisPost(caminho: string, corpo: unknown): Promise<{ status: number; corpoResposta: string }> {
  const corpoTexto = JSON.stringify(corpo);
  const contentMd5 = await md5Base64(corpoTexto);
  const contentType = "application/json";
  const data = new Date().toUTCString(); // ex: "Fri, 17 Oct 2026 16:43:00 GMT"
  const paraAssinar = `POST\n${contentMd5}\n${contentType}\n${data}\n${caminho}`;
  const assinatura = await hmacSha1Base64(SOLIS_KEY_SECRET!, paraAssinar);
  const authorization = `API ${SOLIS_KEY_ID}:${assinatura}`;

  const res = await fetch(SOLIS_API_URL + caminho, {
    method: "POST",
    headers: {
      "Content-MD5": contentMd5,
      "Content-Type": contentType,
      Date: data,
      Authorization: authorization,
    },
    body: corpoTexto,
  });
  const corpoResposta = await res.text();
  return { status: res.status, corpoResposta };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (!autorizado(req)) {
    return json({ error: "x-mon-cron-secret ausente ou incorreto" }, 401);
  }
  if (!SOLIS_API_URL || !SOLIS_KEY_ID || !SOLIS_KEY_SECRET) {
    return json(
      { error: "SOLIS_API_URL, SOLIS_KEY_ID ou SOLIS_KEY_SECRET não configurados em Secrets" },
      500,
    );
  }

  try {
    // Página pequena só pra testar auth + ver o campo de total — não
    // precisa buscar as 292 de uma vez só pra validar que funciona.
    const listaUsinas = await solisPost("/v1/api/userStationList", { pageNo: 1, pageSize: 10 });

    let listaUsinasJson: unknown = null;
    try {
      listaUsinasJson = JSON.parse(listaUsinas.corpoResposta);
    } catch {
      // mantém corpoResposta bruto se não for JSON válido
    }

    return json({
      userStationList: {
        http_status: listaUsinas.status,
        corpo_bruto: listaUsinas.corpoResposta,
        corpo_json: listaUsinasJson,
      },
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
