import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function err(message: string, status = 400) {
  return json({ error: message }, status);
}

// Labels dos fluxos (espelho de src/lib/rastreamentoEtapas.ts)
const FLUXOS: Record<number, { titulo: string; icone: string; etapas: Record<number, string> }> = {
  1: { titulo: "Homologação", icone: "📄", etapas: { 1: "Documentação recebida", 2: "Projeto protocolado", 3: "Projeto aprovado", 4: "Projeto aprovado com troca" } },
  2: { titulo: "Equipamentos", icone: "📦", etapas: { 1: "Pedido de compra realizado", 2: "Equipamento pago", 3: "Em transporte", 4: "Material entregue" } },
  3: { titulo: "Instalação", icone: "⚡", etapas: { 1: "Aguardando instalação", 2: "Instalação agendada", 3: "Instalação finalizada", 4: "Explicar funcionamento, chaves de segurança, DPS e afins", 5: "Conectar logger no WiFi", 6: "Criar planta no monitoramento", 7: "Adicionar datalogger", 8: "Apresentar app de monitoramento ao cliente" } },
};

async function getProjetoByCodigo(codigo: string) {
  const { data } = await supabase
    .from("projetos")
    .select("id, nome_completo, razao_social, codigo_rastreamento")
    .eq("codigo_rastreamento", codigo)
    .maybeSingle();
  return data;
}

async function handleGet(codigo: string) {
  const projeto = await getProjetoByCodigo(codigo);
  if (!projeto) return err("Projeto não encontrado", 404);

  const { data: rows } = await supabase
    .from("rastreamento_obras")
    .select("fluxo, etapa, concluido, data_conclusao, visivel_cliente, campo_extra")
    .eq("projeto_id", projeto.id)
    .order("fluxo")
    .order("etapa");

  const visiveis = (rows || []).filter((r: any) => {
    if (!r.visivel_cliente) return false;
    // etapa condicional (fluxo 1 etapa 4) só aparece se ativada
    if (r.fluxo === 1 && r.etapa === 4 && !(r.campo_extra?.ativada)) return false;
    return true;
  });

  // Monta fluxos para o cliente
  const fluxos = [1, 2, 3].map((f) => {
    const etapas = visiveis
      .filter((r: any) => r.fluxo === f)
      .map((r: any) => ({
        etapa: r.etapa,
        titulo: FLUXOS[f].etapas[r.etapa],
        concluido: r.concluido,
        data_conclusao: r.data_conclusao,
        campo_extra: r.campo_extra || {},
      }));
    return { fluxo: f, titulo: FLUXOS[f].titulo, icone: FLUXOS[f].icone, etapas };
  }).filter((fl) => fl.etapas.length > 0);

  const sistemaOperacao = (rows || []).some(
    (r: any) => r.fluxo === 3 && r.etapa === 3 && r.concluido
  );

  // Tarefas de pós-venda visíveis ao cliente
  const { data: posvendaRows } = await supabase
    .from("tarefas_posvenda")
    .select("descricao, tipo, data_programada, concluido")
    .eq("projeto_id", projeto.id)
    .eq("visivel_cliente", true)
    .order("data_programada");

  const posvenda = (posvendaRows || []).map((t: any) => ({
    descricao: t.descricao,
    tipo: t.tipo,
    data_programada: t.data_programada,
    concluido: t.concluido,
  }));

  const { data: avaliacao } = await supabase
    .from("avaliacoes_clientes")
    .select("nota, comentario")
    .eq("projeto_id", projeto.id)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  return json({
    nome: projeto.nome_completo || projeto.razao_social || "Cliente",
    fluxos,
    posvenda,
    sistema_operacao: sistemaOperacao,
    avaliacao: avaliacao || null,
  });
}

async function handleAvaliar(codigo: string, nota: number, comentario: string | null) {
  if (!Number.isInteger(nota) || nota < 1 || nota > 5) return err("Nota inválida");
  const projeto = await getProjetoByCodigo(codigo);
  if (!projeto) return err("Projeto não encontrado", 404);

  const { error } = await supabase.from("avaliacoes_clientes").insert({
    projeto_id: projeto.id,
    nota,
    comentario: comentario?.trim() || null,
  });
  if (error) return err(error.message, 500);
  return json({ ok: true });
}

async function handleConfig() {
  const { data } = await supabase
    .from("configuracoes")
    .select("chave, valor")
    .in("chave", ["rastreamento_google_link", "rastreamento_indicacao_texto"]);

  const map: Record<string, any> = {};
  for (const row of data || []) map[(row as any).chave] = (row as any).valor;

  return json({
    google_link: map["rastreamento_google_link"] || "",
    indicacao_texto: map["rastreamento_indicacao_texto"] ||
      "Indique um amigo e ganhe benefícios enquanto ele economiza na conta de luz.",
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    switch (action) {
      case "get":
        if (!body.codigo) return err("Código obrigatório");
        return await handleGet(String(body.codigo));
      case "avaliar":
        if (!body.codigo) return err("Código obrigatório");
        return await handleAvaliar(String(body.codigo), Number(body.nota), body.comentario ?? null);
      case "config":
        return await handleConfig();
      default:
        return err("Ação inválida");
    }
  } catch (e) {
    return err(String(e), 500);
  }
});
