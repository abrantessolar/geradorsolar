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
  const cryptoKey = await crypto.subtle.importKey('pkcs8', binaryDer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(unsignedToken));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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

function colLetter(n: number): string {
  let s = '';
  while (n > 0) { n--; s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26); }
  return s;
}

function calcDiasDecorridos(dataFechamento: string | null): number | string {
  if (!dataFechamento) return '';
  return Math.floor((Date.now() - new Date(dataFechamento).getTime()) / (1000 * 60 * 60 * 24));
}

// ── OBRAS SHEET ──
const OBRAS_HEADERS = [
  'ID Projeto', 'Data Fechamento', 'Cliente', 'CPF/CNPJ', 'Telefone',
  'Concessionária', 'Sistema', 'Qtd Placas', 'Marca Placa', 'Potência Placa (Wp)',
  'Qtd Inversores', 'Marca Inversor', 'Potência Inversor (kW)',
  'Geração Estimada (kWh)', 'Preço de Venda', 'Forma de Pagamento',
  'Distribuidor', 'Instalador', 'Pagamento Status',
  'Status', 'Data Instalação', 'Local Entrega', 'Objeções',
  'Projeto Enviado', 'Projeto Aprovado', 'Vistoriado Em',
  'Tempo Decorrido (dias)',
];
const OBRAS_LAST_COL = colLetter(OBRAS_HEADERS.length);

// ── CLIENTES SHEET ──
const CLIENTES_HEADERS = [
  'ID', 'Nome', 'CPF', 'Endereço', 'Telefone', 'UC',
  'Concessionária', 'Sistema', 'Painéis', 'Inversor',
  'Qtd Placas', 'Marca Placa', 'Potência Placa',
  'Qtd Inversores', 'Marca Inversor', 'Potência Inversor', 'Tipo Inversor',
  'Fornecedor', 'Valor', 'Forma Pagamento',
  'Projeto Enviado', 'Projeto Aprovado', 'Instalado Em', 'Vistoriado Em',
  'Nome Planta', 'Satisfação', 'Origem',
];
const CLIENTES_LAST_COL = colLetter(CLIENTES_HEADERS.length);

