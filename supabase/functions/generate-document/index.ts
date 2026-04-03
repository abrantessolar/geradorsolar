import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEMPLATE_IDS: Record<string, string> = {
  contrato: "1HY68Im2Gn5--KqEbt3qO5aHv9zFLYDrN",
  procuracao_elektro_pf: "1no4aUjWi0UPfOKGqDdLIO7iVfXG7dulS",
  procuracao_elektro_pj: "1Ak2z8JyHwRLMYG9hUdf3jMqoK2eUgpDO",
  procuracao_copel: "1VTAKZTCBlYDpqLI6bRQe51kVu5nt7Url",
  procuracao_energisa: "14v7d237tgvvL19K_wqXkPUui7Ap8LPTT",
};

const DOC_LABELS: Record<string, string> = {
  contrato: "Contrato",
  procuracao_elektro_pf: "Procuracao_Elektro_PF",
  procuracao_elektro_pj: "Procuracao_Elektro_PJ",
  procuracao_copel: "Procuracao_COPEL",
  procuracao_energisa: "Procuracao_Energisa",
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
    chunks.push(milhares === 1 ? "mil" : group(milhares) + " mil");
  }
  if (resto > 0) chunks.push(group(resto));

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
  if (impersonateEmail) claimSet.sub = impersonateEmail;
  const claim = toBase64Url(btoa(JSON.stringify(claimSet)));

  const pemContents = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
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
  return (await tokenRes.json()).access_token;
}

function buildVariables(projeto: any, tipoDocumento: string): Record<string, string> {
  const dataFechamento = projeto.data_fechamento
    ? new Date(projeto.data_fechamento + "T12:00:00")
    : new Date();
  const dia = String(dataFechamento.getDate()).padStart(2, "0");
  const mes = MESES[dataFechamento.getMonth()];
  const ano = String(dataFechamento.getFullYear());

  // Build endereco_completo from parts
  const enderecoCompleto = [
    projeto.logradouro,
    projeto.bairro,
    projeto.cidade && projeto.estado ? `${projeto.cidade}/${projeto.estado}` : projeto.cidade || projeto.estado,
    projeto.cep ? `CEP: ${projeto.cep}` : '',
  ].filter(Boolean).join(', ') || projeto.endereco_completo || '';

  // Common variables for all document types
  const vars: Record<string, string> = {
    "{{nome_completo}}": projeto.nome_completo || projeto.razao_social || "",
    "{{cpf}}": projeto.cpf || "",
    "{{endereco_completo}}": enderecoCompleto,
    "{{cep}}": projeto.unidade_geradora_cep || projeto.cep || "",
    "{{unidade_consumidora}}": projeto.unidade_geradora_codigo_uc || "",
    "{{dia}}": dia,
    "{{mes}}": mes,
    "{{ano}}": ano,
    "{{concessionaria}}": projeto.concessionaria || "",
  };

  if (tipoDocumento === "contrato") {
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

    Object.assign(vars, {
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
    });
  }

  if (tipoDocumento === "procuracao_elektro_pj") {
    Object.assign(vars, {
      "{{razao_social}}": projeto.razao_social || "",
      "{{cnpj}}": projeto.cnpj || "",
      "{{nome_representante}}": projeto.nome_representante || "",
      "{{cpf_representante}}": projeto.cpf_representante || "",
    });
  }

  if (tipoDocumento === "procuracao_energisa") {
    const validade = new Date(dataFechamento);
    validade.setMonth(validade.getMonth() + 6);
    const ddVal = String(validade.getDate()).padStart(2, "0");
    const mmVal = String(validade.getMonth() + 1).padStart(2, "0");
    const yyyyVal = String(validade.getFullYear());
    vars["{{data_validade_6meses}}"] = `${ddVal}/${mmVal}/${yyyyVal}`;
  }

  return vars;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { projeto_id, tipo_documento, formato = "pdf" } = await req.json();
    if (!projeto_id || !tipo_documento) {
      return new Response(JSON.stringify({ error: "projeto_id e tipo_documento são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const templateId = TEMPLATE_IDS[tipo_documento];
    if (!templateId) {
      return new Response(JSON.stringify({ error: `Tipo de documento "${tipo_documento}" não suportado` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT");
    if (!serviceAccountJson) throw new Error("GOOGLE_SERVICE_ACCOUNT não configurada");
    const serviceAccount = JSON.parse(serviceAccountJson);

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
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getGoogleAccessToken(serviceAccount, "contato@treslagoassolar.com.br");
    const variables = buildVariables(projeto, tipo_documento);

    const clientName = (projeto.nome_completo || projeto.razao_social || "cliente")
      .replace(/[^a-zA-Z0-9À-ÿ\s]/g, "").replace(/\s+/g, "_").substring(0, 40);
    const today = new Date().toISOString().split("T")[0];
    const docLabel = DOC_LABELS[tipo_documento] || "Documento";
    const copyName = `${docLabel}_${clientName}_${today}`;

    // Get template parent folder
    const templateMeta = await fetch(
      `https://www.googleapis.com/drive/v3/files/${templateId}?fields=parents&supportsAllDrives=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const templateMetaData = templateMeta.ok ? await templateMeta.json() : {};
    const parents = templateMetaData.parents || [];

    // Copy template
    const copyRes = await fetch(`https://www.googleapis.com/drive/v3/files/${templateId}/copy?supportsAllDrives=true`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: copyName, mimeType: "application/vnd.google-apps.document", ...(parents.length > 0 ? { parents } : {}) }),
    });

    if (!copyRes.ok) {
      const errText = await copyRes.text();
      throw new Error(`Erro ao copiar template: ${errText}`);
    }

    const copyId = (await copyRes.json()).id;

    try {
      // Replace variables
      const requests = Object.entries(variables).map(([key, value]) => ({
        replaceAllText: { containsText: { text: key, matchCase: true }, replaceText: value },
      }));

      const batchRes = await fetch(`https://docs.googleapis.com/v1/documents/${copyId}:batchUpdate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ requests }),
      });

      if (!batchRes.ok) {
        const errText = await batchRes.text();
        throw new Error(`Erro ao substituir variáveis: ${errText}`);
      }

      // Export
      const exportMimeType = formato === "docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/pdf";
      const fileExtension = formato === "docx" ? "docx" : "pdf";

      const exportRes = await fetch(`https://www.googleapis.com/drive/v3/files/${copyId}/export?mimeType=${encodeURIComponent(exportMimeType)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!exportRes.ok) {
        const errText = await exportRes.text();
        throw new Error(`Erro ao exportar ${fileExtension.toUpperCase()}: ${errText}`);
      }

      const fileBuffer = await exportRes.arrayBuffer();

      // Delete temp copy
      await fetch(`https://www.googleapis.com/drive/v3/files/${copyId}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` },
      });

      return new Response(fileBuffer, {
        headers: {
          ...corsHeaders,
          "Content-Type": exportMimeType,
          "Content-Disposition": `attachment; filename="${copyName}.${fileExtension}"`,
        },
      });
    } catch (err) {
      try {
        await fetch(`https://www.googleapis.com/drive/v3/files/${copyId}`, {
          method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` },
        });
      } catch (_) { /* ignore */ }
      throw err;
    }
  } catch (error) {
    console.error("generate-document error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
