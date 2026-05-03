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
  const [notifSent, setNotifSent] = useState<Record<string, boolean>>({});
  const [sending, setSending] = useState<string | null>(null);

  const refetch = () => {
    if (!indicador) return;
    evCall("cliente_dashboard", { indicador_id: indicador.id, cpf }).then(setData).finally(() => setLoading(false));
  };

  useEffect(() => {
    refetch();
    const t = setInterval(refetch, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indicador, cpf]);

  useEffect(() => {
    // load localStorage flags
    const map: Record<string, boolean> = {};
    (data?.indicacoes || []).forEach((i: any) => {
      if (localStorage.getItem(`notif_${i.id}`)) map[i.id] = true;
    });
    setNotifSent(map);
  }, [data]);

  if (!indicador) return <Navigate to="/energia" replace />;

  const handleFechou = async (i: any) => {
    if (!confirm("Tem certeza? Isso vai notificar nossa equipe para confirmar o fechamento.")) return;
    setSending(i.id);
    try {
      await evCall("cliente_solicitar_confirmacao", {
        indicador_id: indicador.id, cpf, indicacao_id: i.id,
      });
      localStorage.setItem(`notif_${i.id}`, "1");
      setNotifSent(s => ({ ...s, [i.id]: true }));
      alert("Notificação enviada! Nossa equipe vai confirmar em breve.");
    } catch (e: any) {
      alert(e.message || "Erro ao enviar notificação");
    } finally {
      setSending(null);
    }
  };

  return (
    <EnergiaLayout>
      <h1 className="ev-font-epic text-3xl font-black mb-5 ev-text-glow" style={{ color: "#F5A623" }}>Suas Indicações</h1>
      {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: "#F5A623" }} /> : (
        <div className="space-y-3">
          {(data?.indicacoes || []).length === 0 && (
            <div className="ev-card p-8 text-center" style={{ color: "#A08060" }}>
              Nenhuma indicação registrada ainda. Compartilhe seu portal!
            </div>
          )}
          {(data?.indicacoes || []).map((i: any, idx: number) => {
            const podeNotificar = (i.status === "enviada" || i.status === "negociacao") && !notifSent[i.id];
            return (
              <div key={i.id} className="ev-card p-4 flex justify-between items-center gap-3 ev-enter"
                style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className="min-w-0 flex-1">
                  <p className="ev-font-epic font-bold truncate" style={{ color: "#F5E6C8" }}>{i.nome_indicado || "Indicação anônima"}</p>
                  <p className="text-xs flex items-center gap-2 mt-1" style={{ color: "#A08060" }}>
                    {i.cidade && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {i.cidade}</span>}
                    <span>· {new Date(i.criado_em).toLocaleDateString("pt-BR")}</span>
                  </p>
                  {i.pontos_creditados > 0 && (
                    <p className="text-xs font-bold mt-1 ev-sparkle" style={{ color: "#F5A623" }}>+{i.pontos_creditados} pts</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="ev-badge-epic" style={{ color: STATUS_COLOR[i.status] }}>
                    {i.status === "fechada" && <Zap className="w-3 h-3" />} {STATUS_LABEL[i.status] || i.status}
                  </span>
                  {podeNotificar && (
                    <button
                      onClick={() => handleFechou(i)}
                      disabled={sending === i.id}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1"
                      style={{ background: "#F5A623", color: "#0D0A00", boxShadow: "0 0 8px rgba(245,166,35,0.5)" }}>
                      ⚡ {sending === i.id ? "Enviando..." : "Fechou!"}
                    </button>
                  )}
                  {notifSent[i.id] && i.status !== "fechada" && (
                    <span className="text-[10px]" style={{ color: "#2E9E4F" }}>✓ Notificação enviada</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </EnergiaLayout>
  );
}
