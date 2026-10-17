// Central de Monitoramento TLS — backfill de histórico diário (Fase 3).
//
// Diferente da `mon-coleta` (tempo real, a cada ~20min), esta função roda
// MANUALMENTE, uma vez por mês de histórico, disparada por
// `.github/workflows/mon-backfill-diario.yml`. Processa TODAS as usinas
// de uma vez pra um único mês (year/month), em vez de uma usina por vez,
// porque assim o workflow só precisa de uma chamada por mês (rápido de
// orquestrar) e ainda cabe dentro do tempo de execução de uma função —
// com ~26 usinas / ~34 inversores, um mês inteiro leva ~40s respeitando
// o limite de 1 chamada/seg da FoxESS.
//
// Usa `/op/v0/device/report/query` (dimension="month", variável
// "generation"), que devolve um valor de kWh por dia do mês — exatamente
// o formato de `mon_diario` (uma linha por usina por dia). Também
// calcula, no mesmo passe em memória, a mediana de kWh/kWp da cidade
// pra cada dia e grava `mediana_cidade`/`desvio_pct` junto — pedido do
// usuário: comparar cada usina com a mediana da cidade, normalizado por
// tamanho do sistema (kWp), não só kWh bruto.
//
// Importante (AGENTS.md): função privilegiada usa service role —
// autentica quem chama antes de fazer qualquer escrita.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { crypto as stdCrypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-mon-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const FOXESS_API_TOKEN = Deno.env.get("FOXESS_API_KEY");
const MON_CRON_SECRET = Deno.env.get("MON_CRON_SECRET");
const FOXESS_BASE = "https://www.foxesscloud.com";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function autorizado(req: Request): boolean {
  const segredo = req.headers.get("x-mon-cron-secret");
  return !!segredo && !!MON_CRON_SECRET && segredo === MON_CRON_SECRET;
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

async function foxessPost(path: string, body: unknown): Promise<{ errno?: number; msg?: string; result: any }> {
  const res = await fetch(FOXESS_BASE + path, { method: "POST", headers: await foxessHeaders(path), body: JSON.stringify(body) });
  const textoBruto = await res.text();
  let data: any;
  try {
    data = JSON.parse(textoBruto);
  } catch {
    throw new Error(`FoxESS ${path} retornou não-JSON (HTTP ${res.status}): ${textoBruto.slice(0, 300) || "(vazio)"}`);
  }
  if (data.errno && data.errno !== 0) throw new Error(`FoxESS ${path} errno=${data.errno} ${data.msg ?? ""}`);
  return { errno: data.errno, msg: data.msg, result: data.result ?? data };
}

const PAUSA_ENTRE_CHAMADAS_MS = 1100; // FoxESS limita a 1 chamada/segundo por endpoint

function mediana(valores: number[]): number | null {
  if (valores.length === 0) return null;
  const ordenado = [...valores].sort((a, b) => a - b);
  return ordenado[Math.floor(ordenado.length / 2)];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!autorizado(req)) {
    return json({ error: "x-mon-cron-secret ausente ou incorreto (mesmo segredo usado na coleta)" }, 401);
  }
  if (!FOXESS_API_TOKEN) return json({ error: "FOXESS_API_KEY não configurado em Secrets" }, 500);

  let ano: number, mes: number;
  try {
    const body = await req.json();
    ano = Number(body.ano);
    mes = Number(body.mes);
    if (!ano || !mes || mes < 1 || mes > 12) throw new Error("parâmetros inválidos");
  } catch {
    return json({ error: "corpo precisa ser { ano: number, mes: number }" }, 400);
  }

  // 1) usinas ativas da FoxESS, com seus SNs (coluna sn_inversor já vem
  // separada por ", " — ver gravarLeituras em mon-coleta).
  const { data: usinas, error: erroUsinas } = await supabaseAdmin
    .from("mon_usinas")
    .select("id, sn_inversor, kwp, cidade")
    .eq("ativo", true)
    .eq("marca", "foxess");
  if (erroUsinas) return json({ error: `Falha ao listar usinas: ${erroUsinas.message}` }, 500);
  if (!usinas || usinas.length === 0) return json({ usinas_processadas: 0, dias_gravados: 0, erros: [] });

  const erros: string[] = [];
  // usina_id -> array de kWh por dia (soma de todos os inversores dela)
  const kwhPorUsinaPorDia = new Map<string, number[]>();

  for (const usina of usinas as Array<{ id: string; sn_inversor: string | null; kwp: number | null; cidade: string | null }>) {
    const sns = (usina.sn_inversor ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (sns.length === 0) continue;

    let somaPorDia: number[] | null = null;
    for (const sn of sns) {
      try {
        const r = await foxessPost("/op/v0/device/report/query", {
          sn,
          year: ano,
          month: mes,
          dimension: "month",
          variables: ["generation"],
        });
        const linha = Array.isArray(r.result) ? r.result[0] : r.result?.data?.[0];
        const valores: number[] = linha?.values ?? [];
        if (!somaPorDia) {
          somaPorDia = valores.slice();
        } else {
          for (let i = 0; i < Math.max(somaPorDia.length, valores.length); i++) {
            somaPorDia[i] = (somaPorDia[i] ?? 0) + (valores[i] ?? 0);
          }
        }
      } catch (e) {
        erros.push(`Usina ${usina.id} (sn ${sn}), ${ano}-${mes}: ${e instanceof Error ? e.message : e}`);
      }
      await new Promise((resolve) => setTimeout(resolve, PAUSA_ENTRE_CHAMADAS_MS));
    }
    if (somaPorDia) kwhPorUsinaPorDia.set(usina.id, somaPorDia);
  }

  // 2) monta as linhas de mon_diario, calculando no mesmo passe a
  // mediana de kWh/kWp por cidade em cada dia (pra normalizar por
  // tamanho de sistema antes de comparar).
  const usinasPorId = new Map(usinas.map((u: any) => [u.id, u]));
  const maxDias = Math.max(0, ...[...kwhPorUsinaPorDia.values()].map((v) => v.length));

  const linhas: Array<{
    usina_id: string;
    data: string;
    kwh: number;
    kwh_por_kwp: number | null;
    mediana_cidade: number | null;
    desvio_pct: number | null;
    estado: "normal" | "sem_geracao" | "baixo_desempenho";
  }> = [];

  for (let dia = 0; dia < maxDias; dia++) {
    // mediana de kWh/kWp entre as usinas da mesma cidade nesse dia
    const porKwpPorCidade = new Map<string, number[]>();
    for (const [usinaId, valores] of kwhPorUsinaPorDia) {
      const usina = usinasPorId.get(usinaId);
      if (!usina?.cidade || !usina?.kwp) continue;
      const kwh = valores[dia];
      if (kwh == null) continue;
      const lista = porKwpPorCidade.get(usina.cidade) ?? [];
      lista.push(kwh / usina.kwp);
      porKwpPorCidade.set(usina.cidade, lista);
    }
    const medianaPorCidade = new Map<string, number | null>();
    for (const [cidade, lista] of porKwpPorCidade) medianaPorCidade.set(cidade, mediana(lista));

    for (const [usinaId, valores] of kwhPorUsinaPorDia) {
      const kwh = valores[dia];
      if (kwh == null) continue;
      const usina = usinasPorId.get(usinaId);
      const kwhPorKwp = usina?.kwp ? kwh / usina.kwp : null;
      const medianaCidade = usina?.cidade ? medianaPorCidade.get(usina.cidade) ?? null : null;
      const desvioPct =
        kwhPorKwp != null && medianaCidade != null && medianaCidade > 0
          ? ((kwhPorKwp - medianaCidade) / medianaCidade) * 100
          : null;

      let estado: "normal" | "sem_geracao" | "baixo_desempenho" = "normal";
      if (kwh === 0) estado = "sem_geracao";
      else if (desvioPct != null && desvioPct < -30) estado = "baixo_desempenho";

      linhas.push({
        usina_id: usinaId,
        data: `${ano}-${String(mes).padStart(2, "0")}-${String(dia + 1).padStart(2, "0")}`,
        kwh,
        kwh_por_kwp: kwhPorKwp,
        mediana_cidade: medianaCidade,
        desvio_pct: desvioPct,
        estado,
      });
    }
  }

  if (linhas.length === 0) {
    return json({ usinas_processadas: usinas.length, dias_gravados: 0, erros });
  }

  const { error: erroUpsert } = await supabaseAdmin.from("mon_diario").upsert(linhas, { onConflict: "usina_id,data" });
  if (erroUpsert) erros.push(`Falha ao gravar mon_diario: ${erroUpsert.message}`);

  return json({ usinas_processadas: usinas.length, dias_gravados: linhas.length, erros });
});
