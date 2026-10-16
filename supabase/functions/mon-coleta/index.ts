// Central de Monitoramento TLS — coleta periódica (Fase 1: só FoxESS).
//
// Agendamento: este projeto (Lovable Cloud) não oferece pg_cron/pg_net
// nem agendamento HTTP gerenciado pelo banco — por isso a chamada
// periódica vem de FORA, de um workflow do GitHub Actions
// (.github/workflows/mon-coleta-cron.yml), autenticado por um segredo
// compartilhado (header `x-mon-cron-secret`), não por JWT do Supabase.
// Por isso esta função tem `verify_jwt = false` em supabase/config.toml —
// a autenticação é toda feita aqui dentro, nunca pelo gateway.
//
// Chamada de duas formas:
//   1) GitHub Actions, a cada ~20min, com `x-mon-cron-secret` igual ao
//      secret MON_CRON_SECRET (cadastrado nos dois lados: Supabase
//      Secrets e GitHub Actions Secrets — nunca no código).
//   2) Manualmente por um usuário do painel (botão "Atualizar agora"),
//      com o JWT do próprio usuário — validado de verdade aqui (já que o
//      gateway não valida mais nada) via `supabaseAdmin.auth.getUser()`,
//      e só segue se o usuário tiver acesso ao painel (`has_panel_access`).
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

const FOXESS_API_TOKEN = Deno.env.get("FOXESS_API_KEY"); // nome do secret no Supabase: FOXESS_API_KEY
const MON_CRON_SECRET = Deno.env.get("MON_CRON_SECRET"); // segredo compartilhado com o workflow do GitHub Actions

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---------- autenticação/autorização ----------
// `verify_jwt = false` nesta função (ver supabase/config.toml) — o
// gateway NÃO valida mais nada antes de chegar aqui, então a validação
// de verdade é toda feita abaixo, para os dois chamadores possíveis.
async function autorizarChamada(req: Request): Promise<{ ok: true } | { ok: false; motivo: string }> {
  // 1) GitHub Actions — segredo compartilhado, sem JWT nenhum.
  const segredoRecebido = req.headers.get("x-mon-cron-secret");
  if (segredoRecebido) {
    if (!MON_CRON_SECRET) {
      return { ok: false, motivo: "MON_CRON_SECRET não está configurado nos Secrets desta função no Supabase" };
    }
    if (segredoRecebido === MON_CRON_SECRET) {
      return { ok: true };
    }
    // Diagnóstico sem expor os valores: só tamanho e primeiros/últimos
    // caracteres, o suficiente pra pegar espaço/quebra de linha a mais.
    return {
      ok: false,
      motivo: `segredo recebido não bate com o configurado (recebido: ${segredoRecebido.length} caracteres, começa com "${segredoRecebido.slice(0, 4)}", termina com "${segredoRecebido.slice(-4)}"; configurado: ${MON_CRON_SECRET.length} caracteres, começa com "${MON_CRON_SECRET.slice(0, 4)}", termina com "${MON_CRON_SECRET.slice(-4)}")`,
    };
  }

  // 2) Usuário do painel — JWT validado de verdade contra o Supabase Auth
  // (não dá pra só decodificar sem checar assinatura, já que o gateway
  // não verifica mais nada por conta do verify_jwt = false).
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return { ok: false, motivo: "nenhum x-mon-cron-secret nem Authorization recebido" };

  const { data: userData, error: erroAuth } = await supabaseAdmin.auth.getUser(token);
  if (erroAuth || !userData?.user) return { ok: false, motivo: "token inválido" };

  const { data: temAcesso, error: erroRpc } = await supabaseAdmin.rpc("has_panel_access", {
    _user_id: userData.user.id,
  });
  if (erroRpc) return { ok: false, motivo: "erro ao checar permissão: " + erroRpc.message };
  if (temAcesso === true) return { ok: true };
  return { ok: false, motivo: "usuário sem acesso ao painel" };
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
// Endpoints, nomes de campo e enum de `status` confirmados contra a
// documentação pública da FoxESS (OpenApiDocument.html) em 2026-10-16 —
// ainda NÃO testado contra uma chamada real (a conta é do tipo Retailer,
// chave única pra Org inteira — a key existe mas a primeira chamada de
// verdade só vai acontecer quando o agendador do GitHub Actions rodar).
//
// ⚠️ Pontos que ficaram ambíguos na própria doc da FoxESS, então vale
// reconfirmar se o primeiro ciclo de coleta der erro:
//   - domínio: a doc lista `www.foxesscloud.com`, mas um exemplo próprio
//     usa `portal.foxesscloud.us` — contas de região diferente podem
//     precisar de outro domínio.
//   - a assinatura usa só o path (`/op/v1/device/real/query`), não a URL
//     completa — é o que a maioria dos exemplos da comunidade faz, mas a
//     doc em si fala em "url" de forma ambígua.
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

// status enum confirmado na doc: 1 = online, 2 = fault, 3 = offline.
type FoxessStatus = 1 | 2 | 3 | null;

async function listarDispositivosFoxess(): Promise<Array<{ sn: string; stationName?: string; status: FoxessStatus }>> {
  const result = await foxessPost("/op/v0/device/list", { currentPage: 1, pageSize: 100 });
  const devices = result?.data ?? [];
  return devices.map((d: any) => ({
    sn: d.deviceSN,
    stationName: d.stationName,
    status: d.status ?? null,
  }));
}

async function buscarLeituraFoxess(
  sn: string,
  statusDispositivo: FoxessStatus
): Promise<LeituraNormalizada> {
  const variaveis = ["generationPower", "todayYield", "generation"];
  const resultado = await foxessPost("/op/v1/device/real/query", { sns: [sn], variables: variaveis });
  const dados = Array.isArray(resultado) ? resultado[0] : resultado?.data?.[0];
  const porVariavel: Record<string, number | null> = {};
  for (const v of dados?.datas ?? []) {
    porVariavel[v.variable] = v.value ?? null;
  }

  return {
    marca: "foxess",
    id_externo_usina: sn,
    sn_inversor: sn,
    // generationPower vem em kW (conferido na doc) — converte pra W pro
    // formato padronizado da especificação.
    potencia_atual_w: porVariavel.generationPower != null ? porVariavel.generationPower * 1000 : null,
    energia_hoje_kwh: porVariavel.todayYield ?? null,
    energia_total_kwh: porVariavel.generation ?? null,
    ultima_comunicacao: new Date().toISOString(),
    status_inversor: statusDispositivo === 1 ? "online" : statusDispositivo === 2 ? "alarme" : statusDispositivo === 3 ? "offline" : null,
    alarmes: statusDispositivo === 2 ? ["fault"] : [],
  };
}

async function coletarFoxess(): Promise<{ leituras: LeituraNormalizada[]; erros: string[] }> {
  const leituras: LeituraNormalizada[] = [];
  const erros: string[] = [];

  if (!FOXESS_API_TOKEN) {
    return { leituras, erros: ["FOXESS_API_KEY não configurado em Secrets — pulando FoxESS"] };
  }

  let dispositivos: Array<{ sn: string; stationName?: string; status: FoxessStatus }> = [];
  try {
    dispositivos = await listarDispositivosFoxess();
  } catch (e) {
    return { leituras, erros: [`Falha ao listar dispositivos FoxESS: ${e instanceof Error ? e.message : e}`] };
  }

  // Cada usina falha isolada — uma falhar não derruba as outras.
  for (const dev of dispositivos) {
    try {
      const leitura = await buscarLeituraFoxess(dev.sn, dev.status);
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
        online: l.status_inversor !== "offline",
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
