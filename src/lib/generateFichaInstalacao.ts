import html2pdf from 'html2pdf.js';
import { supabase } from '@/integrations/supabase/client';

type ProjetoData = {
  id: string;
  nome_completo?: string | null;
  razao_social?: string | null;
  endereco_completo?: string | null;
  logradouro?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  telefone?: string | null;
  unidade_geradora_codigo_uc?: string | null;
  qtd_placas?: number | null;
  marca_placa?: string | null;
  potencia_placa?: string | null;
  qtd_inversores?: number | null;
  marca_inversor?: string | null;
  potencia_inversor?: string | null;
  sistema?: string | null;
  instalador?: string | null;
  layout_url?: string | null;
  wifi_nome?: string | null;
  wifi_senha?: string | null;
  complemento?: string | null;
};

function formatDate(d: Date): string {
  return d.toLocaleDateString('pt-BR');
}

function buildAddress(p: ProjetoData): string {
  if (p.endereco_completo) return p.endereco_completo;
  const parts = [p.logradouro, p.complemento, p.bairro, p.cidade, p.estado, p.cep].filter(Boolean);
  return parts.join(', ') || '—';
}

function isMicro(p: ProjetoData): boolean {
  const marca = (p.marca_inversor || '').toUpperCase();
  const pot = parseFloat(p.potencia_inversor || '0');
  const potKw = pot > 100 ? pot / 1000 : pot;
  return marca.includes('MICRO') || marca.includes('HOYMILES') || marca.includes('HOYMMILES') ||
    (marca.includes('DEYE') && potKw < 3) || ((p.qtd_inversores || 1) > 1 && potKw < 3);
}

