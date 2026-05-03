import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ev-admin-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const ADMIN_SECRET = Deno.env.get("EV_ADMIN_JWT_SECRET") || "change-me-please-now";

// ---------- helpers ----------
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function err(message: string, status = 400) {
  return json({ error: message }, status);
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function b64url(s: string) {
  return btoa(s).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function b64urlDecode(s: string) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return atob(s);
}

async function signToken(payload: any): Promise<string> {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const sig = await sha256(data + ADMIN_SECRET);
  return `${data}.${sig}`;
}
async function verifyToken(token: string): Promise<any | null> {
  try {
    const [h, b, s] = token.split(".");
    if (!h || !b || !s) return null;
    const expected = await sha256(`${h}.${b}` + ADMIN_SECRET);
    if (expected !== s) return null;
    const payload = JSON.parse(b64urlDecode(b));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");

async function checkClient(indicador_id: string, cpf: string) {
  const { data } = await supabase
    .from("energia_indicadores")
    .select("id, cpf")
    .eq("id", indicador_id)
    .maybeSingle();
  if (!data) return null;
  if (onlyDigits(data.cpf) !== onlyDigits(cpf)) return null;
  return data;
}

async function checkAdmin(req: Request) {
  const token = req.headers.get("x-ev-admin-token");
  if (!token) return null;
  return await verifyToken(token);
}

async function recalcEtapa(indicador_id: string) {
  const { data: ind } = await supabase
    .from("energia_indicadores").select("pontos_acumulados").eq("id", indicador_id).maybeSingle();
  if (!ind) return;
  const { data: etapas } = await supabase
    .from("energia_etapas").select("nome, pontos_minimos").order("pontos_minimos", { ascending: true });
  if (!etapas) return;
  let etapa = etapas[0]?.nome || null;
  for (const e of etapas) if (ind.pontos_acumulados >= e.pontos_minimos) etapa = e.nome;
  await supabase.from("energia_indicadores").update({ etapa_atual: etapa }).eq("id", indicador_id);
}

async function getConfig(chave: string) {
  const { data } = await supabase.from("energia_config").select("valor").eq("chave", chave).maybeSingle();
  return data?.valor;
}

// ---------- handler ----------
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let payload: any;
  try { payload = await req.json(); } catch { return err("Invalid JSON"); }
  const action: string = payload.action;
  if (!action) return err("Missing action");

  try {
    // ===== PUBLIC =====
    if (action === "login_cliente") {
      const cpf = onlyDigits(payload.cpf);
      const data_nascimento = payload.data_nascimento;
      if (!cpf || !data_nascimento) return err("CPF e data de nascimento obrigatórios");
      const { data } = await supabase
        .from("energia_indicadores")
        .select("*")
        .eq("cpf", cpf)
        .eq("data_nascimento", data_nascimento)
        .maybeSingle();
      if (!data) return err("Cliente não encontrado. Entre em contato com a empresa.", 404);
      await supabase.from("energia_indicadores").update({ ultimo_acesso: new Date().toISOString() }).eq("id", data.id);
      return json({ indicador: data });
    }

    if (action === "cadastro_publico") {
      const nome = (payload.nome || "").trim();
      const cpf = onlyDigits(payload.cpf);
      const data_nascimento = payload.data_nascimento;
      const telefone = (payload.telefone || "").trim();
      const email = (payload.email || "").trim();
      const eh_cliente = !!payload.eh_cliente;
      if (!nome || !cpf || !data_nascimento || !telefone) return err("Preencha nome, CPF, data de nascimento e telefone");
      if (cpf.length !== 11) return err("CPF inválido");
      const { data: existente } = await supabase.from("energia_indicadores").select("id").eq("cpf", cpf).maybeSingle();
      if (existente) return err("Já existe cadastro com este CPF. Faça login.", 409);
      const { data, error } = await supabase.from("energia_indicadores")
        .insert({ nome, cpf, data_nascimento, telefone, email: email || null, eh_cliente })
        .select().maybeSingle();
      if (error) return err(error.message);
      await recalcEtapa(data.id);
      return json({ indicador: data });
    }

    // Helper: dispara webhook Kommo de NOVA indicação
    async function fireKommoNew(ind: any, indicacao: any) {
      const webhook = await getConfig("webhook_kommo_url");
      if (!webhook || typeof webhook !== "string") return;
      try {
        await fetch(webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            evento: "nova_indicacao",
            tag: "indicação",
            indicador: { nome: ind.nome, telefone: ind.telefone, cpf: ind.cpf },
            indicado: {
              nome: indicacao.nome_indicado,
              telefone: indicacao.telefone_indicado,
              email: indicacao.email_indicado,
              cidade: indicacao.cidade,
              observacao: indicacao.observacao_indicador,
            },
          }),
        });
      } catch (e) { console.error("Webhook Kommo new failed", e); }
    }

    if (action === "captar_indicacao") {
      const codigo = payload.codigo_link;
      const { nome, telefone, email, cidade, observacao } = payload;
      if (!codigo || !nome) return err("Dados incompletos");
      const { data: ind } = await supabase
        .from("energia_indicadores").select("*").eq("codigo_link", codigo).maybeSingle();
      if (!ind) return err("Link inválido", 404);
      const { data: novaInd } = await supabase.from("energia_indicacoes").insert({
        indicador_id: ind.id,
        nome_indicado: nome,
        telefone_indicado: telefone || null,
        email_indicado: email || null,
        cidade: cidade || null,
        observacao_indicador: observacao || null,
        status: "enviada",
      }).select().maybeSingle();
      await fireKommoNew(ind, novaInd);
      return json({ ok: true });
    }

    // ===== CLIENT (precisa de indicador_id + cpf) =====
    if (action.startsWith("cliente_")) {
      const cliente = await checkClient(payload.indicador_id, payload.cpf);
      if (!cliente) return err("Sessão inválida", 401);

      if (action === "cliente_dashboard") {
        const [{ data: ind }, { data: etapas }, { data: premios }, { data: indicacoes }, { data: resgates }, { data: ranking }] = await Promise.all([
          supabase.from("energia_indicadores").select("*").eq("id", cliente.id).maybeSingle(),
          supabase.from("energia_etapas").select("*").order("ordem"),
          supabase.from("energia_premios").select("*").eq("ativo", true).order("pontos_necessarios"),
          supabase.from("energia_indicacoes").select("*").eq("indicador_id", cliente.id).order("criado_em", { ascending: false }),
          supabase.from("energia_resgates").select("*, energia_premios(nome, imagem_url)").eq("indicador_id", cliente.id).order("solicitado_em", { ascending: false }),
          supabase.from("energia_indicadores").select("id, nome, pontos_acumulados, etapa_atual").eq("aparece_ranking", true).order("pontos_acumulados", { ascending: false }).limit(10),
        ]);
        const fechadas = (indicacoes || []).filter((i: any) => i.status === "fechada");
        const volume = fechadas.reduce((acc: number, i: any) => acc + Number(i.valor_negocio || 0), 0);
        return json({ indicador: ind, etapas, premios, indicacoes, resgates, ranking, stats: { fechadas: fechadas.length, volume } });
      }

      if (action === "cliente_resgatar") {
        const premio_id = payload.premio_id;
        const { data: premio } = await supabase.from("energia_premios").select("*").eq("id", premio_id).maybeSingle();
        if (!premio) return err("Prêmio não encontrado", 404);
        const { data: ind } = await supabase.from("energia_indicadores").select("pontos_acumulados").eq("id", cliente.id).maybeSingle();
        if (!ind || ind.pontos_acumulados < premio.pontos_necessarios) return err("Pontos insuficientes");
        await supabase.from("energia_resgates").insert({
          indicador_id: cliente.id, premio_id, pontos_utilizados: premio.pontos_necessarios, status: "pendente",
        });
        await supabase.from("energia_indicadores").update({ pontos_acumulados: ind.pontos_acumulados - premio.pontos_necessarios }).eq("id", cliente.id);
        await recalcEtapa(cliente.id);
        const msg = await getConfig("mensagem_resgate");
        return json({ ok: true, mensagem: msg });
      }

      if (action === "cliente_criar_indicacao") {
        const { nome, telefone, cidade, observacao } = payload;
        if (!nome || !telefone) return err("Nome e telefone obrigatórios");
        const { data: indFull } = await supabase.from("energia_indicadores").select("*").eq("id", cliente.id).maybeSingle();
        // Idempotência: mesma indicação (telefone) criada nos últimos 30s
        const since = new Date(Date.now() - 30_000).toISOString();
        const telDigits = onlyDigits(telefone);
        const { data: recentes } = await supabase.from("energia_indicacoes")
          .select("*").eq("indicador_id", cliente.id).gte("criado_em", since);
        let novaInd = (recentes || []).find((r: any) => onlyDigits(r.telefone_indicado || "") === telDigits);
        if (!novaInd) {
          const { data: inserted } = await supabase.from("energia_indicacoes").insert({
            indicador_id: cliente.id,
            nome_indicado: nome,
            telefone_indicado: telefone,
            cidade: cidade || null,
            observacao_indicador: observacao || null,
            status: "enviada",
          }).select().maybeSingle();
          novaInd = inserted;
          await fireKommoNew(indFull, novaInd);
        }
        const tpl = (await getConfig("mensagem_whatsapp_indicado")) as string | undefined;
        const msg = (tpl || "Oi! Você foi indicado(a) por {indicador} para conhecer a Três Lagoas Solar.")
          .replace("{indicador}", indFull?.nome || "");
        const wa = `https://wa.me/55${telDigits}?text=${encodeURIComponent(msg)}`;
        return json({ ok: true, indicacao: novaInd, whatsapp_url: wa });
      }
    }
    if (action === "login_admin") {
      const { usuario, senha } = payload;
      if (!usuario || !senha) return err("Credenciais obrigatórias");
      const { data } = await supabase.from("energia_admins").select("*").eq("usuario", usuario).eq("ativo", true).maybeSingle();
      if (!data) return err("Usuário ou senha inválidos", 401);
      const hash = "sha256:" + await sha256(senha);
      if (hash !== data.senha_hash) return err("Usuário ou senha inválidos", 401);
      const token = await signToken({ sub: data.id, nome: data.nome, exp: Math.floor(Date.now()/1000) + 8*3600 });
      return json({ token, admin: { id: data.id, nome: data.nome, usuario: data.usuario } });
    }

    // ===== ADMIN ACTIONS =====
    if (action.startsWith("admin_")) {
      const admin = await checkAdmin(req);
      if (!admin) return err("Não autorizado", 401);

      if (action === "admin_overview") {
        const inicioMesIso = (() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d.toISOString(); })();
        const [{ data: indicadores }, { data: indicacoes }, { data: resgates }, { data: pontosMes }] = await Promise.all([
          supabase.from("energia_indicadores").select("id, ultimo_acesso"),
          supabase.from("energia_indicacoes").select("status, valor_negocio, criado_em"),
          supabase.from("energia_resgates").select("status").eq("status", "pendente"),
          supabase.from("energia_pontos_log").select("pontos").gte("criado_em", inicioMesIso),
        ]);
        const pontos_mes = (pontosMes || []).reduce((a: number, p: any) => a + Number(p.pontos || 0), 0);
        const total = indicadores?.length || 0;
        const ativos = (indicadores || []).filter((i: any) => i.ultimo_acesso).length;
        const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0,0,0,0);
        const doMes = (indicacoes || []).filter((i: any) => new Date(i.criado_em) >= inicioMes);
        const enviadas = doMes.filter((i: any) => i.status === "enviada").length;
        const negociacao = doMes.filter((i: any) => i.status === "negociacao").length;
        const fechadas = doMes.filter((i: any) => i.status === "fechada").length;
        const volume = (indicacoes || []).filter((i: any) => i.status === "fechada").reduce((a: number, i: any) => a + Number(i.valor_negocio||0), 0);
        // gráfico mensal últimos 6 meses
        const grafico: any[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(); d.setMonth(d.getMonth() - i); d.setDate(1); d.setHours(0,0,0,0);
          const next = new Date(d); next.setMonth(next.getMonth()+1);
          const count = (indicacoes || []).filter((x: any) => { const dt = new Date(x.criado_em); return dt >= d && dt < next; }).length;
          grafico.push({ mes: d.toLocaleDateString("pt-BR", { month: "short" }), indicacoes: count });
        }
        return json({ stats: { total, ativos, enviadas, negociacao, fechadas, volume, pontos_mes, resgates_pendentes: resgates?.length || 0 }, grafico });
      }

      if (action === "admin_list") {
        const t = payload.tabela;
        const allowed = ["energia_premios","energia_etapas","energia_campanhas","energia_indicadores","energia_indicacoes","energia_resgates","energia_config","energia_pontos_log"];
        if (!allowed.includes(t)) return err("Tabela não permitida");
        let q: any = supabase.from(t).select(payload.select || "*");
        if (t === "energia_premios" || t === "energia_etapas") q = q.order("ordem");
        else if (t === "energia_indicacoes") q = q.order("criado_em", { ascending: false });
        else if (t === "energia_resgates") q = q.order("solicitado_em", { ascending: false });
        const { data, error } = await q;
        if (error) return err(error.message);
        return json({ data });
      }

      if (action === "admin_upsert") {
        const t = payload.tabela;
        const row = payload.row;
        const allowed = ["energia_premios","energia_etapas","energia_campanhas","energia_indicadores","energia_config"];
        if (!allowed.includes(t)) return err("Tabela não permitida");
        const onConflict = t === "energia_config" ? "chave" : "id";
        const { data, error } = await supabase.from(t).upsert(row, { onConflict }).select();
        if (error) return err(error.message);
        return json({ data });
      }

      if (action === "admin_delete") {
        const t = payload.tabela;
        const id = payload.id;
        const allowed = ["energia_premios","energia_etapas","energia_campanhas","energia_indicadores","energia_indicacoes"];
        if (!allowed.includes(t)) return err("Tabela não permitida");
        const { error } = await supabase.from(t).delete().eq("id", id);
        if (error) return err(error.message);
        return json({ ok: true });
      }

      if (action === "admin_add_pontos") {
        const { indicador_id, pontos, motivo } = payload;
        const { data: ind } = await supabase.from("energia_indicadores").select("pontos_acumulados").eq("id", indicador_id).maybeSingle();
        if (!ind) return err("Indicador não encontrado", 404);
        const novo = ind.pontos_acumulados + Number(pontos);
        await supabase.from("energia_indicadores").update({ pontos_acumulados: novo }).eq("id", indicador_id);
        await supabase.from("energia_pontos_log").insert({ indicador_id, pontos: Number(pontos), motivo, admin_id: admin.sub });
        await recalcEtapa(indicador_id);
        return json({ ok: true, pontos_acumulados: novo });
      }

      if (action === "admin_update_indicacao_status") {
        const { id, status, valor_negocio, num_placas } = payload;
        const { data: ind } = await supabase.from("energia_indicacoes").select("*").eq("id", id).maybeSingle();
        if (!ind) return err("Indicação não encontrada", 404);
        const updates: any = { status };
        if (typeof valor_negocio === "number") updates.valor_negocio = valor_negocio;
        if (typeof num_placas === "number") updates.num_placas = num_placas;

        if (status === "fechada" && ind.status !== "fechada") {
          const modo = (await getConfig("modo_pontuacao")) || "placas";
          const placas = Number(num_placas ?? ind.num_placas ?? 0);
          const valor = Number(valor_negocio ?? ind.valor_negocio ?? 0);
          const { data: campanhas } = await supabase.from("energia_campanhas")
            .select("multiplicador").eq("ativa", true)
            .lte("inicio", new Date().toISOString().slice(0,10))
            .gte("fim", new Date().toISOString().slice(0,10));
          const mult = campanhas && campanhas.length ? Math.max(...campanhas.map((c: any) => Number(c.multiplicador))) : 1;
          let pontos = 0;
          if (modo === "placas") {
            const ppp = Number(await getConfig("pontos_por_placa") || 1);
            pontos = Math.round(placas * ppp * mult);
          } else {
            const pontosBase = Number(await getConfig("pontos_padrao_indicacao") || 100);
            const bonusMin = Number(await getConfig("bonus_valor_minimo") || 0);
            const bonusPts = Number(await getConfig("bonus_pontos") || 0);
            pontos = Math.round(pontosBase * mult + (valor >= bonusMin && bonusMin > 0 ? bonusPts : 0));
          }
          updates.pontos_creditados = pontos;
          updates.fechada_em = new Date().toISOString();

          const { data: indicador } = await supabase.from("energia_indicadores").select("*").eq("id", ind.indicador_id).maybeSingle();
          if (indicador) {
            await supabase.from("energia_indicadores").update({ pontos_acumulados: indicador.pontos_acumulados + pontos }).eq("id", indicador.id);
            await supabase.from("energia_pontos_log").insert({
              indicador_id: indicador.id, pontos, motivo: `Indicação fechada: ${ind.nome_indicado || "sem nome"} (${placas} placas)`, admin_id: admin.sub,
            });
            await recalcEtapa(indicador.id);

            const webhook = await getConfig("webhook_kommo_url");
            if (webhook && typeof webhook === "string") {
              try {
                await fetch(webhook, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    evento: "indicacao_fechada",
                    indicador: { nome: indicador.nome, cpf: indicador.cpf, telefone: indicador.telefone },
                    indicado: { nome: ind.nome_indicado, telefone: ind.telefone_indicado, email: ind.email_indicado, cidade: ind.cidade },
                    pontos, num_placas: placas, valor_negocio: valor,
                  }),
                });
              } catch (e) { console.error("Webhook Kommo failed", e); }
            }
          }
        }
        await supabase.from("energia_indicacoes").update(updates).eq("id", id);
        return json({ ok: true });
      }

      if (action === "admin_upload_premio_image") {
        const { filename, content_base64, content_type } = payload;
        if (!filename || !content_base64) return err("Arquivo obrigatório");
        const bin = Uint8Array.from(atob(content_base64), c => c.charCodeAt(0));
        const path = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("energia-premios")
          .upload(path, bin, { contentType: content_type || "image/png", upsert: true });
        if (upErr) return err(upErr.message);
        const { data: pub } = supabase.storage.from("energia-premios").getPublicUrl(path);
        return json({ url: pub.publicUrl });
      }

      if (action === "admin_confirmar_entrega") {
        await supabase.from("energia_resgates").update({ status: "entregue", entregue_em: new Date().toISOString() }).eq("id", payload.id);
        return json({ ok: true });
      }

      if (action === "admin_create_indicador") {
        const { nome, cpf, data_nascimento, telefone, email } = payload;
        if (!nome || !cpf || !data_nascimento) return err("Dados obrigatórios");
        const { data, error } = await supabase.from("energia_indicadores")
          .insert({ nome, cpf: onlyDigits(cpf), data_nascimento, telefone, email })
          .select().maybeSingle();
        if (error) return err(error.message);
        await recalcEtapa(data.id);
        return json({ data });
      }

      if (action === "admin_cliente_detalhe") {
        const id = payload.id;
        const [{ data: ind }, { data: indicacoes }, { data: resgates }, { data: log }] = await Promise.all([
          supabase.from("energia_indicadores").select("*").eq("id", id).maybeSingle(),
          supabase.from("energia_indicacoes").select("*").eq("indicador_id", id).order("criado_em", { ascending: false }),
          supabase.from("energia_resgates").select("*, energia_premios(nome)").eq("indicador_id", id).order("solicitado_em", { ascending: false }),
          supabase.from("energia_pontos_log").select("*").eq("indicador_id", id).order("criado_em", { ascending: false }),
        ]);
        return json({ indicador: ind, indicacoes, resgates, log });
      }

      if (action === "admin_reorder_premios") {
        const ids: string[] = payload.ids || [];
        for (let i = 0; i < ids.length; i++) {
          await supabase.from("energia_premios").update({ ordem: i }).eq("id", ids[i]);
        }
        return json({ ok: true });
      }
    }

    return err("Ação desconhecida: " + action, 404);
  } catch (e) {
    console.error(e);
    return err((e as Error).message, 500);
  }
});
