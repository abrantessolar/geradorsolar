// Central de Monitoramento TLS — coleta periódica (FoxESS + Solis).
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
const SOLIS_API_URL = Deno.env.get("SOLIS_API_URL"); // ex: https://www.soliscloud.com:13333
const SOLIS_KEY_ID = Deno.env.get("SOLIS_KEY_ID");
const SOLIS_KEY_SECRET = Deno.env.get("SOLIS_KEY_SECRET");
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
  marca: "foxess" | "solis";
  id_externo_usina: string;
  sn_inversor: string | null;
  potencia_atual_w: number | null;
  energia_hoje_kwh: number | null;
  energia_total_kwh: number | null;
  ultima_comunicacao: string | null;
  status_inversor: string | null;
  // Se a usina está comunicando AGORA (sinal de conectividade puro,
  // independente de ter alarme ou não). Corrigido em 2026-10-17 — ver
  // comentário em gravarLeituras sobre por que isso precisou ser
  // desacoplado de `status_inversor`.
  online: boolean;
  alarmes: string[];
  // extras usados só pra popular/atualizar o cadastro da usina (mon_usinas)
  modelo?: string | null;
  cidade?: string | null;
  kwp?: number | null;
}

// ---------- adaptador FoxESS ----------
// FoxESS OpenAPI (foxesscloud.com/op/v0 + op/v1). Assinatura:
// md5(`${path}\r\n${token}\r\n${timestamp}`). Confirmado funcionando
// contra a conta real da TLS em 2026-10-16 (252 leituras no primeiro
// ciclo) — domínio, endpoints e nomes de variável abaixo estão validados,
// não é mais rascunho.
//
// Correção importante (2026-10-16): `/op/v0/device/list` lista
// DISPOSITIVOS (um inversor/micro por linha), não usinas — por isso o
// primeiro ciclo gravou 84 linhas em mon_usinas quando a TLS tem 25
// usinas reais (plantas com mais de um inversor contavam várias vezes).
// Cada dispositivo já vem com `stationID`/`stationName` (a usina de
// verdade); agrupamos por `stationID` abaixo e tratamos a usina como a
// unidade do painel, somando a potência/energia dos dispositivos dela.
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
  const textoBruto = await res.text();
  let data: any;
  try {
    data = JSON.parse(textoBruto);
  } catch {
    // Diagnóstico: manda o status HTTP + os primeiros 300 caracteres da
    // resposta (pode ser uma página de erro em HTML, um redirect, etc.)
    // em vez de só "Unexpected end of JSON input".
    throw new Error(
      `FoxESS ${path} retornou algo não-JSON (HTTP ${res.status} ${res.statusText}): ${textoBruto.slice(0, 300) || "(corpo vazio)"}`
    );
  }
  if (data.errno && data.errno !== 0) {
    throw new Error(`FoxESS ${path} errno=${data.errno} ${data.msg ?? ""}`);
  }
  return data.result ?? data;
}

// status enum confirmado na doc: 1 = online, 2 = fault, 3 = offline.
type FoxessStatus = 1 | 2 | 3 | null;

interface DispositivoFoxess {
  sn: string;
  stationID: string;
  stationName?: string;
  status: FoxessStatus;
}

async function listarDispositivosFoxess(): Promise<DispositivoFoxess[]> {
  // Paginação defensiva: a frota de hoje (84 dispositivos/26 usinas) cabe
  // numa página só, mas isso evita perder dispositivos silenciosamente se
  // a frota crescer além disso. pageSize=100 é o valor já comprovado (foi
  // com ele que a coleta real funcionou pela primeira vez) — a FoxESS
  // rejeita valores pequenos (confirmado: pageSize=5 deu errno 40257
  // "Parameters do not meet expectations"), então não arriscamos outro
  // valor sem testar.
  const todos: DispositivoFoxess[] = [];
  let pagina = 1;
  const pageSize = 100;
  while (true) {
    const result = await foxessPost("/op/v0/device/list", { currentPage: pagina, pageSize });
    const devices = result?.data ?? [];
    for (const d of devices) {
      todos.push({ sn: d.deviceSN, stationID: d.stationID, stationName: d.stationName, status: d.status ?? null });
    }
    const total = result?.total ?? devices.length;
    if (devices.length === 0 || todos.length >= total) break;
    pagina++;
  }
  return todos;
}

