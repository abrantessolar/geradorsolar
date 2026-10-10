import { ArrowLeft } from 'lucide-react';

export default function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label="Voltar" className="ca-back">
      <ArrowLeft className="w-4 h-4" />
    </button>
  );
}
