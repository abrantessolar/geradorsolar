// Lead score — uso interno, nunca mostrado ao usuário nem enviado na
// mensagem de WhatsApp (ver 23/24 da spec). Serve só para priorização
// futura (CRM, analytics internos). Trocar pesos aqui, não em componentes.
import { CentralSession } from '../types';

const CONSUMPTION_POINTS: Record<string, number> = {
  '250_600': 5,
  '600_1000': 10,
  '1000_3000': 18,
  'acima_3000': 25,
};

const EXCITEMENT_POINTS: Record<number, number> = {
  1: 0,
  3: 4,
  6: 12,
  9: 22,
  10: 28,
};

export function calculateScore(session: CentralSession): number {
  let score = 0;

  if (session.consumptionRange) score += CONSUMPTION_POINTS[session.consumptionRange] ?? 0;
  if (session.priority === 'responsabilidade') score += 6;
  if (typeof session.excitement === 'number') score += EXCITEMENT_POINTS[session.excitement] ?? 0;
  score += Math.min(session.videosViewed.length, 3) * 3; // assistir case = sinal positivo
  if (session.filesAttached.length > 0) score += 10; // enviar fatura/foto = sinal forte
  if (session.lead.whatsapp) score += 15; // preencheu WhatsApp = conversão
  if (session.intent === 'upgrade') score += 12; // bateria/ampliação = sinal comercial relevante

  return score;
}
