// Motor de roteamento — única função que decide para qual WhatsApp o
// atendimento vai. Nada disso deve ser replicado na interface: todo
// componente que precisa do destino final chama resolveDestination(session).
import { CentralSession, DestinationKey } from '../types';

export function resolveDestination(session: Pick<CentralSession, 'talkNow' | 'intent' | 'customerStatus'>): DestinationKey {
  if (session.talkNow) return 'general';

  if (session.intent === 'quote') return 'commercial';
  if (session.intent === 'upgrade') return 'commercial';

  if (session.customerStatus === 'customer') {
    return 'customerSupport';
  }

  if (session.customerStatus === 'external_system') {
    return 'externalSupport';
  }

  if (session.customerStatus === 'supplier') {
    return 'supplier';
  }

  return 'general';
}
