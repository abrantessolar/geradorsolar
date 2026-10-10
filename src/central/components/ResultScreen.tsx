import { MessageCircle } from 'lucide-react';
import { CentralSession } from '../types';
import { resolveDestination } from '../lib/routing';
import { contacts } from '../config/contacts';
import { buildWhatsAppMessage, formatWhatsAppUrl } from '../lib/whatsapp';
import { track } from '../lib/analytics';

function textoPorDestino(session: CentralSession): { titulo: string; corpo: string; botao: string } {
  const destino = resolveDestination(session);

  if (destino === 'commercial') {
    const quente = (session.excitement ?? 0) >= 9;
    return {
      titulo: 'Recebemos suas informações.',
      corpo: quente
        ? 'Seu perfil parece bastante compatível com um projeto solar. Nossa equipe vai analisar suas respostas e continuar daqui com você.'
        : 'Agora já temos informações suficientes para fazer uma análise inicial.',
      botao: 'Continuar no WhatsApp',
    };
  }

  if (destino === 'supplier') {
    return {
      titulo: 'Recebemos sua apresentação.',
      corpo: 'Se houver interesse ou aderência com nossas necessidades, nossa equipe entrará em contato.',
      botao: 'Abrir WhatsApp',
    };
  }

  if (destino === 'customerSupport' || destino === 'externalSupport') {
    return {
      titulo: 'Entendido.',
      corpo: 'Já temos o que precisamos para te ajudar. Vamos continuar por WhatsApp com as informações que você passou.',
      botao: 'Continuar no WhatsApp',
    };
  }

  return {
    titulo: 'Tudo certo.',
    corpo: 'Vamos continuar por WhatsApp.',
    botao: 'Abrir WhatsApp',
  };
}

export default function ResultScreen({ session }: { session: CentralSession }) {
  const { titulo, corpo, botao } = textoPorDestino(session);
  const destino = resolveDestination(session);

  const abrirWhatsApp = () => {
    const mensagem = buildWhatsAppMessage(session);
    const numero = contacts[destino];
    track(
      destino === 'commercial' ? 'route_commercial'
        : destino === 'customerSupport' ? 'route_customer_support'
        : destino === 'externalSupport' ? 'route_external_support'
        : destino === 'supplier' ? 'route_supplier'
        : 'route_commercial'
    );
    track('whatsapp_clicked', { destination: destino });
    track('funnel_completed');
    window.open(formatWhatsAppUrl(numero, mensagem), '_blank');
  };

  return (
    <div className="text-center py-6">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: '#FFF4E0' }}>
        <MessageCircle className="w-7 h-7" style={{ color: '#F5A623' }} />
      </div>
      <h1 className="text-xl font-extrabold mb-2" style={{ color: '#1A2233' }}>{titulo}</h1>
      <p className="text-sm mb-7 max-w-sm mx-auto" style={{ color: '#6B7585' }}>{corpo}</p>
      <button
        onClick={abrirWhatsApp}
        className="w-full h-13 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2"
        style={{ background: '#25D366', color: '#FFFFFF' }}
      >
        <MessageCircle className="w-5 h-5" /> {botao}
      </button>
    </div>
  );
}
