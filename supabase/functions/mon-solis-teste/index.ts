// Função de TESTE, descartável — serve só pra validar a autenticação
// HMAC-SHA1 da SolisCloud e confirmar como os endpoints em LOTE se
// comportam na prática (paginação, se trazem dado por usina ou só
// agregado da conta) antes de construir a coleta de verdade pra Solis
// (equivalente à Fase 1 que fizemos pra FoxESS). Depois de rodar e ler
// o resultado, pode apagar esta função.
//
// Testa três endpoints:
// 1. userStationList — lista de usinas (já confirmado funcionando).
// 2. inverterList — lista de inversores com detalhe (potência, energia
//    hoje, status) em lote, pra ver se dá pra montar a coleta em tempo
//    real sem 1 chamada por usina.
// 3. stationMonth (NÃO stationMonthEnergyList) de UMA usina real (id
//    obtido do resultado do passo 1). Descoberto lendo o código-fonte da
//    lib Python hultenvp/soliscloud_api (cliente de referência da
//    comunidade): são dois endpoints diferentes, fáceis de confundir pelo
//    nome —
//      - stationMonthEnergyList: SÓ em lote, sem parâmetro de usina.
//        Parâmetros: {pageNo, pageSize, time: "yyyy-MM"} — o nome do
//        campo de mês é "time", não "month"! Devolve 1 linha por usina
//        com o total do mês (sem detalhe diário).
//      - stationMonth: é o endpoint POR USINA com detalhe diário.
//        Parâmetros: {money: "<moeda ISO, ex. BRL>", month: "yyyy-MM",
//        id: <stationId>} (ou nmiCode no lugar de id, só pra Austrália).
//    Os dois testes anteriores falhavam com "necessary parameters are
//    empty or invalid" porque misturavam os parâmetros dos dois
//    endpoints (id+month em stationMonthEnergyList, que não aceita id;
//    e faltava o "money", obrigatório em stationMonth). Este teste usa
//    stationMonth com os três parâmetros corretos, pra confirmar o
//    formato da resposta (nomes dos campos diários) antes do backfill.
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
//
// CONFIRMADO EM PRODUÇÃO (2026-10-17): Content-Type tem que ser
// exatamente "application/json" (sem ";charset=UTF-8") tanto no header
// quanto no texto assinado — com charset a Solis responde 403 "wrong
// sign". userStationList respondeu 200 com as 292 usinas da conta
// (264 normais, 28 offline, 0 em falha), confirmando a assinatura
// HMAC-SHA1 e o total esperado.

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

  function tentarJson(texto: string): unknown {
    try {
      return JSON.parse(texto);
    } catch {
      return null;
    }
  }

  try {
    // 1. Página pequena só pra testar auth + ver o campo de total — não
    // precisa buscar as 292 de uma vez só pra validar que funciona.
    const listaUsinas = await solisPost("/v1/api/userStationList", { pageNo: 1, pageSize: 10 });

    // Respeitar o rate limit (3 chamadas / 5s) entre os testes.
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 2. Lista de inversores em lote — ver se trae potência/energia/status
    // por inversor sem precisar de 1 chamada por usina.
    const listaInversores = await solisPost("/v1/api/inverterList", { pageNo: 1, pageSize: 10 });

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 3. Histórico mensal de UMA usina real (id tirado do resultado do
    // passo 1), mês anterior ao atual, formato "yyyy-MM".
    const usinasJson = tentarJson(listaUsinas.corpoResposta) as any;
    const primeiraUsinaId: string | null = usinasJson?.data?.page?.records?.[0]?.id ?? null;

    const agora = new Date();
    const mesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
    const mesTeste = `${mesAnterior.getFullYear()}-${String(mesAnterior.getMonth() + 1).padStart(2, "0")}`;

    let historicoMensal: { status: number; corpoResposta: string } | null = null;
    if (primeiraUsinaId) {
      // stationMonth (não stationMonthEnergyList): endpoint por usina,
      // com detalhe diário. "money" é obrigatório (moeda ISO) mesmo não
      // sendo usado pra nada aqui além de satisfazer a validação da API.
      historicoMensal = await solisPost("/v1/api/stationMonth", {
        money: "BRL",
        month: mesTeste,
        id: primeiraUsinaId,
      });
    }

    return json({
      userStationList: {
        http_status: listaUsinas.status,
        corpo_bruto: listaUsinas.corpoResposta,
        corpo_json: tentarJson(listaUsinas.corpoResposta),
      },
      inverterList: {
        http_status: listaInversores.status,
        corpo_bruto: listaInversores.corpoResposta,
        corpo_json: tentarJson(listaInversores.corpoResposta),
      },
      stationMonth: {
        usina_id_testada: primeiraUsinaId,
        mes_testado: mesTeste,
        http_status: historicoMensal?.status ?? null,
        corpo_bruto: historicoMensal?.corpoResposta ?? "(pulado: não achou id de usina no passo 1)",
        corpo_json: historicoMensal ? tentarJson(historicoMensal.corpoResposta) : null,
      },
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
