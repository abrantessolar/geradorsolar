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
      <h1 className="text-2xl font-extrabold mb-3" style={{ color: "#1A2233" }}>Prêmios</h1>
      {!loading && (
        <div className="mb-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
          style={{ background: "#FFF4E0", color: "#1A2233" }}>
          Saldo disponível: <b style={{ color: "#F5A623" }}>{pDisp} pts</b>
        </div>
      )}
      {msg && (
        <div className="mb-4 p-3 rounded-lg text-sm ev-enter"
          style={{ background: "#DCFCE7", color: "#15803D" }}>{msg}</div>
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
                  className="ev-card p-4 flex flex-col items-center text-center relative ev-enter"
                  style={{ animationDelay: `${idx * 0.05}s`, opacity: podeResgatar ? 1 : 0.7 }}>
                  {jaResgatado && (
                    <div className="absolute top-2 right-2 rounded-full w-7 h-7 flex items-center justify-center"
                      style={{ background: "#F5A623", color: "#1A2233" }}>
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                  <div className="w-24 h-24 rounded-xl mb-3 flex items-center justify-center" style={{ background: "#F5F7FA", border: "1px solid #E3E8EF" }}>
                    <div className="w-full h-full rounded-xl flex items-center justify-center overflow-hidden"
                      style={{ filter: podeResgatar ? "none" : "grayscale(1) brightness(1.1)" }}>
                      {isPremioIcon(p.imagem_url)
                        ? <PremioIcon value={p.imagem_url} size={80} />
                        : p.imagem_url
                          ? <img src={p.imagem_url} alt={p.nome} className="w-20 h-20 object-contain" />
                          : <Gift className="w-10 h-10" style={{ color: "#F5A623" }} />}
                    </div>
                  </div>
                  <h3 className="font-extrabold text-sm" style={{ color: "#1A2233" }}>{p.nome}</h3>
                  <p className="text-xs font-semibold" style={{ color: "#F5A623" }}>{p.pontos_necessarios} pts</p>
                  {!podeResgatar && (
                    <p className="text-[10px] mb-2 mt-0.5" style={{ color: "#8891A0" }}>Faltam {faltam} pts disponíveis</p>
                  )}
                  {podeResgatar && <div className="mb-2" />}
                  <button onClick={() => {
                    if (!podeResgatar) return;
                    if (!confirm(`Você tem ${pDisp} pts disponíveis.\nEste prêmio custa ${p.pontos_necessarios} pts.\nApós o resgate: ${pDisp - p.pontos_necessarios} pts disponíveis.\nSeu nível não será afetado.\n\nResgatar?`)) return;
                    resgatar(p.id);
                  }} disabled={!podeResgatar}
                    className="w-full h-9 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                    style={
                      podeResgatar ? { background: "#F5A623", color: "#1A2233" }
                      : { background: "#FFFFFF", color: "#8891A0", border: "1px solid #E3E8EF" }
                    }>
                    {podeResgatar ? `Resgatar por ${p.pontos_necessarios} pts` : <><Lock className="w-3 h-3" /> Bloqueado</>}
                  </button>
                </div>
              );
            })}
          </div>

          {data?.resgates?.length > 0 && (
            <div className="mt-8">
              <h2 className="font-extrabold mb-3 text-lg" style={{ color: "#1A2233" }}>Histórico de resgates</h2>
              <div className="space-y-2">
                {data.resgates.map((r: any) => (
                  <div key={r.id} className="ev-card p-3 flex justify-between items-center text-sm">
                    <span style={{ color: "#1A2233" }}>{r.energia_premios?.nome || "Prêmio"}</span>
                    <span className="ev-badge-epic" style={{ color: r.status === "entregue" ? "#15803D" : "#F5A623" }}>
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
