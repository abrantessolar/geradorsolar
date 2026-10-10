// buildWhatsAppMessage(session) — monta a mensagem automaticamente a
// partir das respostas. Regras (seção 24 da spec): remover respostas
// vazias, usar labels amigáveis, nunca JSON bruto, nunca códigos internos,
// nunca o score, nunca o nome do atendente.
import { CentralSession } from '../types';
import { resolveDestination } from './routing';
import { CONSUMPTION_LABELS, PRIORITY_LABELS, EXCITEMENT_LABELS } from '../config/whatsappMessages';

export function formatWhatsAppUrl(phoneDigits: string, text: string): string {
  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(text)}`;
}

function linhas(...items: Array<string | null | undefined | false>): string {
  return items.filter((l): l is string => Boolean(l && l.trim().length > 0)).join('\n');
}

function outrosDados(session: CentralSession, exclude: string[] = []): string {
  const partes: string[] = [];
  Object.entries(session.answers).forEach(([key, value]) => {
    if (!value) return;
    if (exclude.includes(key)) return;
    partes.push(value);
  });
  if (session.filesAttached.length > 0) {
    partes.push('📎 Vou enviar uma foto/print por aqui.');
  }
  return partes.join('\n');
}

function mensagemComercial(session: CentralSession): string {
  const interesse = session.answers['B'] || session.answers['A6'] || session.answers['C7'] || session.answers['C8'] || '';
  const consumo = session.consumptionRange ? CONSUMPTION_LABELS[session.consumptionRange] : '';
  const prioridade = session.priority ? PRIORITY_LABELS[session.priority] : '';
  const empolgacao = typeof session.excitement === 'number' ? `${session.excitement}/10 (${EXCITEMENT_LABELS[session.excitement] ?? ''})` : '';
  // Grupo A (alta tensão/demanda) ou Grupo B optante por conta alta — perfil
  // mais técnico/corporativo, tratado diretamente pela Raissa.
  const grupoA = Boolean(session.answers['B_grupoA_motivo']);
  const motivoGrupoA = session.answers['B_grupoA_motivo'] || '';

  return linhas(
    'Olá! 👋 Vim pela Central da Três Lagoas Solar e gostaria de continuar uma análise/orçamento.',
    '',
    grupoA && '🏢 Perfil: Grupo A (alta tensão/demanda) ou B optante — encaminhar para a Raissa.',
    interesse && `📍 Interesse: ${interesse}`,
    consumo && `⚡ Consumo/faixa da conta: ${consumo}`,
    motivoGrupoA && `🎯 Gostaria de: ${motivoGrupoA}`,
    prioridade && `🎯 Prioridade: ${prioridade}`,
    empolgacao && `🔥 Interesse em instalar: ${empolgacao}`,
    outrosDados(session, ['B', 'A6', 'C7', 'C8', 'B_grupoA_motivo']) || null,
    '',
    'Gostaria de continuar por aqui.'
  );
}

function mensagemSuporteExterno(session: CentralSession): string {
  const problema = Object.entries(session.answers).find(([k]) => k.startsWith('C'))?.[1] || '';
  const statusInversor = session.answers['C1'] || '';
  const marca = session.answers['C1_marca'] || '';
  const monitoramento = session.answers['C3'] || '';

  return linhas(
    'Olá! 👋 Vim pela Central da Três Lagoas Solar.',
    '',
    'Meu sistema foi instalado por outra empresa e preciso de ajuda.',
    '',
    problema && `🔧 Problema: ${problema}`,
    statusInversor && `⚡ Situação do inversor: ${statusInversor}`,
    marca && `🏷️ Marca: ${marca}`,
    monitoramento && `📱 Monitoramento: ${monitoramento}`,
    outrosDados(session, ['C1', 'C1_marca', 'C3']) || null,
    '',
    'Gostaria de verificar se vocês conseguem me ajudar.'
  );
}

function mensagemPosVenda(session: CentralSession): string {
  const necessidade = Object.entries(session.answers).find(([k]) => k.startsWith('A'))?.[1] || '';

  return linhas(
    'Olá! 👋 Já sou cliente da Três Lagoas Solar e vim pela Central de Atendimento.',
    '',
    necessidade && `Preciso de ajuda com: ${necessidade}`,
    outrosDados(session, []) || null,
    '',
    'Podemos continuar o atendimento por aqui?'
  );
}

function mensagemFornecedor(session: CentralSession): string {
  const oferece = session.answers['D'] || '';
  const apresentar = session.answers['D_apresentar'] || '';

  return linhas(
    'Olá! 👋 Vim pela Central da Três Lagoas Solar.',
    '',
    oferece && `🏷️ Oferece: ${oferece}`,
    apresentar && `📝 ${apresentar}`,
    session.lead.empresa && `🏢 Empresa: ${session.lead.empresa}`,
    session.lead.site && `🔗 ${session.lead.site}`,
    session.lead.catalogo && `📎 Catálogo/apresentação: ${session.lead.catalogo}`,
    '',
    'Gostaria de apresentar para vocês.'
  );
}

function mensagemFalarComAlguem(session: CentralSession): string {
  const resumo = outrosDados(session, []);
  return linhas(
    'Olá! 👋 Vim pela Central da Três Lagoas Solar e preferi falar com alguém.',
    '',
    resumo || null,
    '',
    'Podemos continuar por aqui?'
  );
}

export function buildWhatsAppMessage(session: CentralSession): string {
  if (session.talkNow) return mensagemFalarComAlguem(session);

  const destino = resolveDestination(session);
  switch (destino) {
    case 'commercial':
      return mensagemComercial(session);
    case 'externalSupport':
      return mensagemSuporteExterno(session);
    case 'customerSupport':
      return mensagemPosVenda(session);
    case 'supplier':
      return mensagemFornecedor(session);
    default:
      return mensagemFalarComAlguem(session);
  }
}
