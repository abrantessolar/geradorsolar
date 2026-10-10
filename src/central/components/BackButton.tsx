import { ArrowLeft } from 'lucide-react';

export default function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Voltar"
      className="inline-flex items-center gap-1 text-sm font-medium mb-4 transition-opacity hover:opacity-70"
      style={{ color: '#6B7585' }}
    >
      <ArrowLeft className="w-4 h-4" /> Voltar
    </button>
  );
}
