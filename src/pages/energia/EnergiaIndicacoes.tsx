import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, MapPin, Zap } from "lucide-react";
import EnergiaLayout from "./EnergiaLayout";
import { useEnergia } from "@/contexts/EnergiaContext";
import { evCall } from "@/lib/energiaApi";

const STATUS_LABEL: any = { enviada: "Em Rota", negociacao: "Em Batalha", fechada: "Vitória!" };
const STATUS_COLOR: any = {
  enviada: "#00C2FF", negociacao: "#F5A623", fechada: "#2E9E4F",
};

export default function EnergiaIndicacoes() {
  const { indicador, cpf } = useEnergia();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!indicador) return;
    evCall("cliente_dashboard", { indicador_id: indicador.id, cpf }).then(setData).finally(() => setLoading(false));
  }, [indicador, cpf]);

  if (!indicador) return <Navigate to="/energia" replace />;

  return (
    <EnergiaLayout>
      <h1 className="ev-font-epic text-3xl font-black mb-5 ev-text-glow" style={{ color: "#F5A623" }}>Suas Missões</h1>
      {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: "#F5A623" }} /> : (
        <div className="space-y-3">
          {(data?.indicacoes || []).length === 0 && (
            <div className="ev-card p-8 text-center" style={{ color: "#A08060" }}>
              Nenhuma missão registrada ainda. Compartilhe seu portal!
            </div>
          )}
          {(data?.indicacoes || []).map((i: any, idx: number) => (
            <div key={i.id} className="ev-card p-4 flex justify-between items-center ev-enter"
              style={{ animationDelay: `${idx * 0.05}s` }}>
              <div className="min-w-0">
                <p className="ev-font-epic font-bold truncate" style={{ color: "#F5E6C8" }}>{i.nome_indicado || "Missão anônima"}</p>
                <p className="text-xs flex items-center gap-2 mt-1" style={{ color: "#A08060" }}>
                  {i.cidade && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {i.cidade}</span>}
                  <span>· {new Date(i.criado_em).toLocaleDateString("pt-BR")}</span>
                </p>
                {i.pontos_creditados > 0 && (
                  <p className="text-xs font-bold mt-1 ev-sparkle" style={{ color: "#F5A623" }}>+{i.pontos_creditados} pts</p>
                )}
              </div>
              <span className="ev-badge-epic" style={{ color: STATUS_COLOR[i.status] }}>
                {i.status === "fechada" && <Zap className="w-3 h-3" />} {STATUS_LABEL[i.status] || i.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </EnergiaLayout>
  );
}
