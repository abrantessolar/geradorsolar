import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, Lock, Check, Gift } from "lucide-react";
import EnergiaLayout from "./EnergiaLayout";
import { useEnergia } from "@/contexts/EnergiaContext";
import { evCall } from "@/lib/energiaApi";
import { EPIC_STAGES, epicName, epicMetaByName } from "./_epic";

export default function EnergiaTrilha() {
  const { indicador, cpf } = useEnergia();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!indicador) return;
    evCall("cliente_dashboard", { indicador_id: indicador.id, cpf }).then(setData).finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indicador, cpf]);

  if (!indicador) return <Navigate to="/energia" replace />;

  const backendEtapas: any[] = (data?.etapas || []).slice().sort((a: any, b: any) => (a.pontos_minimos ?? 0) - (b.pontos_minimos ?? 0));
  const etapas = (backendEtapas.length ? backendEtapas : EPIC_STAGES.map((s, i) => ({ nome: s.title, pontos_minimos: i * 100 }))).map((b: any) => {
    const meta = epicMetaByName(b.nome);
    return { ...meta, title: b.nome || meta.title, pontos_minimos: b.pontos_minimos ?? 0, premio_id: b.premio_id };
  });

  return (
    <EnergiaLayout>
      <h1 className="text-2xl font-extrabold mb-5" style={{ color: "#1A2233" }}>Seu nível</h1>
      {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: "#F5A623" }} /> : (
        <div className="space-y-3">
          {etapas.map((e, idx) => {
            const pHist = data?.indicador?.pontos_historicos ?? data?.indicador?.pontos_acumulados ?? 0;
            const conquistada = pHist >= e.pontos_minimos;
            const atual = epicName(data?.indicador?.etapa_atual) === e.key;
            const premio = (data?.premios || []).find((p: any) => p.id === e.premio_id);
            return (
              <div key={e.key}
                className="ev-card p-4 flex gap-4 items-center ev-enter"
                style={{ animationDelay: `${idx * 0.05}s`, border: atual ? "2px solid #F5A623" : undefined }}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: conquistada ? "#F5A623" : "#F5F7FA",
                    border: `2px solid ${conquistada ? "#F5A623" : "#E3E8EF"}`,
                  }}>
                  {conquistada ? <Check className="w-5 h-5" style={{ color: "#1A2233" }} /> : <Lock className="w-4 h-4" style={{ color: "#B4BDC9" }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-extrabold text-base" style={{ color: conquistada ? "#1A2233" : "#8891A0" }}>{e.title}</h3>
                  <p className="text-xs" style={{ color: "#8891A0" }}>{e.pontos_minimos} pts históricos necessários</p>
                  {premio && (
                    <p className="text-sm font-semibold mt-1 flex items-center gap-1" style={{ color: "#F5A623" }}>
                      <Gift className="w-3.5 h-3.5" /> {premio.nome}
                    </p>
                  )}
                </div>
                <div className="ev-badge-epic flex-shrink-0" style={{ color: atual ? "#F5A623" : conquistada ? "#15803D" : "#8891A0" }}>
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
