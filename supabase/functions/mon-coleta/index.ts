// Central de Monitoramento TLS — coleta periódica (Fase 1: só FoxESS).
//
// Chamada de duas formas:
//   1) pg_cron, a cada ~20min, com o service role key no Authorization
//      (ver migração 0009_monitoramento_cron.sql).
//   2) Manualmente por um usuário do painel (botão "Atualizar agora"),
//      com o JWT do próprio usuário — só segue se ele tiver acesso ao
//      painel (`has_panel_access`), checado abaixo via RPC.
//
// Módulo ISOLADO: só lê/escreve tabelas `mon_*` e `clientes_base` (pra
// resolver nome na hora de sugerir vínculo — não é feito aqui, é feito no
// front). Nada do fluxo de proposta ongrid é tocado por esta função.
//
// Importante (AGENTS.md): esta função usa a service role key internamente
// (bypassa RLS), então TEM que autenticar e autorizar quem chama antes de
// fazer qualquer escrita — ver `autorizarChamada()`.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { crypto as stdCrypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const FOXESS_API_TOKEN = Deno.env.get("FOXESS_API_TOKEN"); // configurar em Supabase Secrets

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---------- autenticação/autorização ----------
// O gateway de edge functions do Supabase já valida a assinatura do JWT
// antes do handler rodar (verify_jwt = true, padrão do projeto — não há
// override em supabase/config.toml). Então só precisamos ler as claims.
function decodeJwtPayload(authHeader: string | null): Record<string, any> | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

async function autorizarChamada(req: Request): Promise<{ ok: true } | { ok: false; motivo: string }> {
  const payload = decodeJwtPayload(req.headers.get("Authorization"));
  if (!payload) return { ok: false, motivo: "sem token válido" };

  if (payload.role === "service_role") return { ok: true }; // chamada do pg_cron

  if (payload.role === "authenticated" && payload.sub) {
    const { data, error } = await supabaseAdmin.rpc("has_panel_access", { _user_id: payload.sub });
    if (error) return { ok: false, motivo: "erro ao checar permissão: " + error.message };
    if (data === true) return { ok: true };
    return { ok: false, motivo: "usuário sem acesso ao painel" };
  }

  return { ok: false, motivo: "role não autorizada" };
}

// ---------- formato padronizado (contrato comum a todos os adaptadores) ----------
interface LeituraNormalizada {
  marca: "foxess";
  id_externo_usina: string;
  sn_inversor: string | null;
  potencia_atual_w: number | null;
  energia_hoje_kwh: number | null;
  energia_total_kwh: number | null;
  ultima_comunicacao: string | null;
  status_inversor: string | null;
  alarmes: string[];
  // extras usados só pra popular/atualizar o cadastro da usina (mon_usinas)
  modelo?: string | null;
  cidade?: string | null;
  kwp?: number | null;
}

// ---------- adaptador FoxESS ----------
// FoxESS OpenAPI (foxesscloud.com/op/v0). Assinatura: md5(`${path}\r\n${token}\r\n${timestamp}`).
//
// ⚠️ ATENÇÃO: os nomes exatos de endpoint/variáveis abaixo seguem a
// documentação pública da FoxESS no momento em que este adaptador foi
// escrito, mas NÃO foram testados contra uma conta real (ainda não temos
// a API key). Antes de ativar em produção, validar com uma chamada real:
// os nomes de variável em `/op/v0/device/real/query` em particular
// (`generationPower`, `todayYield`, `generation`) precisam ser
// confirmados contra o retorno real da API — a FoxESS já mudou esses
// nomes entre versões da plataforma.
const FOXESS_BASE = "https://www.foxesscloud.com";

