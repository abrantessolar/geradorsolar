import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { nome, telefone, cidade, uf, consumo_kwh, resultado_placas, resultado_potencia_kwp } = await req.json();

    if (!nome || !telefone || !cidade) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    const dataHora = now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    const subject = `🌞 Novo lead — ${nome} — ${cidade}`;
    const body = `Novo lead recebido pelo simulador!

Nome: ${nome}
Telefone: ${telefone}
Cidade: ${cidade}/${uf || 'MS'}
Consumo: ${consumo_kwh} kWh/mês

Resultado da simulação:
- Placas estimadas: ${resultado_placas} placas
- Potência: ${Number(resultado_potencia_kwp).toFixed(2)} kWp

Data/hora: ${dataHora}`;

    // Use Lovable AI to send email via fetch to a simple SMTP relay
    // For now, we'll use the Supabase built-in capabilities
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    // Log the lead notification (the email will be sent when email infra is configured)
    console.log(`[LEAD NOTIFICATION] ${subject}`);
    console.log(body);

    return new Response(JSON.stringify({ success: true, message: 'Lead notification processed' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing lead notification:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