// Uma usina (station, `stationID`) pode ter mais de um inversor/micro
// (`deviceSN`) — por isso recebe a lista de dispositivos daquela estação
// e soma as leituras, em vez de uma leitura por dispositivo.
async function buscarLeituraEstacaoFoxess(
  stationID: string,
  dispositivos: DispositivoFoxess[]
): Promise<LeituraNormalizada> {
  const sns = dispositivos.map((d) => d.sn);
  const variaveis = ["generationPower", "todayYield", "generation"];
  const resultado = await foxessPost("/op/v1/device/real/query", { sns, variables: variaveis });
  const linhas: any[] = Array.isArray(resultado) ? resultado : resultado?.data ?? [];

  let potenciaTotalW = 0;
  let temLeituraDePotencia = false;
  let energiaHojeKwh = 0;
  let energiaTotalKwh = 0;
  const alarmes: string[] = [];
  let algumOnline = false;
  let algumFault = false;
  let todosOffline = true;

  for (const dev of dispositivos) {
    const linha = linhas.find((l: any) => l.deviceSN === dev.sn);
    const porVariavel: Record<string, number | null> = {};
    for (const v of linha?.datas ?? []) {
      porVariavel[v.variable] = v.value ?? null;
    }

    // generationPower vem em kW (conferido na doc) — converte pra W pro
    // formato padronizado da especificação.
    if (porVariavel.generationPower != null) {
      potenciaTotalW += porVariavel.generationPower * 1000;
      temLeituraDePotencia = true;
    }
    energiaHojeKwh += porVariavel.todayYield ?? 0;
    energiaTotalKwh += porVariavel.generation ?? 0;

    if (dev.status === 1) algumOnline = true;
    if (dev.status === 2) {
      algumFault = true;
      alarmes.push(`${dev.sn}: fault`);
    }
    if (dev.status !== 3) todosOffline = false;
  }

  const statusEstacao = algumFault ? "alarme" : todosOffline ? "offline" : algumOnline ? "online" : null;

  return {
    marca: "foxess",
    id_externo_usina: stationID,
    sn_inversor: dispositivos.map((d) => d.sn).join(", "),
    potencia_atual_w: temLeituraDePotencia ? potenciaTotalW : null,
    energia_hoje_kwh: energiaHojeKwh,
    energia_total_kwh: energiaTotalKwh,
    ultima_comunicacao: new Date().toISOString(),
    status_inversor: statusEstacao,
    online: !todosOffline,
    alarmes,
    modelo: dispositivos[0]?.stationName ?? null,
  };
}

async function coletarFoxess(): Promise<{ leituras: LeituraNormalizada[]; erros: string[] }> {
  const leituras: LeituraNormalizada[] = [];
  const erros: string[] = [];

  if (!FOXESS_API_TOKEN) {
    return { leituras, erros: ["FOXESS_API_KEY não configurado em Secrets — pulando FoxESS"] };
  }

  let dispositivos: DispositivoFoxess[] = [];
  try {
    dispositivos = await listarDispositivosFoxess();
  } catch (e) {
    return { leituras, erros: [`Falha ao listar dispositivos FoxESS: ${e instanceof Error ? e.message : e}`] };
  }

  const porEstacao = new Map<string, DispositivoFoxess[]>();
  for (const dev of dispositivos) {
    const lista = porEstacao.get(dev.stationID) ?? [];
    lista.push(dev);
    porEstacao.set(dev.stationID, lista);
  }

  // Cada usina (estação) falha isolada — uma falhar não derruba as outras.
  for (const [stationID, dispositivosDaEstacao] of porEstacao) {
    try {
      const leitura = await buscarLeituraEstacaoFoxess(stationID, dispositivosDaEstacao);
      leituras.push(leitura);
    } catch (e) {
      erros.push(`FoxESS estação ${stationID}: ${e instanceof Error ? e.message : e}`);
    }
  }

  return { leituras, erros };
}

