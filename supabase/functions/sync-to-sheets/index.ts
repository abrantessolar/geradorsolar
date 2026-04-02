import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function createGoogleJWT(serviceAccount: any): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encode = (obj: any) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const headerB64 = encode(header);
  const claimB64 = encode(claim);
  const unsignedToken = `${headerB64}.${claimB64}`;

  const pemContents = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${unsignedToken}.${signatureB64}`;
}

async function getAccessToken(serviceAccount: any): Promise<string> {
  const jwt = await createGoogleJWT(serviceAccount);
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await resp.json();
  if (!data.access_token) throw new Error('Failed to get access token: ' + JSON.stringify(data));
  return data.access_token;
}

const HEADERS = [
  'ID Projeto', 'Data Fechamento', 'Cliente', 'CPF/CNPJ', 'Telefone',
  'Concessionária', 'Sistema', 'Qtd Placas', 'Marca Placa', 'Potência Placa (Wp)',
  'Qtd Inversores', 'Marca Inversor', 'Potência Inversor (kW)',
  'Geração Estimada (kWh)', 'Preço de Venda', 'Forma de Pagamento',
  'Distribuidor', 'Instalador', 'Pagamento Status',
  'Status', 'Data Instalação', 'Local Entrega', 'Objeções',
  'Projeto Enviado', 'Projeto Aprovado', 'Vistoriado Em',
  'Tempo Decorrido (dias)',
];

const COL_COUNT = HEADERS.length;
const lastCol = String.fromCharCode(64 + COL_COUNT); // e.g. 'AA' handled below
function colLetter(n: number): string {
  let s = '';
  while (n > 0) { n--; s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26); }
  return s;
}
const LAST_COL = colLetter(COL_COUNT);

function calcDiasDecorridos(dataFechamento: string | null): number | string {
  if (!dataFechamento) return '';
  const diff = Date.now() - new Date(dataFechamento).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    const { project_id, sync_all } = body;

    const sheetsId = Deno.env.get('GOOGLE_SHEETS_ID');
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT');

    if (!sheetsId || !serviceAccountJson) {
      return new Response(JSON.stringify({ error: 'Google Sheets credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    const accessToken = await getAccessToken(serviceAccount);

    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetsId}`;

    // Ensure header row
    const headerResp = await fetch(`${sheetsUrl}/values/A1:${LAST_COL}1`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const headerData = await headerResp.json();

    if (!headerData.values || headerData.values.length === 0) {
      await fetch(`${sheetsUrl}/values/A1:${LAST_COL}1?valueInputOption=RAW`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [HEADERS] }),
      });
    }

    // Fetch projects
    let query = supabaseAdmin
      .from('projetos')
      .select('*, equipamentos_placas!projetos_placa_id_fkey(marca, modelo, potencia_wp), equipamentos_inversores!projetos_inversor_id_fkey(marca, modelo, potencia_kw)');

    if (!sync_all && project_id) {
      query = query.eq('id', project_id);
    }

    const { data: projetos, error } = await query;
    if (error) throw error;
    if (!projetos || projetos.length === 0) {
      return new Response(JSON.stringify({ ok: true, synced: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get existing IDs
    const existingResp = await fetch(`${sheetsUrl}/values/A:A`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const existingData = await existingResp.json();
    const existingIds: string[] = (existingData.values || []).map((r: string[]) => r[0]);

    const updates: { range: string; values: string[][] }[] = [];
    const appends: string[][] = [];

    for (const p of projetos) {
      const placa = p.equipamentos_placas as any;
      const inversor = p.equipamentos_inversores as any;
      const cliente = p.tipo_pessoa === 'PJ' ? p.razao_social : p.nome_completo;
      const cpfCnpj = p.tipo_pessoa === 'PJ' ? p.cnpj : p.cpf;

      const row = [
        p.id,
        p.data_fechamento || '',
        cliente || '',
        cpfCnpj || '',
        p.telefone || '',
        p.concessionaria || '',
        p.sistema || '',
        String(p.qtd_placas || ''),
        p.marca_placa || placa?.marca || '',
        p.potencia_placa || String(placa?.potencia_wp || ''),
        String(p.qtd_inversores || ''),
        p.marca_inversor || inversor?.marca || '',
        p.potencia_inversor || String(inversor?.potencia_kw || ''),
        String(p.geracao_estimada_kwh || ''),
        p.preco_venda ? `R$ ${Number(p.preco_venda).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '',
        p.forma_pagamento || '',
        p.distribuidor || '',
        p.instalador || '',
        p.pagamento_status || '',
        p.status || '',
        p.data_instalacao || '',
        p.local_entrega || '',
        p.objecoes || '',
        p.projeto_enviado_em || '',
        p.projeto_aprovado || '',
        p.vistoriado_em || '',
        String(calcDiasDecorridos(p.data_fechamento)),
      ];

      const rowIndex = existingIds.indexOf(p.id);
      if (rowIndex > 0) {
        updates.push({ range: `A${rowIndex + 1}:${LAST_COL}${rowIndex + 1}`, values: [row] });
      } else {
        appends.push(row);
      }
    }

    if (updates.length > 0) {
      await fetch(`${sheetsUrl}/values:batchUpdate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ valueInputOption: 'RAW', data: updates }),
      });
    }

    if (appends.length > 0) {
      await fetch(`${sheetsUrl}/values/A:${LAST_COL}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: appends }),
      });
    }

    const ids = projetos.map((p: any) => p.id);
    for (const id of ids) {
      await supabaseAdmin
        .from('projetos')
        .update({ sheets_synced_at: new Date().toISOString() })
        .eq('id', id);
    }

    return new Response(JSON.stringify({ ok: true, synced: projetos.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('sync-to-sheets error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
