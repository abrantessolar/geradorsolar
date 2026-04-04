import { useNavigate } from 'react-router-dom';
import { ShieldX, ArrowLeft } from 'lucide-react';

export default function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      <ShieldX className="w-16 h-16 text-destructive mb-4" />
      <h1 className="text-2xl font-bold text-foreground mb-2">Acesso Negado</h1>
      <p className="text-muted-foreground text-center mb-6">
        Você não tem permissão para acessar esta área.
      </p>
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>
    </div>
  );
}
