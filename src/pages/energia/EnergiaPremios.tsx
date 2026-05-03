import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, Gift, Check, Lock } from "lucide-react";
import EnergiaLayout from "./EnergiaLayout";
import { useEnergia } from "@/contexts/EnergiaContext";
import { evCall } from "@/lib/energiaApi";
import { PremioIcon, isPremioIcon } from "./premioIcons";

export default function EnergiaPremios() {
  const { indicador, cpf } = useEnergia();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

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

  const resgatar = async (premio_id: string) => {
    try {
      const r = await evCall<{ mensagem: string }>("cliente_resgatar", { indicador_id: indicador!.id, cpf, premio_id });
      setMsg(r.mensagem || "Resgate solicitado!");
      load();
    } catch (e: any) { setMsg(e.message); }
  };

  if (!indicador) return <Navigate to="/energia" replace />;

  const pDisp = data?.indicador?.pontos_disponiveis ?? data?.indicador?.pontos_acumulados ?? 0;

  return (
    <EnergiaLayout>
      <h1 className="ev-font-epic text-3xl font-black mb-3 ev-text-glow" style={{ color: "#F5A623" }}>Câmara das Relíquias</h1>
      {!loading && (
        <div className="mb-4 inline-flex items-center gap-2 px-4 py-2 rounded-full ev-font-epic text-sm"
          style={{ background: "linear-gradient(135deg, rgba(245,166,35,0.2), rgba(232,101,26,0.2))", border: "1px solid #F5A623", color: "#F5E6C8" }}>
          <span>🎁</span> Saldo disponível: <b style={{ color: "#F5A623" }}>{pDisp} pts</b>
        </div>
      )}
      {msg && (
        <div className="mb-4 p-3 rounded-lg text-sm ev-enter"
          style={{ background: "rgba(46,158,79,0.18)", border: "1px solid rgba(46,158,79,0.5)", color: "#F5E6C8" }}>{msg}</div>
      )}
      {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: "#F5A623" }} /> : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(data?.premios || []).map((p: any, idx: number) => {
              const podeResgatar = pDisp >= p.pontos_necessarios;
              const jaResgatado = (data?.resgates || []).some((r: any) => r.premio_id === p.id);
              const faltam = p.pontos_necessarios - pDisp;
              return (
                <div key={p.id}
                  className={`ev-card p-4 flex flex-col items-center text-center relative ev-enter ${podeResgatar ? "ev-card-glow" : ""}`}
                  style={{ animationDelay: `${idx * 0.05}s` }}>
                  {jaResgatado && (
                    <div className="absolute top-2 right-2 rounded-full w-7 h-7 flex items-center justify-center"
                      style={{ background: "#F5A623", color: "#0D0A00", boxShadow: "0 0 10px #F5A623" }}>
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                  <div className="ev-frame-relic w-28 h-28 mb-3">
                    <div className="w-full h-full rounded-full flex items-center justify-center overflow-hidden"
                      style={{ filter: podeResgatar ? "none" : "grayscale(1) brightness(0.5)" }}>
                      {isPremioIcon(p.imagem_url)
                        ? <PremioIcon value={p.imagem_url} size={96} />
                        : p.imagem_url
                          ? <img src={p.imagem_url} alt={p.nome} className="w-24 h-24 object-contain" />
                          : <Gift className="w-12 h-12" style={{ color: "#F5A623" }} />}
                    </div>
                  </div>
                  <h3 className="ev-font-epic font-black text-sm" style={{ color: "#F5E6C8" }}>{p.nome}</h3>
                  <p className="text-xs ev-font-epic uppercase tracking-wider" style={{ color: "#F5A623" }}>{p.pontos_necessarios} pts</p>
                  {!podeResgatar && (
                    <p className="text-[10px] mb-2" style={{ color: "#A08060" }}>Faltam {faltam} pts disponíveis</p>
                  )}
                  {podeResgatar && <div className="mb-2" />}
                  <button onClick={() => {
                    if (!podeResgatar) return;
                    if (!confirm(`Você tem ${pDisp} pts disponíveis.\nEste prêmio custa ${p.pontos_necessarios} pts.\nApós o resgate: ${pDisp - p.pontos_necessarios} pts disponíveis.\nSeu nível não será afetado.\n\nResgatar?`)) return;
                    resgatar(p.id);
                  }} disabled={!podeResgatar}
                    className={`w-full h-9 rounded-lg text-xs font-bold ev-font-epic flex items-center justify-center gap-1`}
                    style={
                      podeResgatar ? { background: "linear-gradient(135deg, #F5A623, #E8651A)", color: "#0D0A00", boxShadow: "0 0 16px rgba(245,166,35,0.5)" }
                      : { background: "rgba(0,0,0,0.4)", color: "#A08060", border: "1px solid rgba(193,127,36,0.3)" }
                    }>
                    {podeResgatar ? `RESGATAR POR ${p.pontos_necessarios} PTS` : <><Lock className="w-3 h-3" /> BLOQUEADO</>}
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