async function foxessMd5(texto: string): Promise<string> {
  const buf = await stdCrypto.subtle.digest("MD5", new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function foxessHeaders(path: string): Promise<Record<string, string>> {
  const timestamp = Date.now().toString();
  const signature = await foxessMd5(`${path}\r\n${FOXESS_API_TOKEN}\r\n${timestamp}`);
  return {
    token: FOXESS_API_TOKEN!,
    timestamp,
    signature,
    lang: "en",
    "Content-Type": "application/json",
  };
}

async function foxessPost(path: string, body: unknown): Promise<any> {
  const res = await fetch(FOXESS_BASE + path, {
    method: "POST",
    headers: await foxessHeaders(path),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.errno && data.errno !== 0) {
    throw new Error(`FoxESS ${path} errno=${data.errno} ${data.msg ?? ""}`);
  }
  return data.result ?? data;
}

async function listarDispositivosFoxess(): Promise<Array<{ sn: string; stationName?: string; deviceType?: string }>> {
  // CONFIRMAR: paginação real do /op/v0/device/list (campo de página pode
  // se chamar currentPage/pageSize ou page/limit, dependendo da versão).
  const result = await foxessPost("/op/v0/device/list", { currentPage: 1, pageSize: 100 });
  const devices = result?.data ?? result?.rows ?? [];
  return devices.map((d: any) => ({ sn: d.deviceSN ?? d.sn, stationName: d.stationName, deviceType: d.deviceType }));
}

async function buscarLeituraFoxess(sn: string): Promise<LeituraNormalizada> {
  // CONFIRMAR: nomes exatos das variáveis — ver aviso acima.
  const variaveis = ["generationPower", "todayYield", "generation"];
  const result = await foxessPost("/op/v0/device/real/query", { sns: [sn], variables: variaveis });
  const dados = Array.isArray(result) ? result[0] : result?.[0];
  const porVariavel: Record<string, number | null> = {};
  for (const v of dados?.datas ?? []) {
    porVariavel[v.variable] = v.value ?? null;
  }

  return {
    marca: "foxess",
    id_externo_usina: sn,
    sn_inversor: sn,
    potencia_atual_w: porVariavel.generationPower != null ? porVariavel.generationPower * 1000 : null,
    energia_hoje_kwh: porVariavel.todayYield ?? null,
    energia_total_kwh: porVariavel.generation ?? null,
    ultima_comunicacao: new Date().toISOString(),
    status_inversor: dados ? "comunicando" : null,
    alarmes: [], // a consulta real-time não traz alarme; fica pra uma chamada dedicada quando precisarmos disso
  };
}

async function coletarFoxess(): Promise<{ leituras: LeituraNormalizada[]; erros: string[] }> {
  const leituras: LeituraNormalizada[] = [];
  const erros: string[] = [];

  if (!FOXESS_API_TOKEN) {
    return { leituras, erros: ["FOXESS_API_TOKEN não configurado em Secrets — pulando FoxESS"] };
  }

  let dispositivos: Array<{ sn: string; stationName?: string }> = [];
  try {
    dispositivos = await listarDispositivosFoxess();
  } catch (e) {
    return { leituras, erros: [`Falha ao listar dispositivos FoxESS: ${e instanceof Error ? e.message : e}`] };
  }

  // Cada usina falha isolada — uma falhar não derruba as outras.
  for (const dev of dispositivos) {
    try {
      const leitura = await buscarLeituraFoxess(dev.sn);
      leitura.modelo = dev.stationName ?? null;
      leituras.push(leitura);
    } catch (e) {
      erros.push(`FoxESS ${dev.sn}: ${e instanceof Error ? e.message : e}`);
    }
  }

  return { leituras, erros };
}

// ---------- grava no banco ----------
async function gravarLeituras(leituras: LeituraNormalizada[]): Promise<{ gravadas: number; erros: string[] }> {
  let gravadas = 0;
  const erros: string[] = [];

  for (const l of leituras) {
    try {
      // upsert em mon_usinas sem sobrescrever vínculo/ativo já confirmados
      const { data: usinaExistente } = await supabaseAdmin
        .from("mon_usinas")
        .select("id")
        .eq("marca", l.marca)
        .eq("id_externo", l.id_externo_usina)
        .maybeSingle();

      let usinaId = usinaExistente?.id as string | undefined;

      if (!usinaId) {
        const { data: nova, error: erroInsert } = await supabaseAdmin
          .from("mon_usinas")
          .insert({
            marca: l.marca,
            id_externo: l.id_externo_usina,
            sn_inversor: l.sn_inversor,
            modelo: l.modelo ?? null,
            cidade: l.cidade ?? null,
            kwp: l.kwp ?? null,
          })
          .select("id")
          .single();
        if (erroInsert) throw erroInsert;
        usinaId = nova.id;
      } else {
        await supabaseAdmin
          .from("mon_usinas")
          .update({ sn_inversor: l.sn_inversor, modelo: l.modelo ?? undefined })
          .eq("id", usinaId);
      }

      const { error: erroLeitura } = await supabaseAdmin.from("mon_leituras").insert({
        usina_id: usinaId,
        coletado_em: l.ultima_comunicacao ?? new Date().toISOString(),
        potencia_w: l.potencia_atual_w,
        energia_dia_kwh: l.energia_hoje_kwh,
        energia_total_kwh: l.energia_total_kwh,
        online: l.status_inversor !== null,
        alarmes: l.alarmes,
      });
      if (erroLeitura) throw erroLeitura;

      gravadas++;
    } catch (e) {
      erros.push(`Gravação ${l.id_externo_usina}: ${e instanceof Error ? e.message : e}`);
    }
  }

  return { gravadas, erros };
}

// ---------- handler ----------
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await autorizarChamada(req);
  if (!auth.ok) return json({ error: auth.motivo }, 401);

  // Cada marca falha isolada — Fase 1 só tem FoxESS; Solarman/Solis entram
  // como mais um bloco igual a este, sem afetar o que já funciona.
  const { leituras, erros: errosColeta } = await coletarFoxess();
  const { gravadas, erros: errosGravacao } = await gravarLeituras(leituras);

  return json({
    usinas_processadas: leituras.length,
    leituras_gravadas: gravadas,
    erros: [...errosColeta, ...errosGravacao],
  });
});
