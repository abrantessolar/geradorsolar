import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import EnergiaLayout from "./EnergiaLayout";
import { useEnergia } from "@/contexts/EnergiaContext";
import { evCall } from "@/lib/energiaApi";

const STATUS_LABEL: any = { enviada: "Enviada", negociacao: "Em negociação", fechada: "Fechada" };
const STATUS_COLOR: any = { enviada: "bg-gray-200 text-gray-700", negociacao: "bg-yellow-200 text-yellow-800", fechada: "bg-green-200 text-green-800" };

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
      <h1 className="text-2xl font-bold text-[#1A3C5E] mb-4">Minhas Indicações</h1>
      {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#E8651A]" /> : (
        <div className="space-y-2">
          {(data?.indicacoes || []).length === 0 && <p className="text-center text-gray-500 py-10">Nenhuma indicação ainda. Compartilhe seu link!</p>}
          {(data?.indicacoes || []).map((i: any) => (
            <div key={i.id} className="bg-white rounded-xl p-4 shadow-sm flex justify-between items-center">
              <div>
                <p className="font-medium text-[#1A3C5E]">{i.nome_indicado || "Indicação anônima"}</p>
                <p className="text-xs text-gray-500">
                  {new Date(i.criado_em).toLocaleDateString("pt-BR")}
                  {i.cidade && <> · {i.cidade}</>}
                </p>
                {i.pontos_creditados > 0 && <p className="text-xs text-[#E8651A] font-bold">+{i.pontos_creditados} pts</p>}
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLOR[i.status]}`}>{STATUS_LABEL[i.status]}</span>
            </div>
          ))}
        </div>
      )}
    </EnergiaLayout>
  );
}
