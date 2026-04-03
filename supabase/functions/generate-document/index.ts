import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEMPLATE_IDS: Record<string, string> = {
  contrato: "1HY68Im2Gn5--KqEbt3qO5aHv9zFLYDrN",
};

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function numberToPortugueseExtensive(n: number): string {
  if (n === 0) return "zero reais";
  const units = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
  const teens = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
  const tens = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const hundreds = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

  function group(num: number): string {
    if (num === 0) return "";
    if (num === 100) return "cem";
    const parts: string[] = [];
    const h = Math.floor(num / 100);
    const remainder = num % 100;
    if (h > 0) parts.push(hundreds[h]);
    if (remainder >= 10 && remainder < 20) {
      parts.push(teens[remainder - 10]);
    } else {
      const t = Math.floor(remainder / 10);
      const u = remainder % 10;
      if (t > 0) parts.push(tens[t]);
      if (u > 0) parts.push(units[u]);
    }
    return parts.join(" e ");
  }

  const intPart = Math.floor(n);
  const centavos = Math.round((n - intPart) * 100);

  const milhares = Math.floor(intPart / 1000);
  const resto = intPart % 1000;

  const chunks: string[] = [];
  if (milhares > 0) {
    if (milhares === 1) {
      chunks.push("mil");
    } else {
      chunks.push(group(milhares) + " mil");
    }
  }
  if (resto > 0) {
    chunks.push(group(resto));
  }

  let result = chunks.join(" e ");
  result += intPart === 1 ? " real" : " reais";

  if (centavos > 0) {
    result += " e " + group(centavos) + (centavos === 1 ? " centavo" : " centavos");
  }

  return result;
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toBase64Url(input: string | ArrayBuffer): string {
  let b64: string;
  if (typeof input === "string") {
    b64 = input;
  } else {
    b64 = btoa(String.fromCharCode(...new Uint8Array(input)));
  }
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getGoogleAccessToken(serviceAccount: { client_email: string; private_key: string }, impersonateEmail?: string): Promise<string> {
  const header = toBase64Url(btoa(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const now = Math.floor(Date.now() / 1000);
  const claimSet: Record<string, unknown> = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/documents",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  if (impersonateEmail) {
    claimSet.sub = impersonateEmail;
  }
  const claim = toBase64Url(btoa(JSON.stringify(claimSet)));

  // Import private key and sign JWT
  const pemContents = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureInput = new TextEncoder().encode(`${header}.${claim}`);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, signatureInput);
  const sig = toBase64Url(signature);

  const jwt = `${header}.${claim}.${sig}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Failed to get Google access token: ${errText}`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { projeto_id, tipo_documento } = await req.json();
    if (!projeto_id || !tipo_documento) {
      return new Response(JSON.stringify({ error: "projeto_id e tipo_documento são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const templateId = TEMPLATE_IDS[tipo_documento];
    if (!templateId) {
      return new Response(JSON.stringify({ error: `Tipo de documento "${tipo_documento}" não suportado` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get service account from secrets
    const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT");
    if (!serviceAccountJson) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT não configurada");
    }
    const serviceAccount = JSON.parse(serviceAccountJson);

    // Get project data from Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: projeto, error: projetoError } = await supabase
      .from("projetos")
      .select("*, equipamentos_placas(marca, modelo, potencia_wp), equipamentos_inversores(marca, modelo, potencia_kw)")
      .eq("id", projeto_id)
      .single();

    if (projetoError || !projeto) {
      return new Response(JSON.stringify({ error: "Projeto não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Google access token
    const accessToken = await getGoogleAccessToken(serviceAccount, "contato@treslagoassolar.com.br");

    // Parse date parts
    const dataFechamento = projeto.data_fechamento
      ? new Date(projeto.data_fechamento + "T12:00:00")
      : new Date();
    const dia = String(dataFechamento.getDate()).padStart(2, "0");
    const mes = MESES[dataFechamento.getMonth()];
    const ano = String(dataFechamento.getFullYear());

    // Get equipment info
    const placa = projeto.equipamentos_placas;
    const inversor = projeto.equipamentos_inversores;

    const marcaInversor = projeto.marca_inversor || inversor?.marca || "";
    const modeloInversor = projeto.potencia_inversor
      ? (inversor?.modelo || projeto.marca_inversor || marcaInversor)
      : (inversor?.modelo || marcaInversor);
    const potenciaInversor = projeto.potencia_inversor || (inversor?.potencia_kw ? String(inversor.potencia_kw) : "");

    const marcaPlaca = projeto.marca_placa || placa?.marca || "";
    const modeloPlaca = placa?.modelo || projeto.marca_placa || marcaPlaca;
    const potenciaPlaca = projeto.potencia_placa || (placa?.potencia_wp ? String(placa.potencia_wp) : "");

    const precoVenda = Number(projeto.preco_venda) || 0;
    const geracaoMensal = Number(projeto.geracao_estimada_kwh) || 0;

    // Build variables map
    const variables: Record<string, string> = {
      "{{nome_completo}}": projeto.nome_completo || projeto.razao_social || "",
      "{{cpf}}": projeto.cpf || "",
      "{{endereco_completo}}": projeto.endereco_completo || "",
      "{{dia}}": dia,
      "{{mes}}": mes,
      "{{ano}}": ano,
      "{{marca_inversor}}": marcaInversor,
      "{{modelo_inversor}}": modeloInversor || marcaInversor,
      "{{potencia_inversor}}": potenciaInversor ? `${potenciaInversor} kW` : "",
      "{{qtd_inversores}}": projeto.qtd_inversores ? String(projeto.qtd_inversores) : "",
      "{{marca_placa}}": marcaPlaca,
      "{{modelo_placa}}": modeloPlaca || marcaPlaca,
      "{{potencia_placa}}": potenciaPlaca ? `${potenciaPlaca} W` : "",
      "{{qtd_placas}}": projeto.qtd_placas ? String(projeto.qtd_placas) : "",
      "{{ug_cep}}": projeto.unidade_geradora_cep || "",
      "{{ug_endereco}}": projeto.unidade_geradora_endereco || "",
      "{{ug_padrao}}": projeto.unidade_geradora_padrao || "",
      "{{ug_codigo_uc}}": projeto.unidade_geradora_codigo_uc || "",
      "{{ub1_cep}}": projeto.unidade_beneficiaria1_cep || "",
      "{{ub1_endereco}}": projeto.unidade_beneficiaria1_endereco || "",
      "{{ub1_percentual}}": projeto.unidade_beneficiaria1_percentual ? String(projeto.unidade_beneficiaria1_percentual) : "",
      "{{ub1_codigo_uc}}": projeto.unidade_beneficiaria1_codigo_uc || "",
      "{{ub2_cep}}": projeto.unidade_beneficiaria2_cep || "",
      "{{ub2_endereco}}": projeto.unidade_beneficiaria2_endereco || "",
      "{{ub2_percentual}}": projeto.unidade_beneficiaria2_percentual ? String(projeto.unidade_beneficiaria2_percentual) : "",
      "{{ub2_codigo_uc}}": projeto.unidade_beneficiaria2_codigo_uc || "",
      "{{preco_venda}}": precoVenda ? formatBRL(precoVenda) : "",
      "{{preco_venda_extenso}}": precoVenda ? numberToPortugueseExtensive(precoVenda) : "",
      "{{forma_pagamento}}": projeto.forma_pagamento || "",
      "{{geracao_anual}}": geracaoMensal ? String(Math.round(geracaoMensal * 12)) : "",
      "{{geracao_mensal}}": geracaoMensal ? String(geracaoMensal) : "",
      "{{concessionaria}}": projeto.concessionaria || "",
      "{{unidade_consumidora}}": projeto.unidade_geradora_codigo_uc || "",
    };

    const clientName = (projeto.nome_completo || projeto.razao_social || "cliente")
      .replace(/[^a-zA-Z0-9À-ÿ\s]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 40);
    const today = new Date().toISOString().split("T")[0];
    const copyName = `Contrato_${clientName}_${today}`;

    // 1. Get template's parent folder
    const templateMeta = await fetch(
      `https://www.googleapis.com/drive/v3/files/${templateId}?fields=parents&supportsAllDrives=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const templateMetaData = templateMeta.ok ? await templateMeta.json() : {};
    const parents = templateMetaData.parents || [];

    // 2. Copy the template into the same folder
    const copyRes = await fetch(`https://www.googleapis.com/drive/v3/files/${templateId}/copy?supportsAllDrives=true`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: copyName, ...(parents.length > 0 ? { parents } : {}) }),
    });

    if (!copyRes.ok) {
      const errText = await copyRes.text();
      throw new Error(`Erro ao copiar template: ${errText}`);
    }

    const copyData = await copyRes.json();
    const copyId = copyData.id;

    try {
      // 2. Replace variables using Google Docs API
      const requests = Object.entries(variables).map(([key, value]) => ({
        replaceAllText: {
          containsText: { text: key, matchCase: true },
          replaceText: value,
        },
      }));

      const batchRes = await fetch(`https://docs.googleapis.com/v1/documents/${copyId}:batchUpdate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requests }),
      });

      if (!batchRes.ok) {
        const errText = await batchRes.text();
        throw new Error(`Erro ao substituir variáveis: ${errText}`);
      }

      // 3. Export as PDF
      const pdfRes = await fetch(`https://www.googleapis.com/drive/v3/files/${copyId}/export?mimeType=application/pdf`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!pdfRes.ok) {
        const errText = await pdfRes.text();
        throw new Error(`Erro ao exportar PDF: ${errText}`);
      }

      const pdfBuffer = await pdfRes.arrayBuffer();

      // 4. Delete the temporary copy
      await fetch(`https://www.googleapis.com/drive/v3/files/${copyId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      return new Response(pdfBuffer, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${copyName}.pdf"`,
        },
      });
    } catch (err) {
      // Cleanup: delete copy on error
      try {
        await fetch(`https://www.googleapis.com/drive/v3/files/${copyId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      } catch (_) { /* ignore cleanup errors */ }
      throw err;
    }
  } catch (error) {
    console.error("generate-document error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
