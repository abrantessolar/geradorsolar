import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, Lock, Check } from "lucide-react";
import EnergiaLayout from "./EnergiaLayout";
import { useEnergia } from "@/contexts/EnergiaContext";
import { evCall } from "@/lib/energiaApi";
import { EPIC_STAGES, epicName } from "./_epic";

export default function EnergiaTrilha() {
  const { indicador, cpf } = useEnergia();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!indicador) return;
    evCall("cliente_dashboard", { indicador_id: indicador.id, cpf }).then(setData).finally(() => setLoading(false));
  }, [indicador, cpf]);

  if (!indicador) return <Navigate to="/energia" replace />;

  const backendEtapas: any[] = data?.etapas || [];
  const etapas = EPIC_STAGES.map((s, i) => {
    const found = backendEtapas.find(b => epicName(b.nome) === s.key);
    return { ...s, pontos_minimos: found?.pontos_minimos ?? i * 100, premio_id: found?.premio_id };
  });

  return (
    <EnergiaLayout>
      <h1 className="ev-font-epic text-3xl font-black mb-5 ev-text-glow" style={{ color: "#F5A623" }}>Sua Trilha Solar</h1>
      {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: "#F5A623" }} /> : (
        <div className="space-y-3">
          {etapas.map((e, idx) => {
            const conquistada = (data?.indicador?.pontos_acumulados || 0) >= e.pontos_minimos;
            const atual = epicName(data?.indicador?.etapa_atual) === e.key;
            const premio = (data?.premios || []).find((p: any) => p.id === e.premio_id);
            return (
              <div key={e.key}
                className={`ev-card p-4 flex gap-4 items-center ev-enter ${atual ? "ev-card-glow ev-pulse" : ""}`}
                style={{ animationDelay: `${idx * 0.08}s` }}>
                <div className="ev-frame-relic w-16 h-16">
                  <div className="w-full h-full rounded-full flex items-center justify-center text-2xl"
                    style={{
                      background: conquistada ? "linear-gradient(135deg, #F5A623, #E8651A)" : "#1A0F00",
                      boxShadow: conquistada ? `0 0 16px ${e.aura}` : "none",
                    }}>
                    {conquistada ? <span style={{ filter: "drop-shadow(0 0 4px #fff)" }}>{e.icon}</span> : <Lock className="w-5 h-5" style={{ color: "#A08060" }} />}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="ev-font-epic font-black text-lg" style={{ color: conquistada ? "#F5E6C8" : "#A08060" }}>{e.title}</h3>
                  <p className="text-xs" style={{ color: "#A08060" }}>{e.pontos_minimos} pontos de XP</p>
                  {premio && <p className="text-sm font-bold mt-1" style={{ color: "#F5A623" }}>🎁 {premio.nome}</p>}
                </div>
                <div className="ev-badge-epic" style={{ color: atual ? "#F5A623" : conquistada ? "#2E9E4F" : "#A08060" }}>
                  {atual ? "Atual" : conquistada ? <><Check className="w-3 h-3" /> Conquistado</> : "Bloqueado"}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </EnergiaLayout>
  );
}
