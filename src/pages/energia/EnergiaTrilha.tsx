import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, Lock, Check, Sun, Zap, Battery, Factory, Radio } from "lucide-react";
import EnergiaLayout from "./EnergiaLayout";
import { useEnergia } from "@/contexts/EnergiaContext";
import { evCall } from "@/lib/energiaApi";

const ICONS: Record<string, any> = { Raio: Zap, Painel: Sun, Gerador: Battery, Usina: Factory, Central: Radio, "Sol Maior": Sun };

export default function EnergiaTrilha() {
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
      <h1 className="text-2xl font-bold text-[#1A3C5E] mb-4">Sua Trilha Solar</h1>
      {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#E8651A]" /> : (
        <div className="space-y-3">
          {(data?.etapas || []).map((e: any) => {
            const conquistada = data.indicador.pontos_acumulados >= e.pontos_minimos;
            const atual = data.indicador.etapa_atual === e.nome;
            const Icon = ICONS[e.nome] || Sun;
            const premio = (data.premios || []).find((p: any) => p.id === e.premio_id);
            return (
              <div key={e.id} className={`bg-white rounded-2xl p-4 shadow-sm flex gap-4 items-center border-2 ${
                atual ? "border-[#F5A623]" : conquistada ? "border-[#F5A623]/30" : "border-transparent"
              }`}>
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                  atual ? "bg-gradient-to-br from-[#F5A623] to-[#E8651A] animate-pulse" :
                  conquistada ? "bg-[#F5A623]/80" : "bg-gray-200"
                }`}>
                  {conquistada && !atual ? <Check className="w-7 h-7 text-white" /> :
                   !conquistada && !atual ? <Lock className="w-6 h-6 text-gray-400" /> :
                   <Icon className="w-7 h-7 text-white" />}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-[#1A3C5E]">{e.nome}</h3>
                  <p className="text-xs text-gray-500">{e.pontos_minimos} pontos</p>
                  {premio && <p className="text-sm text-[#E8651A] font-medium">🎁 {premio.nome}</p>}
                </div>
                <div className="text-xs font-bold uppercase">
                  {atual ? <span className="text-[#F5A623]">Atual</span> :
                   conquistada ? <span className="text-green-600">Conquistado</span> :
                   <span className="text-gray-400">Bloqueado</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </EnergiaLayout>
  );
}
