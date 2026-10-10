import { MessageCircle } from 'lucide-react';

/**
 * "Prefere falar com alguém?" — discreto, disponível em toda a experiência
 * (seção 7 da spec). Nunca mostra nome de atendente.
 */
export default function HelpNowButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold shadow-lg transition-transform active:scale-95"
      style={{ background: '#FFFFFF', color: '#1A3C5E', border: '1px solid #E3E8EF' }}
    >
      <MessageCircle className="w-4 h-4" style={{ color: '#F5A623' }} />
      Prefere falar com alguém?
    </button>
  );
}