// ---------- adaptador Solis ----------
// SolisCloud API (single account permission). Autenticação por
// assinatura HMAC-SHA1 (bem diferente da FoxESS): header
// Authorization = "API " + KeyID + ":" + Sign, onde Sign é
// base64(HMAC-SHA1(KeySecret, texto)) e o texto assinado é
// VERBO\nContent-MD5\nContent-Type\nDate\nCaminho. Confirmado contra a
// conta real da TLS em 2026-10-17 via mon-solis-teste: Content-Type tem
// que ser EXATAMENTE "application/json" (sem ";charset=UTF-8"), senão
// a Solis responde 403 "wrong sign". Rate limit: 3 chamadas/5s por IP
// (mais apertado que o 1/seg da FoxESS) — por isso a pausa entre
// chamadas abaixo.
//
// Diferente da FoxESS, a Solis tem endpoints em LOTE que trazem várias
// usinas/inversores por chamada (confirmado: userStationList e
// inverterList paginados trazem todas as 292 usinas / 302 inversores em
// poucas páginas) — a coleta em tempo real não precisa de 1 chamada por
// usina. (O histórico diário por mês, usado no backfill da Fase 3, já é
// outra história: stationMonthEnergyList em modo lote NÃO funciona,
// confirmado em teste — precisa de 1 chamada por usina, ver
// mon-backfill-diario quando a Fase 3 da Solis for construída.)
const SOLIS_BASE = SOLIS_API_URL ?? "";
const SOLIS_PAUSA_MS = 1700; // ~3 chamadas/5s = 1 chamada a cada ~1.67s

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

