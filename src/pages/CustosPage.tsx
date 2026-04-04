import CustosModule from '@/components/gestor/custos/CustosModule';

export default function CustosPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 px-2 sm:px-0">
      <h1 className="text-lg sm:text-2xl font-bold text-primary">Controle de Custos</h1>
      <CustosModule />
    </div>
  );
}