async function ensureSheet(sheetsUrl: string, accessToken: string, sheetTitle: string) {
  const metaResp = await fetch(sheetsUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  const meta = await metaResp.json();
  const exists = (meta.sheets || []).some((s: any) => s.properties?.title === sheetTitle);
  if (!exists) {
    await fetch(`${sheetsUrl}:batchUpdate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title: sheetTitle } } }] }),
    });
  }
}

async function syncSheet(
  sheetsUrl: string, accessToken: string, sheetName: string,
  headers: string[], lastCol: string, rows: string[][], idIndex: number
) {
  const range = (r: string) => `'${sheetName}'!${r}`;

  // Ensure header
  const headerResp = await fetch(`${sheetsUrl}/values/${range(`A1:${lastCol}1`)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const headerData = await headerResp.json();
  if (!headerData.values || headerData.values.length === 0) {
    await fetch(`${sheetsUrl}/values/${range(`A1:${lastCol}1`)}?valueInputOption=RAW`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [headers] }),
    });
  }

  // Get existing IDs
  const existingResp = await fetch(`${sheetsUrl}/values/${range('A:A')}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const existingData = await existingResp.json();
  const existingIds: string[] = (existingData.values || []).map((r: string[]) => r[0]);

  const updates: { range: string; values: string[][] }[] = [];
  const appends: string[][] = [];

  for (const row of rows) {
    const rowId = row[idIndex];
    const rowIdx = existingIds.indexOf(rowId);
    if (rowIdx > 0) {
      updates.push({ range: range(`A${rowIdx + 1}:${lastCol}${rowIdx + 1}`), values: [row] });
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
    await fetch(`${sheetsUrl}/values/${range(`A:${lastCol}`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: appends }),
    });
  }

  return rows.length;
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
    const { project_id, sync_all, delete_id, sheet } = body;

    const sheetsId = Deno.env.get('GOOGLE_SHEETS_ID');
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT');
    if (!sheetsId || !serviceAccountJson) {
      return new Response(JSON.stringify({ error: 'Google Sheets credentials not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    const accessToken = await getAccessToken(serviceAccount);
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetsId}`;

    // ── DELETE ROW FROM SHEET ──
    if (delete_id && sheet) {
      try {
        await ensureSheet(sheetsUrl, accessToken, sheet);
        const existingResp = await fetch(`${sheetsUrl}/values/'${sheet}'!A:A`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const existingData = await existingResp.json();
        const existingIds: string[] = (existingData.values || []).map((r: string[]) => r[0]);
        const rowIdx = existingIds.indexOf(delete_id);
        if (rowIdx > 0) {
          // Get sheet ID
          const metaResp = await fetch(sheetsUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
          const meta = await metaResp.json();
          const sheetMeta = (meta.sheets || []).find((s: any) => s.properties?.title === sheet);
          if (sheetMeta) {
            await fetch(`${sheetsUrl}:batchUpdate`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                requests: [{
                  deleteDimension: {
                    range: {
                      sheetId: sheetMeta.properties.sheetId,
                      dimension: 'ROWS',
                      startIndex: rowIdx,
                      endIndex: rowIdx + 1,
                    },
                  },
                }],
              }),
            });
          }
        }
      } catch (e) {
        console.error('Error deleting row from sheet:', e);
      }
      return new Response(JSON.stringify({ ok: true, deleted: delete_id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }


    // ── SYNC OBRAS ──
    let queryObras = supabaseAdmin.from('projetos')
      .select('*, equipamentos_placas!projetos_placa_id_fkey(marca, modelo, potencia_wp), equipamentos_inversores!projetos_inversor_id_fkey(marca, modelo, potencia_kw)');
    if (!sync_all && project_id) queryObras = queryObras.eq('id', project_id);
    const { data: projetos, error: errP } = await queryObras;
    if (errP) throw errP;

    const obrasRows = (projetos || []).map((p: any) => {
      const placa = p.equipamentos_placas;
      const inversor = p.equipamentos_inversores;
      const cliente = p.tipo_pessoa === 'PJ' ? p.razao_social : p.nome_completo;
      const cpfCnpj = p.tipo_pessoa === 'PJ' ? p.cnpj : p.cpf;
      return [
        p.id, p.data_fechamento || '', cliente || '', cpfCnpj || '', p.telefone || '',
        p.concessionaria || '', p.sistema || '',
        String(p.qtd_placas || ''), p.marca_placa || placa?.marca || '',
        p.potencia_placa || String(placa?.potencia_wp || ''),
        String(p.qtd_inversores || ''), p.marca_inversor || inversor?.marca || '',
        p.potencia_inversor || String(inversor?.potencia_kw || ''),
        String(p.geracao_estimada_kwh || ''),
        p.preco_venda ? `R$ ${Number(p.preco_venda).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '',
        p.forma_pagamento || '', p.distribuidor || '', p.instalador || '',
        p.pagamento_status || '', p.status || '', p.data_instalacao || '',
        p.local_entrega || '', p.objecoes || '',
        p.projeto_enviado_em || '', p.projeto_aprovado || '', p.vistoriado_em || '',
        String(calcDiasDecorridos(p.data_fechamento)),
      ];
    });

    await ensureSheet(sheetsUrl, accessToken, 'Obras');
    const syncedObras = await syncSheet(sheetsUrl, accessToken, 'Obras', OBRAS_HEADERS, OBRAS_LAST_COL, obrasRows, 0);

    // Update sheets_synced_at
    for (const p of (projetos || [])) {
      await supabaseAdmin.from('projetos').update({ sheets_synced_at: new Date().toISOString() }).eq('id', p.id);
    }

    // ── SYNC CLIENTES ──
    const { data: clientesData } = await supabaseAdmin.from('clientes_base').select('*');

    const clientesRows = (clientesData || []).map((c: any) => [
      c.id, c.nome_completo || '', c.cpf || '', c.endereco || '', c.telefone || '',
      c.uc || '', c.concessionaria || '', c.sistema || '',
      c.dados_paineis || '', c.dados_inversor || '',
      String(c.qtd_placas || ''), c.marca_placa || '', c.potencia_placa || '',
      String(c.qtd_inversores || ''), c.marca_inversor || '', c.potencia_inversor || '',
      c.tipo_inversor || '',
      c.fornecedor || '', c.valor ? `R$ ${Number(c.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '',
      c.forma_pagamento || '',
      c.projeto_enviado_em || '', c.projeto_aprovado || '', c.instalado_em || '',
      c.vistoriado_em || '', c.nome_planta || '', c.satisfacao || '', c.origem || '',
    ]);

    await ensureSheet(sheetsUrl, accessToken, 'Clientes');
    const syncedClientes = await syncSheet(sheetsUrl, accessToken, 'Clientes', CLIENTES_HEADERS, CLIENTES_LAST_COL, clientesRows, 0);

    return new Response(JSON.stringify({ ok: true, synced_obras: syncedObras, synced_clientes: syncedClientes }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('sync-to-sheets error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
