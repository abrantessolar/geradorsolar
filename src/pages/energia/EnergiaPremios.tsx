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
      <h1 className="text-2xl font-bold text-[#1A3C5E] mb-4">Catálogo de Prêmios</h1>
      {msg && <div className="mb-4 p-3 bg-green-50 text-green-800 rounded-lg text-sm">{msg}</div>}
      {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#E8651A]" /> : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {(data?.premios || []).map((p: any) => {
              const podeResgatar = data.indicador.pontos_acumulados >= p.pontos_necessarios;
              return (
                <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm flex flex-col items-center text-center">
                  {p.imagem_url ? <img src={p.imagem_url} alt={p.nome} className="w-24 h-24 object-contain mb-2" /> :
                    <div className="w-24 h-24 bg-[#F5A623]/20 rounded-xl flex items-center justify-center mb-2"><Gift className="w-12 h-12 text-[#F5A623]" /></div>}
                  <h3 className="font-bold text-[#1A3C5E] text-sm">{p.nome}</h3>
                  <p className="text-xs text-gray-500 mb-2">{p.pontos_necessarios} pts</p>
                  <button
                    onClick={() => resgatar(p.id)}
                    disabled={!podeResgatar}
                    className={`w-full h-9 rounded-lg text-xs font-bold flex items-center justify-center gap-1 ${
                      podeResgatar ? "bg-gradient-to-r from-[#F5A623] to-[#E8651A] text-white" : "bg-gray-200 text-gray-400"
                    }`}
                  >
                    {podeResgatar ? "Resgatar" : <><Lock className="w-3 h-3" /> Bloqueado</>}
                  </button>
                </div>
              );
            })}
          </div>

          {data?.resgates?.length > 0 && (
            <div className="mt-8">
              <h2 className="font-bold text-[#1A3C5E] mb-3">Histórico de resgates</h2>
              <div className="space-y-2">
                {data.resgates.map((r: any) => (
                  <div key={r.id} className="bg-white rounded-lg p-3 flex justify-between items-center text-sm">
                    <span>{r.energia_premios?.nome || "Prêmio"}</span>
                    <span className={`text-xs font-bold ${r.status === "entregue" ? "text-green-600" : "text-yellow-600"}`}>
                      {r.status === "entregue" ? <><Check className="inline w-3 h-3" /> Entregue</> : "Pendente"}
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
