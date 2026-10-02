import html2canvas from 'html2canvas';

/**
 * Página "Termo de Responsabilidade pela Escolha do Local de Instalação dos
 * Equipamentos", anexada como folha adicional da Ficha de Instalação.
 *
 * Texto fixo (conteúdo jurídico, não deve ser alterado) — só os campos de
 * preenchimento (nome, CPF, local, data, assinatura) ficam em branco, pra
 * preencher à mão em campo, igual ao resto da ficha.
 */
const VERDE = '#3D6B1F';
const TEXTO = '#222';

function linhaCampo(label: string, largura = '70%'): string {
  return `
    <div style="display:flex;align-items:flex-end;gap:8px;margin:14px 0 4px">
      <span style="white-space:nowrap;font-weight:bold">${label}</span>
      <span style="flex:1;max-width:${largura};border-bottom:1px solid #666;height:16px"></span>
    </div>`;
}

function montarHtml(): string {
  return `
<div id="termo-pdf" style="font-family:Arial,sans-serif;color:${TEXTO};font-size:13px;line-height:1.6;width:794px;padding:40px;box-sizing:border-box;background:#fff">
  <div style="display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:8px;border-bottom:3px solid ${VERDE};margin-bottom:22px">
    <div>
      <p style="font-size:18px;font-weight:bold;color:${VERDE};margin:0">TRÊS LAGOAS SOLAR</p>
      <p style="font-size:11px;color:${VERDE};margin:0">Energia Limpa</p>
    </div>
    <div style="text-align:right">
      <p style="font-size:14px;font-weight:bold;margin:0">TERMO DE RESPONSABILIDADE</p>
    </div>
  </div>

  <h2 style="font-size:14.5px;font-weight:bold;color:${VERDE};text-align:center;margin:0 0 20px;line-height:1.4">
    TERMO DE RESPONSABILIDADE PELA ESCOLHA DO LOCAL DE INSTALAÇÃO DOS EQUIPAMENTOS
  </h2>

  <p style="margin:0 0 14px;text-align:justify">
    Declaro que, no momento da instalação do sistema de energia solar fotovoltaica, fui informado(a) e estou de
    acordo com o local definido para instalação dos equipamentos, incluindo inversor(es), quadro(s) de proteção,
    baterias, equipamentos de monitoramento e demais componentes aplicáveis ao sistema.
  </p>
  <p style="margin:0 0 14px;text-align:justify">
    Declaro ainda que o local indicado foi escolhido e/ou autorizado por mim, estando ciente das condições de
    acesso, exposição, ventilação, estética e demais características do ambiente.
  </p>
  <p style="margin:0 0 26px;text-align:justify">
    A partir da assinatura deste termo, reconheço que eventual solicitação futura de alteração ou remanejamento
    dos equipamentos, quando não decorrente de falha técnica ou necessidade identificada pela instaladora,
    poderá gerar custos adicionais de mão de obra, materiais e deslocamento.
  </p>

  ${linhaCampo('Nome do responsável pela autorização:', '75%')}
  ${linhaCampo('CPF:', '45%')}
  ${linhaCampo('Relação com o titular do contrato/imóvel:', '60%')}
  ${linhaCampo('Local autorizado para instalação dos equipamentos:', '90%')}

  <div style="display:flex;gap:40px;margin-top:14px">
    ${linhaCampo('Data:', '30%')}
  </div>

  <div style="margin-top:50px">
    ${linhaCampo('Assinatura:', '100%')}
  </div>
</div>`;
}

export async function gerarPaginaTermoResponsabilidadeFicha(): Promise<string> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.innerHTML = montarHtml();
  document.body.appendChild(container);

  try {
    const el = container.firstElementChild as HTMLElement;
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
    return canvas.toDataURL('image/jpeg', 0.95);
  } finally {
    document.body.removeChild(container);
  }
}
