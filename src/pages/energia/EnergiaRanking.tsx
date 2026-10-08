import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, Trophy, User } from "lucide-react";
import EnergiaLayout from "./EnergiaLayout";
import { useEnergia } from "@/contexts/EnergiaContext";
import { evCall } from "@/lib/energiaApi";
import { epicMeta } from "./_epic";

const POSITION_BORDER: Record<number, string> = { 1: "#F5A623", 2: "#8891A0", 3: "#1A3C5E" };

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
  const top3 = ranking.slice(0, 3);
  const resto = ranking.slice(3);

  return (
    <EnergiaLayout>
      <h1 className="text-2xl font-extrabold mb-5 flex items-center gap-2" style={{ color: "#1A2233" }}>
        <Trophy className="w-6 h-6" style={{ color: "#F5A623" }} /> Ranking
      </h1>
      {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: "#F5A623" }} /> : bloqueado ? (
        <div className="ev-card p-8 text-center" style={{ color: "#8891A0" }}>
          O ranking está oculto neste momento.
        </div>
      ) : (
        <>
          {top3.length > 0 && (
            <div className="grid grid-cols-3 gap-3 items-end mb-6">
              {[top3[1], top3[0], top3[2]].filter(Boolean).map((r: any, i: number) => {
                const realPos = ranking.findIndex((x: any) => x.id === r.id) + 1;
                const heights = ["h-32", "h-40", "h-28"];
                return (
                  <div key={r.id} className="flex flex-col items-center ev-enter">
                    <div className={`ev-card ${heights[i]} w-full p-3 flex flex-col items-center justify-end text-center`}
                      style={{ border: `2px solid ${POSITION_BORDER[realPos]}` }}>
                      <User className="w-6 h-6 mb-1" style={{ color: POSITION_BORDER[realPos] }} />
                      <p className="font-extrabold text-xs truncate w-full" style={{ color: "#1A2233" }}>{r.nome.split(" ")[0]}</p>
                      <p className="text-2xl font-extrabold" style={{ color: POSITION_BORDER[realPos] }}>{realPos}º</p>
                      <p className="text-[10px]" style={{ color: "#8891A0" }}>{r.pontos_historicos ?? r.pontos_acumulados ?? 0} pts</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="space-y-2">
            {resto.map((r: any, idx: number) => {
              const ehMeu = r.id === indicador.id;
              const pos = idx + 4;
              return (
                <div key={r.id} className="ev-card p-3 flex items-center gap-3 ev-enter"
                  style={ehMeu ? { border: "2px solid #F5A623" } : {}}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-extrabold"
                    style={{ background: "#FFF4E0", color: "#F5A623" }}>{pos}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate" style={{ color: "#1A2233" }}>{r.nome}</p>
                    <p className="text-xs" style={{ color: "#8891A0" }}>Nível {epicMeta(r.etapa_atual).title}</p>
                  </div>
                  <div className="font-extrabold" style={{ color: "#1A2233" }}>{r.pontos_historicos ?? r.pontos_acumulados ?? 0} pts</div>
                </div>
              );
            })}
            {ranking.length === 0 && <p className="text-center py-10" style={{ color: "#8891A0" }}>Ninguém no ranking ainda.</p>}
            {minhaPos === 0 && ranking.length > 0 && (
              <p className="text-center text-xs mt-4" style={{ color: "#8891A0" }}>Você ainda não está no ranking. Continue indicando!</p>
            )}
          </div>
        </>
      )}
    </EnergiaLayout>
  );
}
