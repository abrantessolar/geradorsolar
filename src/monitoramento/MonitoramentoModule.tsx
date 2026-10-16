import React, { useState } from 'react';
import { Link2 } from 'lucide-react';
import VinculoUsinas from './components/VinculoUsinas';

// Central de Monitoramento TLS — módulo isolado dentro do painel do
// gestor. Fase 1 (base) só tem a aba de vínculo usina↔cliente; as
// próximas fases (saúde da frota, comparação, fila de contato) entram
// como novas abas aqui, sem tocar no resto do painel.
type MonTab = 'vinculo';

const TABS: { key: MonTab; label: string; icon: typeof Link2 }[] = [
  { key: 'vinculo', label: 'Vínculo de usinas', icon: Link2 },
];

export default function MonitoramentoModule() {
  const [tab, setTab] = useState<MonTab>('vinculo');

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex gap-1.5 sm:gap-2 flex-nowrap overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
              tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'
            }`}
          >
            <t.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'vinculo' && <VinculoUsinas />}
    </div>
  );
}
