import { Activity } from 'lucide-react';
import MonitoramentoModule from '@/monitoramento/MonitoramentoModule';

// Página dedicada da Central de Monitoramento TLS (rota /monitoramento).
// Antes disso o módulo só existia dentro de GestorPage.tsx, que não é
// roteado em nenhum lugar — ou seja, ficava inacessível no site real. Esta
// página é o caminho direto, ao lado de Calculadora/Estoque/Clientes/
// Custos/Ferramentas/Admin no menu principal (ver src/components/Layout.tsx).
export default function MonitoramentoPage() {
  return (
    <div className="container py-4 sm:py-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-primary flex items-center gap-2">
          <Activity className="w-5 h-5 sm:w-6 sm:h-6" /> Central de Monitoramento
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Saúde da frota, fila de contato e vínculo de usinas — todas as marcas, uma tela só.
        </p>
      </div>

      <MonitoramentoModule />
    </div>
  );
}
