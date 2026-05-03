import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, Trophy } from "lucide-react";
import EnergiaLayout from "./EnergiaLayout";
import { useEnergia } from "@/contexts/EnergiaContext";
import { evCall } from "@/lib/energiaApi";

export default function EnergiaRanking() {
  const { indicador, cpf } = useEnergia();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!indicador) return;
    evCall("cliente_dashboard", { indicador_id: indicador.id, cpf }).then(setData).finally(() => setLoading(false));
  }, [indicador, cpf]);

  if (!indicador) return <Navigate to="/energia" replace />;

  const ranking = data?.ranking || [];
  const minhaPos = ranking.findIndex((r: any) => r.id === indicador.id) + 1;
  const bloqueado = data && data.ranking_publico === false;

  return (
    <EnergiaLayout>
      <h1 className="text-2xl font-bold text-[#1A3C5E] mb-4 flex items-center gap-2"><Trophy className="text-[#F5A623]" /> Ranking do Mês</h1>
      {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#E8651A]" /> : bloqueado ? (
        <div className="bg-white rounded-xl p-6 text-center text-gray-500">
          O ranking público está desativado no momento.
        </div>
      ) : (
        <div className="space-y-2">
          {ranking.map((r: any, idx: number) => {
            const ehMeu = r.id === indicador.id;
            return (
              <div key={r.id} className={`rounded-xl p-3 flex items-center gap-3 ${ehMeu ? "bg-gradient-to-r from-[#F5A623] to-[#E8651A] text-white shadow-lg" : "bg-white"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${ehMeu ? "bg-white text-[#E8651A]" : "bg-[#1A3C5E] text-white"}`}>{idx + 1}</div>
                <div className="flex-1">
                  <p className="font-bold">{r.nome}</p>
                  <p className={`text-xs ${ehMeu ? "text-white/80" : "text-gray-500"}`}>{r.etapa_atual || "Raio"}</p>
                </div>
                <div className="font-bold">{r.pontos_acumulados} pts</div>
              </div>
            );
          })}
          {ranking.length === 0 && <p className="text-center text-gray-500 py-10">Sem indicadores no ranking ainda.</p>}
          {minhaPos === 0 && <p className="text-center text-xs text-gray-500 mt-4">Você não está no top 10. Continue indicando!</p>}
        </div>
      )}
    </EnergiaLayout>
  );
}
