import { useEffect, useState } from "react";
import EnergiaAdminLayout from "./EnergiaAdminLayout";
import { evCall, evGetAdminToken } from "@/lib/energiaApi";
import { Loader2, Users, TrendingUp, DollarSign, Package, Star } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

export default function EnergiaAdminVisaoGeral() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    evCall("admin_overview", {}, evGetAdminToken()).then(setData).finally(() => setLoading(false));
  }, []);

  return (
    <EnergiaAdminLayout>
      <h1 className="text-2xl font-bold text-[#1A3C5E] mb-6">Visão Geral</h1>
      {loading ? <Loader2 className="w-8 h-8 animate-spin text-[#E8651A]" /> : data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            <Card icon={Users} color="#1A3C5E" label="Indicadores" value={data.stats.total} sub={`${data.stats.ativos} ativos`} />
            <Card icon={TrendingUp} color="#F5A623" label="Indicações no mês" value={data.stats.fechadas + data.stats.negociacao + data.stats.enviadas}
              sub={`${data.stats.fechadas} fechadas / ${data.stats.negociacao} negociação`} />
            <Card icon={DollarSign} color="#E8651A" label="Volume gerado" value={`R$ ${(data.stats.volume).toLocaleString("pt-BR")}`} />
            <Card icon={Star} color="#2E9E4F" label="Pontos do mês" value={data.stats.pontos_mes ?? 0} sub="distribuídos" />
            <Card icon={Package} color={data.stats.resgates_pendentes > 0 ? "#dc2626" : "#16a34a"} label="Resgates pendentes" value={data.stats.resgates_pendentes} />
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h2 className="font-bold text-[#1A3C5E] mb-3">Indicações por mês</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.grafico}>
                <XAxis dataKey="mes" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="indicacoes" fill="#F5A623" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </EnergiaAdminLayout>
  );
}

function Card({ icon: Icon, color, label, value, sub }: any) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + "20", color }}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
      <div className="text-2xl font-bold text-[#1A3C5E]">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}
