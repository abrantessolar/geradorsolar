import { MessageCircle } from 'lucide-react';

/**
 * "Prefere falar com alguém?" — discreto, disponível em toda a experiência
 * (seção 7 da spec). Nunca mostra nome de atendente.
 */
export default function HelpNowButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="ca-help-btn">
      <MessageCircle className="w-4 h-4" style={{ color: 'var(--gold-ink)' }} />
      Prefere falar com alguém?
    </button>
  );
}
