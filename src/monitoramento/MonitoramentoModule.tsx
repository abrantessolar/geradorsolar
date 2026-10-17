import React, { useState } from 'react';
import { Link2, Activity, Phone, Siren, Receipt } from 'lucide-react';
import VinculoUsinas from './components/VinculoUsinas';
import PainelSaude from './components/PainelSaude';
import FilaContato from './components/FilaContato';
import HistoricoAlarmes from './components/HistoricoAlarmes';
import ContaDeLuzTab from './components/ContaDeLuzTab';

// Central de Monitoramento TLS — módulo isolado dentro do painel do
// gestor. Fase 1 (base) trouxe a aba de vínculo usina↔cliente; Fase 2
// acrescenta o painel de saúde da frota e a fila de contato (kanban
// reativo, separado da agenda de lembretes de tarefas_posvenda); Fase 3
// (2026-10-17) acrescenta a aba de histórico de alarmes, unificando o
// que antes só existia espalhado dentro de `mon_leituras`; Fase 4
// (2026-10-17) acrescenta "Conta de luz" — ferramenta de pós-venda que
// gera o relatório "Quanto sua casa consumiu?" (ver FaturaUsina.tsx).
// Essa ferramenta tem DOIS atalhos de propósito (pedido do usuário):
// esta aba (busca livre por cliente) e um botão dentro de cada usina em
// "Saúde da frota" (PainelSaude.tsx) — mesmo componente nos dois.
type MonTab = 'vinculo' | 'saude' | 'fila' | 'alarmes' | 'fatura';

const TABS: { key: MonTab; label: string; icon: typeof Link2 }[] = [
  { key: 'saude', label: 'Saúde da frota', icon: Activity },
  { key: 'fatura', label: 'Conta de luz', icon: Receipt },
  { key: 'fila', label: 'Fila de contato', icon: Phone },
  { key: 'alarmes', label: 'Alarmes', icon: Siren },
  { key: 'vinculo', label: 'Vínculo de usinas', icon: Link2 },
];

export default function MonitoramentoModule() {
  const [tab, setTab] = useState<MonTab>('saude');

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

      {tab === 'saude' && <PainelSaude />}
      {tab === 'fatura' && <ContaDeLuzTab />}
      {tab === 'fila' && <FilaContato />}
      {tab === 'alarmes' && <HistoricoAlarmes />}
      {tab === 'vinculo' && <VinculoUsinas />}
    </div>
  );
}