async function solisPost(caminho: string, corpo: unknown): Promise<any> {
  const corpoTexto = JSON.stringify(corpo);
  const contentMd5 = await solisMd5Base64(corpoTexto);
  const contentType = "application/json"; // confirmado: SEM ";charset=UTF-8"
  const data = new Date().toUTCString();
  const paraAssinar = `POST\n${contentMd5}\n${contentType}\n${data}\n${caminho}`;
  const assinatura = await solisHmacSha1Base64(SOLIS_KEY_SECRET!, paraAssinar);
  const authorization = `API ${SOLIS_KEY_ID}:${assinatura}`;

  const res = await fetch(SOLIS_BASE + caminho, {
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

interface UsinaSolis {
  id: string; // stationId
  stationName: string | null;
  capacity: number | null;
  countyStr: string | null; // cuidado: na hierarquia da Solis, "city" é o ESTADO
  // (ex.: "Mato Grosso do Sul") e "county" é o MUNICÍPIO de verdade (ex.:
  // "Tres Lagoas") — confirmado comparando um registro real em 2026-10-17.
  // Usar countyStr pra "cidade", nunca cityStr.
}

async function listarUsinasSolis(): Promise<Map<string, UsinaSolis>> {
  const porId = new Map<string, UsinaSolis>();
  let pagina = 1;
  const pageSize = 100;
  while (true) {
    const dados = await solisPost("/v1/api/userStationList", { pageNo: pagina, pageSize });
    const registros = dados?.page?.records ?? [];
    for (const r of registros) {
      porId.set(r.id, {
        id: r.id,
        stationName: r.stationName ?? null,
        capacity: r.capacity ?? null,
        countyStr: r.countyStr ?? null,
      });
    }
    const total = dados?.page?.total ?? registros.length;
    await new Promise((resolve) => setTimeout(resolve, SOLIS_PAUSA_MS));
    if (registros.length === 0 || porId.size >= total) break;
    pagina++;
  }
  return porId;
}

interface InversorSolis {
  sn: string;
  stationId: string;
  inverterSeries: string | null;
  pacW: number | null; // potência AC atual, em W (campo pac1)
  etodayKwh: number | null;
  etotalKwh: number | null;
  dataTimestampMs: number | null;
  alarmLevel: number;
  stateExceptionFlag: number;
}

async function listarInversoresSolis(): Promise<InversorSolis[]> {
  const todos: InversorSolis[] = [];
  let pagina = 1;
  const pageSize = 100;
  while (true) {
    const dados = await solisPost("/v1/api/inverterList", { pageNo: pagina, pageSize });
    const registros = dados?.page?.records ?? [];
    for (const r of registros) {
      todos.push({
        sn: r.sn,
        stationId: r.stationId,
        inverterSeries: r.inverterSeries ?? null,
        pacW: r.pac1 ?? (r.pac != null ? r.pac * 1000 : null),
        etodayKwh: r.etoday1 ?? r.etoday ?? null,
        etotalKwh: r.etotal1 ?? null,
        dataTimestampMs: r.dataTimestamp ? Number(r.dataTimestamp) : null,
        alarmLevel: r.alarmLevel ?? 0,
        stateExceptionFlag: r.stateExceptionFlag ?? 0,
      });
    }
    const total = dados?.page?.total ?? registros.length;
    await new Promise((resolve) => setTimeout(resolve, SOLIS_PAUSA_MS));
    if (registros.length === 0 || todos.length >= total) break;
    pagina++;
  }
  return todos;
}

// A Solis não documenta com clareza o significado do campo "state" do
// inversor (relatos de terceiros dizem que nem sempre bate com o que a
// própria interface da Solis mostra) — por isso, em vez de confiar nesse
// código numérico, usamos um sinal mais confiável: se o `dataTimestamp`
// do inversor está recente (dentro do ciclo de coleta + folga), ele está
// comunicando; se não, está offline. Alarme vem de `alarmLevel`/
// `stateExceptionFlag`, que são campos claramente dedicados a isso.
const SOLIS_FRESCOR_MAXIMO_MS = 60 * 60 * 1000; // 1h de folga sobre o ciclo de ~20min

async function coletarSolis(): Promise<{ leituras: LeituraNormalizada[]; erros: string[] }> {
  const leituras: LeituraNormalizada[] = [];
  const erros: string[] = [];

  if (!SOLIS_API_URL || !SOLIS_KEY_ID || !SOLIS_KEY_SECRET) {
    return { leituras, erros: ["SOLIS_API_URL/SOLIS_KEY_ID/SOLIS_KEY_SECRET não configurados em Secrets — pulando Solis"] };
  }

  let usinas: Map<string, UsinaSolis>;
  let inversores: InversorSolis[];
  try {
    usinas = await listarUsinasSolis();
    inversores = await listarInversoresSolis();
  } catch (e) {
    return { leituras, erros: [`Falha ao listar usinas/inversores Solis: ${e instanceof Error ? e.message : e}`] };
  }

  const porUsina = new Map<string, InversorSolis[]>();
  for (const inv of inversores) {
    const lista = porUsina.get(inv.stationId) ?? [];
    lista.push(inv);
    porUsina.set(inv.stationId, lista);
  }

  const agora = Date.now();

  for (const [stationId, invsDaUsina] of porUsina) {
    try {
      const usina = usinas.get(stationId);
      let potenciaTotalW = 0;
      let temLeituraDePotencia = false;
      let energiaHojeKwh = 0;
      let energiaTotalKwh = 0;
      let algumOnline = false;
      let algumAlarme = false;
      let todosOffline = true;
      const alarmes: string[] = [];

      for (const inv of invsDaUsina) {
        if (inv.pacW != null) {
          potenciaTotalW += inv.pacW;
          temLeituraDePotencia = true;
        }
        energiaHojeKwh += inv.etodayKwh ?? 0;
        energiaTotalKwh += inv.etotalKwh ?? 0;

        const frescor = inv.dataTimestampMs != null ? agora - inv.dataTimestampMs : Infinity;
        const online = frescor <= SOLIS_FRESCOR_MAXIMO_MS;
        if (online) {
          algumOnline = true;
          todosOffline = false;
        }
        if (inv.alarmLevel > 0 || inv.stateExceptionFlag !== 0) {
          algumAlarme = true;
          alarmes.push(`${inv.sn}: alarmLevel=${inv.alarmLevel} stateExceptionFlag=${inv.stateExceptionFlag}`);
        }
      }

      const statusUsina = algumAlarme ? "alarme" : todosOffline ? "offline" : algumOnline ? "online" : null;

      leituras.push({
        marca: "solis",
        id_externo_usina: stationId,
        sn_inversor: invsDaUsina.map((i) => i.sn).join(", "),
        potencia_atual_w: temLeituraDePotencia ? potenciaTotalW : null,
        energia_hoje_kwh: energiaHojeKwh,
        energia_total_kwh: energiaTotalKwh,
        ultima_comunicacao: new Date().toISOString(),
        status_inversor: statusUsina,
        // CORRIGIDO (2026-10-17): não usar "status_inversor !== 'offline'"
        // pra isso (era o que gravarLeituras fazia antes) — `alarmLevel`/
        // `stateExceptionFlag` são sinais independentes da conectividade na
        // Solis (diferente da FoxESS, onde fault/offline são estados
        // mutuamente exclusivos do mesmo campo). Um inversor pode estar
        // REALMENTE offline (dataTimestamp velho) e ainda carregar um
        // alarme antigo registrado antes de parar de comunicar — nesse
        // caso `statusUsina` vira "alarme" (prioridade de exibição), mas
        // isso não deve apagar o sinal de "está offline". `online` aqui é
        // só o sinal de frescor, puro.
        online: !todosOffline,
        alarmes,
        // Prioridade invertida da FoxESS, de propósito: lá "modelo" guarda o
        // nome do dono da usina (stationName), não o modelo do inversor — é
        // isso que aparece no título de cada linha do painel. Mantém o mesmo
        // padrão aqui: nome do dono primeiro, modelo do inversor só como
        // fallback se a usina não tiver vínculo encontrado em userStationList.
        modelo: usina?.stationName ?? invsDaUsina[0]?.inverterSeries ?? null,
        cidade: usina?.countyStr ?? null,
        kwp: usina?.capacity ?? null,
      });

      if (!usina) {
        // Diagnóstico (2026-10-17): no primeiro teste real, algumas usinas
        // apareceram no painel sem cidade/kWp. Hipótese: o stationId do
        // inverterList não bateu com nenhum id do userStationList pra essas
        // usinas (ou a própria Solis não tem esse dado cadastrado). Registra
        // como erro não-bloqueante pra confirmar sem precisar de outro teste.
        erros.push(
          `Solis stationId ${stationId}: sem registro correspondente em userStationList (cidade/kWp/nome do dono ficam vazios — pode ser dado ausente na Solis ou bug de vínculo)`
        );
      }
    } catch (e) {
      erros.push(`Solis usina ${stationId}: ${e instanceof Error ? e.message : e}`);
    }
  }

  return { leituras, erros };
}

// ---------- grava no banco ----------
// Reescrito em 2026-10-17: a versão original fazia 2-3 round-trips ao
// banco POR USINA (select + insert/update + insert da leitura), em
// sequência. Com só a FoxESS (26 usinas) isso cabia dentro do timeout da
// edge function (~150s). Com Solis somada (292 usinas, 318 no total),
// a mesma função passou de ~954 round-trips sequenciais e deu timeout
// antes de terminar (confirmado: só 26 FoxESS + 275/292 Solis foram
// gravadas, faltando o resto do ciclo). Reescrito pra gravar em LOTE —
// um upsert em `mon_usinas` (aproveitando o UNIQUE(marca, id_externo) já
// existente desde a Fase 1) e um insert em `mon_leituras`, cada um em
// poucos lotes de até 100 linhas, em vez de 1 chamada por usina.
//
// O upsert só atualiza as colunas passadas no payload (sn_inversor,
// modelo, cidade, kwp) — cliente_base_id/ativo/vinculo_confirmado nunca
// são tocados aqui, preservando o comportamento original de não
// sobrescrever vínculo já confirmado.
const TAMANHO_LOTE = 100;

function emLotes<T>(itens: T[], tamanho: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) lotes.push(itens.slice(i, i + tamanho));
  return lotes;
}

async function gravarLeituras(leituras: LeituraNormalizada[]): Promise<{ gravadas: number; erros: string[] }> {
  const erros: string[] = [];
  if (leituras.length === 0) return { gravadas: 0, erros };

  // 1) upsert em mon_usinas, em lotes — devolve o id de cada uma (nova ou
  // existente) pra usar como usina_id na gravação das leituras.
  const idPorChave = new Map<string, string>();
  const chave = (marca: string, idExterno: string) => `${marca}|${idExterno}`;

  for (const lote of emLotes(leituras, TAMANHO_LOTE)) {
    const payload = lote.map((l) => ({
      marca: l.marca,
      id_externo: l.id_externo_usina,
      sn_inversor: l.sn_inversor,
      modelo: l.modelo ?? null,
      cidade: l.cidade ?? null,
      kwp: l.kwp ?? null,
    }));
    const { data, error } = await supabaseAdmin
      .from("mon_usinas")
      .upsert(payload, { onConflict: "marca,id_externo" })
      .select("id, marca, id_externo");
    if (error) {
      erros.push(`Upsert de usinas (lote de ${lote.length}): ${error.message}`);
      continue;
    }
    for (const row of data ?? []) {
      idPorChave.set(chave(row.marca, row.id_externo), row.id);
    }
  }

  // 2) insert em mon_leituras, em lotes — só pras usinas cujo upsert deu certo.
  let gravadas = 0;
  const leiturasComId = leituras
    .map((l) => ({ leitura: l, usinaId: idPorChave.get(chave(l.marca, l.id_externo_usina)) }))
    .filter((x): x is { leitura: LeituraNormalizada; usinaId: string } => x.usinaId != null);

  const semId = leituras.length - leiturasComId.length;
  if (semId > 0) erros.push(`${semId} leitura(s) sem usina_id (upsert falhou pra elas) — não gravadas`);

  for (const lote of emLotes(leiturasComId, TAMANHO_LOTE)) {
    const payload = lote.map(({ leitura: l, usinaId }) => ({
      usina_id: usinaId,
      coletado_em: l.ultima_comunicacao ?? new Date().toISOString(),
      potencia_w: l.potencia_atual_w,
      energia_dia_kwh: l.energia_hoje_kwh,
      energia_total_kwh: l.energia_total_kwh,
      // CORRIGIDO (2026-10-17): usar o sinal de conectividade puro (`l.online`),
      // não derivar de `status_inversor !== "offline"`. Esse derivado dava
      // falso "online" pra usinas Solis que estavam offline MAS com alarme
      // registrado (alarme tem prioridade de exibição em status_inversor,
      // então virava "alarme", e "alarme" !== "offline" → online=true por
      // engano) — isso fazia avaliarEstados() pular o branch de "offline" e
      // classificar como "sem_geracao" em vez de "offline".
      online: l.online,
      alarmes: l.alarmes,
    }));
    const { error } = await supabaseAdmin.from("mon_leituras").insert(payload);
    if (error) {
      erros.push(`Insert de leituras (lote de ${lote.length}): ${error.message}`);
      continue;
    }
    gravadas += lote.length;
  }

  return { gravadas, erros };
}

// ---------- Fase 2: avaliação de estado + fila de contato automática ----------
// Baixo desempenho (comparação com mediana da cidade / HSP ao longo de
// vários dias) fica pra Fase 3, quando mon_diario estiver populado com
// histórico suficiente — por ora só offline e sem_geração, que dá pra
// calcular com a leitura mais recente de cada usina.
const OFFLINE_HORAS = 24; // sem nenhuma leitura por tanto tempo = problema real, mesmo de noite
const SEM_GERACAO_POTENCIA_W = 50; // abaixo disso é "praticamente zero"
const MEDIANA_MINIMA_GERANDO_W = 200; // mediana da frota acima disso = "é dia de sol agora" (reforço extra, dentro da janela abaixo)

// Decisão do usuário (2026-10-16): só é considerado problema a usina estar
// offline/sem gerar DURANTE O DIA. De noite é natural não comunicar/gerar
// (inversor dorme, sem PV), então fora da janela 7h-17h o estado é sempre
// "normal", mesmo que a última leitura mostre offline. Horário fixo de
// Três Lagoas/Campo Grande — Brasil não tem mais horário de verão desde
// 2019, então UTC-4 vale o ano inteiro.
const FUSO_CAMPO_GRANDE_HORAS = -4;
const HORA_INICIO_JANELA_SOLAR = 7;
const HORA_FIM_JANELA_SOLAR = 17;

function dentroDaJanelaSolar(agora: Date): boolean {
  const horaLocal = (agora.getUTCHours() + FUSO_CAMPO_GRANDE_HORAS + 24) % 24;
  return horaLocal >= HORA_INICIO_JANELA_SOLAR && horaLocal < HORA_FIM_JANELA_SOLAR;
}

type EstadoUsina = "normal" | "sem_geracao" | "offline";

async function atualizarChamado(usinaId: string, estado: EstadoUsina): Promise<void> {
  if (estado === "normal") {
    // Fecha automaticamente qualquer chamado aberto dessa usina.
    const { data: abertos } = await supabaseAdmin
      .from("mon_chamados")
      .select("id")
      .eq("usina_id", usinaId)
      .is("resolvido_em", null);
    for (const c of abertos ?? []) {
      await supabaseAdmin
        .from("mon_chamados")
        .update({ etapa: "resolvido", resolvido_em: new Date().toISOString(), resolucao: "auto" })
        .eq("id", c.id);
      await supabaseAdmin.from("mon_chamado_eventos").insert({
        chamado_id: c.id,
        tipo: "mudanca_etapa",
        mensagem: "Resolvido automaticamente — usina voltou a gerar normalmente.",
      });
    }
    return;
  }

  // offline ou sem_geracao: no máximo um chamado aberto por usina (índice
  // único garante isso no banco também) — se já existe, só atualiza o
  // tipo caso o problema tenha mudado (ex.: estava offline, voltou a
  // comunicar mas sem gerar).
  const { data: existente } = await supabaseAdmin
    .from("mon_chamados")
    .select("id, tipo")
    .eq("usina_id", usinaId)
    .is("resolvido_em", null)
    .maybeSingle();

  if (existente) {
    if (existente.tipo !== estado) {
      await supabaseAdmin.from("mon_chamados").update({ tipo: estado }).eq("id", existente.id);
    }
    return;
  }

  const { data: usina } = await supabaseAdmin
    .from("mon_usinas")
    .select("cliente_base_id")
    .eq("id", usinaId)
    .single();

  await supabaseAdmin.from("mon_chamados").insert({
    usina_id: usinaId,
    cliente_base_id: usina?.cliente_base_id ?? null,
    tipo: estado,
    etapa: "novo",
  });
}

async function avaliarEstados(): Promise<{ atualizadas: number; erros: string[] }> {
  const erros: string[] = [];
  let atualizadas = 0;

  const { data: usinas, error: erroUsinas } = await supabaseAdmin
    .from("mon_usinas")
    .select("id, estado_atual")
    .eq("ativo", true);
  if (erroUsinas) return { atualizadas: 0, erros: [`Falha ao listar usinas pra avaliar estado: ${erroUsinas.message}`] };
  if (!usinas || usinas.length === 0) return { atualizadas: 0, erros: [] };

  const usinaIds = usinas.map((u: any) => u.id);

  // Leituras mais recentes primeiro — pega só a primeira que aparecer por
  // usina. Volume ainda pequeno (Fase 1), não precisa de window function.
  const { data: leituras, error: erroLeituras } = await supabaseAdmin
    .from("mon_leituras")
    .select("usina_id, coletado_em, potencia_w, online")
    .in("usina_id", usinaIds)
    .order("coletado_em", { ascending: false })
    .limit(usinaIds.length * 3); // folga pra garantir cobrir a leitura mais recente de cada usina
  if (erroLeituras) return { atualizadas: 0, erros: [`Falha ao buscar leituras pra avaliar estado: ${erroLeituras.message}`] };

  const ultimaPorUsina = new Map<string, { coletado_em: string; potencia_w: number | null; online: boolean }>();
  for (const l of leituras ?? []) {
    if (!ultimaPorUsina.has(l.usina_id)) ultimaPorUsina.set(l.usina_id, l);
  }

  // Mediana de potência entre quem está comunicando agora — serve de
  // referência pra saber se "é dia de sol": à noite a mediana cai junto
  // com todo mundo, então ninguém é marcado como sem_geração à toa.
  const potenciasOnline = [...ultimaPorUsina.values()]
    .filter((l) => l.online && l.potencia_w != null)
    .map((l) => l.potencia_w as number)
    .sort((a, b) => a - b);
  const medianaPotencia = potenciasOnline.length ? potenciasOnline[Math.floor(potenciasOnline.length / 2)] : 0;
  const ehMomentoDeGeracao = medianaPotencia >= MEDIANA_MINIMA_GERANDO_W;

  const agoraDate = new Date();
  const agora = agoraDate.getTime();
  const dentroDoHorarioSolar = dentroDaJanelaSolar(agoraDate);

  for (const usina of usinas as Array<{ id: string; estado_atual: EstadoUsina }>) {
    const ultima = ultimaPorUsina.get(usina.id);
    let novoEstado: EstadoUsina;

    if (!ultima) {
      // Nunca teve nenhuma leitura — problema real, não depende de horário.
      novoEstado = "offline";
    } else {
      const horasDesdeUltima = (agora - new Date(ultima.coletado_em).getTime()) / 3_600_000;
      if (horasDesdeUltima > OFFLINE_HORAS) {
        // Mais de 24h sem nenhuma leitura é sinal de falha real (equipamento
        // ou conectividade), mesmo que tenha caído durante a noite.
        novoEstado = "offline";
      } else if (!dentroDoHorarioSolar) {
        // Fora de 7h-17h: não comunicar/gerar é esperado, não é problema.
        novoEstado = "normal";
      } else if (!ultima.online) {
        novoEstado = "offline";
      } else if (ehMomentoDeGeracao && (ultima.potencia_w ?? 0) < SEM_GERACAO_POTENCIA_W) {
        novoEstado = "sem_geracao";
      } else {
        novoEstado = "normal";
      }
    }

    try {
      if (novoEstado !== usina.estado_atual) {
        await supabaseAdmin
          .from("mon_usinas")
          .update({ estado_atual: novoEstado, estado_atualizado_em: new Date().toISOString() })
          .eq("id", usina.id);
        await atualizarChamado(usina.id, novoEstado);
        atualizadas++;
      } else if (novoEstado !== "normal") {
        // Estado persistente (ex.: offline há dias) — atualiza só o
        // carimbo de "última checagem" pro painel saber que não ficou parado.
        await supabaseAdmin
          .from("mon_usinas")
          .update({ estado_atualizado_em: new Date().toISOString() })
          .eq("id", usina.id);
      }
    } catch (e) {
      erros.push(`Avaliação de estado ${usina.id}: ${e instanceof Error ? e.message : e}`);
    }
  }

  return { atualizadas, erros };
}

// ---------- handler ----------
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await autorizarChamada(req);
  if (!auth.ok) return json({ error: auth.motivo }, 401);

  // Cada marca falha isolada — uma falhar não impede a outra de coletar.
  // Solarman/SofarCloud/Hoymiles entram como mais um bloco igual a estes,
  // sem afetar o que já funciona.
  const { leituras: leiturasFoxess, erros: errosFoxess } = await coletarFoxess();
  const { leituras: leiturasSolis, erros: errosSolis } = await coletarSolis();
  const leituras = [...leiturasFoxess, ...leiturasSolis];
  const errosColeta = [...errosFoxess, ...errosSolis];
  const { gravadas, erros: errosGravacao } = await gravarLeituras(leituras);
  const { atualizadas: estadosAtualizados, erros: errosEstado } = await avaliarEstados();

  return json({
    usinas_processadas: leituras.length,
    leituras_gravadas: gravadas,
    estados_atualizados: estadosAtualizados,
    erros: [...errosColeta, ...errosGravacao, ...errosEstado],
  });
});
