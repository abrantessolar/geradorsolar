import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, Trophy, Crown } from "lucide-react";
import EnergiaLayout from "./EnergiaLayout";
import { useEnergia } from "@/contexts/EnergiaContext";
import { evCall } from "@/lib/energiaApi";
import { epicMeta } from "./_epic";

const POSITION_BORDER: Record<number, string> = { 1: "#F5A623", 2: "#C0C0C0", 3: "#CD7F32" };

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
      <h1 className="ev-font-epic text-3xl font-black mb-5 ev-text-glow flex items-center gap-2" style={{ color: "#F5A623" }}>
        <Trophy className="w-7 h-7 ev-sparkle" /> Hall dos Guerreiros
      </h1>
      {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: "#F5A623" }} /> : bloqueado ? (
        <div className="ev-card p-8 text-center" style={{ color: "#A08060" }}>
          O Hall está oculto neste momento.
        </div>
      ) : (
        <>
          {top3.length > 0 && (
            <div className="grid grid-cols-3 gap-3 items-end mb-6">
              {[top3[1], top3[0], top3[2]].filter(Boolean).map((r: any, i: number) => {
                const realPos = ranking.findIndex((x: any) => x.id === r.id) + 1;
                const heights = ["h-32", "h-40", "h-28"];
                const meta = epicMeta(r.etapa_atual);
                return (
                  <div key={r.id} className="flex flex-col items-center ev-enter">
                    {realPos === 1 && <Crown className="w-6 h-6 mb-1" style={{ color: "#F5A623", filter: "drop-shadow(0 0 8px #F5A623)" }} />}
                    <div className={`ev-card ${heights[i]} w-full p-3 flex flex-col items-center justify-end text-center`}
                      style={{
                        border: `2px solid ${POSITION_BORDER[realPos]}`,
                        boxShadow: `0 0 18px ${POSITION_BORDER[realPos]}55`,
                      }}>
                      <div className="text-3xl mb-1">{meta.icon}</div>
                      <p className="ev-font-epic font-black text-xs truncate w-full" style={{ color: "#F5E6C8" }}>{r.nome.split(" ")[0]}</p>
                      <p className="ev-font-epic text-2xl font-black ev-text-glow" style={{ color: POSITION_BORDER[realPos] }}>{realPos}º</p>
                      <p className="text-[10px]" style={{ color: "#A08060" }}>{r.pontos_historicos ?? r.pontos_acumulados ?? 0} pts</p>
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
                  style={ehMeu ? { border: "2px solid #E8651A", boxShadow: "0 0 18px rgba(232,101,26,0.5)" } : {}}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-black ev-font-epic"
                    style={{ background: "rgba(245,166,35,0.15)", color: "#F5A623", border: "1px solid rgba(245,166,35,0.4)" }}>{pos}</div>
                  <div className="flex-1 min-w-0">
                    <p className="ev-font-epic font-bold truncate" style={{ color: "#F5E6C8" }}>{r.nome}</p>
                    <p className="text-xs" style={{ color: "#A08060" }}>{epicMeta(r.etapa_atual).title}</p>
                  </div>
                  <div className="font-black ev-text-glow" style={{ color: "#F5A623" }}>{r.pontos_historicos ?? r.pontos_acumulados ?? 0} pts</div>
                </div>
              );
            })}
            {ranking.length === 0 && <p className="text-center py-10" style={{ color: "#A08060" }}>Sem guerreiros no Hall ainda.</p>}
            {minhaPos === 0 && ranking.length > 0 && (
              <p className="text-center text-xs mt-4" style={{ color: "#A08060" }}>Você ainda não está no Hall. Continue indicando!</p>
            )}
          </div>
        </>
      )}
    </EnergiaLayout>
  );
}
