import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, Gift, Check, Lock } from "lucide-react";
import EnergiaLayout from "./EnergiaLayout";
import { useEnergia } from "@/contexts/EnergiaContext";
import { evCall } from "@/lib/energiaApi";

export default function EnergiaPremios() {
  const { indicador, cpf } = useEnergia();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const load = () => {
    if (!indicador) return;
    evCall("cliente_dashboard", { indicador_id: indicador.id, cpf }).then(setData).finally(() => setLoading(false));
  };
  useEffect(load, [indicador, cpf]);

  const resgatar = async (premio_id: string) => {
    try {
      const r = await evCall<{ mensagem: string }>("cliente_resgatar", { indicador_id: indicador!.id, cpf, premio_id });
      setMsg(r.mensagem || "Resgate solicitado!");
      load();
    } catch (e: any) { setMsg(e.message); }
  };

  if (!indicador) return <Navigate to="/energia" replace />;

  return (
    <EnergiaLayout>
      <h1 className="ev-font-epic text-3xl font-black mb-5 ev-text-glow" style={{ color: "#F5A623" }}>Câmara das Relíquias</h1>
      {msg && (
        <div className="mb-4 p-3 rounded-lg text-sm ev-enter"
          style={{ background: "rgba(46,158,79,0.18)", border: "1px solid rgba(46,158,79,0.5)", color: "#F5E6C8" }}>{msg}</div>
      )}
      {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: "#F5A623" }} /> : (
        <>
          <div className="grid grid-cols-2 gap-4">
            {(data?.premios || []).map((p: any, idx: number) => {
              const podeResgatar = data.indicador.pontos_acumulados >= p.pontos_necessarios;
              const jaResgatado = (data?.resgates || []).some((r: any) => r.premio_id === p.id);
              return (
                <div key={p.id}
                  className={`ev-card p-4 flex flex-col items-center text-center relative ev-enter ${podeResgatar && !jaResgatado ? "ev-card-glow" : ""}`}
                  style={{ animationDelay: `${idx * 0.05}s` }}>
                  {jaResgatado && (
                    <div className="absolute top-2 right-2 rounded-full w-7 h-7 flex items-center justify-center"
                      style={{ background: "#2E9E4F", color: "#fff", boxShadow: "0 0 10px #2E9E4F" }}>
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                  <div className="ev-frame-relic w-28 h-28 mb-3">
                    <div className="w-full h-full rounded-full flex items-center justify-center overflow-hidden"
                      style={{ filter: podeResgatar || jaResgatado ? "none" : "grayscale(1) brightness(0.5)" }}>
                      {p.imagem_url
                        ? <img src={p.imagem_url} alt={p.nome} className="w-24 h-24 object-contain" />
                        : <Gift className="w-12 h-12" style={{ color: "#F5A623" }} />}
                    </div>
                  </div>
                  <h3 className="ev-font-epic font-black text-sm" style={{ color: "#F5E6C8" }}>{p.nome}</h3>
                  <p className="text-xs mb-3 ev-font-epic uppercase tracking-wider" style={{ color: "#F5A623" }}>{p.pontos_necessarios} pts</p>
                  <button onClick={() => resgatar(p.id)} disabled={!podeResgatar || jaResgatado}
                    className={`w-full h-9 rounded-lg text-xs font-bold ev-font-epic flex items-center justify-center gap-1`}
                    style={
                      jaResgatado ? { background: "rgba(46,158,79,0.2)", color: "#7DD89C", border: "1px solid #2E9E4F" }
                      : podeResgatar ? { background: "linear-gradient(135deg, #F5A623, #E8651A)", color: "#0D0A00", boxShadow: "0 0 16px rgba(245,166,35,0.5)" }
                      : { background: "rgba(0,0,0,0.4)", color: "#A08060", border: "1px solid rgba(193,127,36,0.3)" }
                    }>
                    {jaResgatado ? <><Check className="w-3 h-3" /> CONQUISTADO</>
                      : podeResgatar ? "RESGATAR" : <><Lock className="w-3 h-3" /> BLOQUEADO</>}
                  </button>
                </div>
              );
            })}
          </div>

          {data?.resgates?.length > 0 && (
            <div className="mt-8">
              <h2 className="ev-font-epic font-black mb-3 text-lg" style={{ color: "#F5A623" }}>Histórico de conquistas</h2>
              <div className="space-y-2">
                {data.resgates.map((r: any) => (
                  <div key={r.id} className="ev-card p-3 flex justify-between items-center text-sm">
                    <span style={{ color: "#F5E6C8" }}>{r.energia_premios?.nome || "Prêmio"}</span>
                    <span className="ev-badge-epic" style={{ color: r.status === "entregue" ? "#2E9E4F" : "#F5A623" }}>
                      {r.status === "entregue" ? <><Check className="w-3 h-3" /> Entregue</> : "Pendente"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </EnergiaLayout>
  );
}