export async function generateFichaInstalacao(projeto: ProjetoData) {
  // Fetch materials and cables
  const [{ data: materiais }, { data: cabos }] = await Promise.all([
    supabase.from('lista_materiais_obra').select('*, materiais(nome)').eq('projeto_id', projeto.id),
    supabase.from('cabos_obra').select('*').eq('projeto_id', projeto.id),
  ]);

  const nome = projeto.nome_completo || projeto.razao_social || 'Cliente';
  const hoje = formatDate(new Date());
  const endereco = buildAddress(projeto);
  const micro = isMicro(projeto);
  const potInv = parseFloat(projeto.potencia_inversor || '0');
  const potKw = potInv > 100 ? (potInv / 1000).toFixed(1) : (potInv || '—');

  const matRows = (materiais || []).map((m: any, i: number) => {
    const bg = i % 2 === 0 ? '#f9f9f9' : '#ffffff';
    const nomeMat = m.materiais?.nome || m.material_id;
    return `<tr style="background:${bg}">
      <td style="border:1px solid #ccc;padding:6px 8px;width:24px;text-align:center">☐</td>
      <td style="border:1px solid #ccc;padding:6px 8px">${nomeMat}</td>
      <td style="border:1px solid #ccc;padding:6px 8px;text-align:center;width:80px">${m.quantidade_necessaria}</td>
      <td style="border:1px solid #ccc;padding:6px 8px;text-align:center;width:80px">${m.separado ? '✅' : '—'}</td>
    </tr>`;
  }).join('');

  const caboRows = (cabos || []).map((c: any) =>
    `<tr>
      <td style="border:1px solid #ccc;padding:6px 8px">${c.tipo_cabo}</td>
      <td style="border:1px solid #ccc;padding:6px 8px;text-align:center;width:120px">${c.quantidade_metros || '___'}m</td>
    </tr>`
  ).join('') + `<tr>
    <td style="border:1px solid #ccc;padding:6px 8px;color:#999">Cabo adicional:</td>
    <td style="border:1px solid #ccc;padding:6px 8px;text-align:center">___m</td>
  </tr>`;

  const layoutSection = projeto.layout_url
    ? `<img src="${projeto.layout_url}" style="max-width:100%;max-height:300px;display:block;margin:0 auto" crossorigin="anonymous" />`
    : `<div style="border:2px dashed #ccc;height:200px;display:flex;align-items:center;justify-content:center;color:#999;font-size:14px;border-radius:8px">Croqui não cadastrado</div>`;

  const html = `
<div id="ficha-pdf" style="font-family:Arial,sans-serif;color:#222;font-size:13px;line-height:1.5">
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:8px;border-bottom:3px solid #3D6B1F;margin-bottom:16px">
    <div>
      <p style="font-size:18px;font-weight:bold;color:#3D6B1F;margin:0">TRÊS LAGOAS SOLAR</p>
      <p style="font-size:11px;color:#3D6B1F;margin:0">Energia Limpa</p>
    </div>
    <div style="text-align:right">
      <p style="font-size:16px;font-weight:bold;margin:0">FICHA DE INSTALAÇÃO</p>
      <p style="font-size:12px;color:#666;margin:0">Data: ${hoje}</p>
    </div>
  </div>

  <!-- Bloco 1: Dados do Cliente -->
  <div style="page-break-inside:avoid;margin-bottom:14px">
    <h3 style="font-size:14px;color:#3D6B1F;border-bottom:1px solid #3D6B1F;padding-bottom:4px;margin:0 0 8px 0">DADOS DO CLIENTE</h3>
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:3px 0;width:100px;font-weight:bold">Nome:</td><td style="padding:3px 0;font-size:15px;font-weight:bold">${nome}</td></tr>
      <tr><td style="padding:3px 0;font-weight:bold">Endereço:</td><td style="padding:3px 0">${endereco}</td></tr>
      <tr><td style="padding:3px 0;font-weight:bold">Telefone:</td><td style="padding:3px 0">${projeto.telefone || '—'}</td></tr>
      <tr><td style="padding:3px 0;font-weight:bold">UC:</td><td style="padding:3px 0">${projeto.unidade_geradora_codigo_uc || '—'}</td></tr>
    </table>
  </div>

  <!-- Bloco 2: Equipamentos -->
  <div style="page-break-inside:avoid;margin-bottom:14px">
    <h3 style="font-size:14px;color:#3D6B1F;border-bottom:1px solid #3D6B1F;padding-bottom:4px;margin:0 0 8px 0">EQUIPAMENTOS</h3>
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:3px 0;width:100px;font-weight:bold">Placas:</td><td style="padding:3px 0">${projeto.qtd_placas || '—'}× ${projeto.marca_placa || ''} ${projeto.potencia_placa || ''}W</td></tr>
      <tr><td style="padding:3px 0;font-weight:bold">Inversor:</td><td style="padding:3px 0">${projeto.qtd_inversores || 1}× ${projeto.marca_inversor || ''} ${potKw}kW${micro ? ' (MICRO)' : ''}</td></tr>
      <tr><td style="padding:3px 0;font-weight:bold">KWp:</td><td style="padding:3px 0;font-weight:bold;color:#3D6B1F">${projeto.sistema || '—'}</td></tr>
      <tr><td style="padding:3px 0;font-weight:bold">Instalador:</td><td style="padding:3px 0">${projeto.instalador || '—'}</td></tr>
    </table>
  </div>

  <!-- Bloco 3: Layout -->
  <div style="page-break-inside:avoid;margin-bottom:14px">
    <h3 style="font-size:14px;color:#3D6B1F;border-bottom:1px solid #3D6B1F;padding-bottom:4px;margin:0 0 8px 0">LAYOUT DA OBRA</h3>
    ${layoutSection}
  </div>

  <!-- Bloco 4: Info de Campo -->
  <div style="page-break-inside:avoid;margin-bottom:14px">
    <h3 style="font-size:14px;color:#3D6B1F;border-bottom:1px solid #3D6B1F;padding-bottom:4px;margin:0 0 8px 0">INFORMAÇÕES DE CAMPO</h3>
    <p style="margin:4px 0"><strong>WiFi — Rede:</strong> ${projeto.wifi_nome || '_______________'} &nbsp;&nbsp; <strong>Senha:</strong> ${projeto.wifi_senha || '_______________'}</p>
    <p style="margin:4px 0"><strong>Observações:</strong> _______________________________________________</p>
  </div>

  <!-- Bloco 5: Cabos -->
  <div style="page-break-inside:avoid;margin-bottom:14px">
    <h3 style="font-size:14px;color:#3D6B1F;border-bottom:1px solid #3D6B1F;padding-bottom:4px;margin:0 0 8px 0">CABOS UTILIZADOS</h3>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#3D6B1F;color:#fff">
          <th style="border:1px solid #ccc;padding:6px 8px;text-align:left">Tipo de Cabo</th>
          <th style="border:1px solid #ccc;padding:6px 8px;text-align:center;width:120px">Metros Utilizados</th>
        </tr>
      </thead>
      <tbody>${caboRows || '<tr><td colspan="2" style="border:1px solid #ccc;padding:8px;text-align:center;color:#999">Nenhum cabo cadastrado</td></tr>'}</tbody>
    </table>
  </div>

  <!-- Bloco 6: Lista de Materiais -->
  <div style="page-break-inside:avoid;margin-bottom:14px">
    <h3 style="font-size:14px;color:#3D6B1F;border-bottom:1px solid #3D6B1F;padding-bottom:4px;margin:0 0 8px 0">LISTA DE MATERIAIS</h3>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#3D6B1F;color:#fff">
          <th style="border:1px solid #ccc;padding:6px 8px;width:24px">☐</th>
          <th style="border:1px solid #ccc;padding:6px 8px;text-align:left">Material</th>
          <th style="border:1px solid #ccc;padding:6px 8px;text-align:center;width:80px">Qtd</th>
          <th style="border:1px solid #ccc;padding:6px 8px;text-align:center;width:80px">Separado</th>
        </tr>
      </thead>
      <tbody>${matRows || '<tr><td colspan="4" style="border:1px solid #ccc;padding:8px;text-align:center;color:#999">Nenhum material cadastrado</td></tr>'}</tbody>
    </table>
  </div>

  <!-- Bloco 7: Registro de Instalação -->
  <div style="page-break-inside:avoid;margin-bottom:14px">
    <h3 style="font-size:14px;color:#3D6B1F;border-bottom:1px solid #3D6B1F;padding-bottom:4px;margin:0 0 8px 0">REGISTRO DE INSTALAÇÃO</h3>
    <div style="display:flex;justify-content:space-between;margin-top:40px">
      <div style="text-align:center;width:45%">
        <div style="border-top:1px solid #222;padding-top:4px">Instalador Responsável</div>
      </div>
      <div style="text-align:center;width:45%">
        <div style="border-top:1px solid #222;padding-top:4px">Data de Instalação</div>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:40px">
      <div style="text-align:center;width:45%">
        <div style="border-top:1px solid #222;padding-top:4px">Assinatura do Cliente</div>
      </div>
      <div style="text-align:center;width:45%">&nbsp;</div>
    </div>
  </div>

  <!-- Rodapé -->
  <div style="margin-top:20px;padding-top:8px;border-top:2px solid #3D6B1F;text-align:center;font-size:11px;color:#666">
    (67) 9 9644-8995 | contato@treslagoassolar.com.br | www.treslagoassolar.com.br
  </div>
</div>`;

  // Create element, render PDF
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);

  const nomeArquivo = `Ficha_${nome.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;

  await (html2pdf as any)().set({
    margin: 15,
    filename: nomeArquivo,
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { scale: 0.95, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  }).from(container.firstElementChild as HTMLElement).save();

  document.body.removeChild(container);
}
