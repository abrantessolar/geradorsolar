// Números de WhatsApp por destino lógico. Trocar aqui nunca exige tocar em
// nenhum outro arquivo — é o único lugar com números de telefone.
import { DestinationKey } from '../types';

export const contacts: Record<DestinationKey, string> = {
  commercial: '5567996448995',
  externalSupport: '5567998955576',
  customerSupport: '5567996499267',
  general: '5567996448995',
  supplier: '5567996448995', // padrão atual — fácil de trocar se mudar no futuro
};
