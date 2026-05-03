import { useEffect, useState } from "react";
import EnergiaAdminLayout from "./EnergiaAdminLayout";
import { evCall, evGetAdminToken } from "@/lib/energiaApi";
import { Loader2, Check } from "lucide-react";

export default function EnergiaAdminResgates() {
  const [list, setList] = useState<any[]>([]);
  const [premios, setPremios] = useState<any[]>([]);
  const [indicadores, setIndicadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const tk = evGetAdminToken();
    const [r, p, i] = await Promise.all([
      evCall<{ data: any[] }>("admin_list", { tabela: "energia_resgates" }, tk),
      evCall<{ data: any[] }>("admin_list", { tabela: "energia_premios" }, tk),
      evCall<{ data: any[] }>("admin_list", { tabela: "energia_indicadores" }, tk),
    ]);
    setList(r.data || []); setPremios(p.data || []); setIndicadores(i.data || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const pMap = Object.fromEntries(premios.map(p => [p.id, p.nome]));
  const iMap = Object.fromEntries(indicadores.map(i => [i.id, i.nome]));

  const confirmar = async (id: string) => {
    await evCall("admin_confirmar_entrega", { id }, evGetAdminToken()); load();
  };

  const pendentes = list.filter(r => r.status === "pendente");
  const entregues = list.filter(r => r.status === "entregue");

  return (
    <EnergiaAdminLayout>
      <h1 className="text-2xl font-bold text-[#1A3C5E] mb-6">Resgates</h1>
      {loading ? <Loader2 className="animate-spin" /> : (
        <>
          <h2 className="font-bold mb-2">Pendentes ({pendentes.length})</h2>
          <div className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr><th className="text-left p-3">Cliente</th><th className="text-left p-3">Prêmio</th><th className="text-left p-3">Solicitado</th><th className="text-right p-3">Pontos</th><th></th></tr></thead>
              <tbody>
                {pendentes.map(r => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3">{iMap[r.indicador_id]}</td>
                    <td className="p-3">{pMap[r.premio_id]}</td>
                    <td className="p-3">{new Date(r.solicitado_em).toLocaleDateString("pt-BR")}</td>
                    <td className="p-3 text-right">{r.pontos_utilizados}</td>
                    <td className="p-3 text-right"><button onClick={() => confirmar(r.id)} className="px-3 py-1 bg-green-600 text-white rounded text-xs flex items-center gap-1 ml-auto"><Check className="w-3 h-3" /> Entregue</button></td>
                  </tr>
                ))}
                {pendentes.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-gray-400">Sem pendências</td></tr>}
              </tbody>
            </table>
          </div>

          <h2 className="font-bold mb-2">Histórico</h2>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr><th className="text-left p-3">Cliente</th><th className="text-left p-3">Prêmio</th><th className="text-left p-3">Entregue em</th></tr></thead>
              <tbody>
                {entregues.map(r => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3">{iMap[r.indicador_id]}</td>
                    <td className="p-3">{pMap[r.premio_id]}</td>
                    <td className="p-3">{r.entregue_em ? new Date(r.entregue_em).toLocaleDateString("pt-BR") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </EnergiaAdminLayout>
  );
}
