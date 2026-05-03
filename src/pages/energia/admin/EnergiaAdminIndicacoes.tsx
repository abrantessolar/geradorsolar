import { useEffect, useState } from "react";
import EnergiaAdminLayout from "./EnergiaAdminLayout";
import { evCall, evGetAdminToken } from "@/lib/energiaApi";
import { Loader2 } from "lucide-react";

export default function EnergiaAdminIndicacoes() {
  const [list, setList] = useState<any[]>([]);
  const [indicadores, setIndicadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const tk = evGetAdminToken();
    const [a, b] = await Promise.all([
      evCall<{ data: any[] }>("admin_list", { tabela: "energia_indicacoes" }, tk),
      evCall<{ data: any[] }>("admin_list", { tabela: "energia_indicadores" }, tk),
    ]);
    setList(a.data || []); setIndicadores(b.data || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const indMap = Object.fromEntries(indicadores.map(i => [i.id, i.nome]));

  const updateStatus = async (id: string, status: string) => {
    const valor = list.find(l => l.id === id)?.valor_negocio || 0;
    let v = valor;
    if (status === "fechada") {
      const r = prompt("Valor do negócio (R$)?", String(valor));
      if (r === null) return;
      v = Number(r);
    }
    await evCall("admin_update_indicacao_status", { id, status, valor_negocio: v }, evGetAdminToken());
    load();
  };

  return (
    <EnergiaAdminLayout>
      <h1 className="text-2xl font-bold text-[#1A3C5E] mb-6">Indicações</h1>
      {loading ? <Loader2 className="animate-spin" /> : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Indicador</th><th className="text-left p-3">Indicado</th>
                <th className="text-left p-3">Data</th><th className="text-right p-3">Valor</th>
                <th className="text-left p-3">Status</th><th className="text-right p-3">Pontos</th>
              </tr>
            </thead>
            <tbody>
              {list.map(i => (
                <tr key={i.id} className="border-t">
                  <td className="p-3">{indMap[i.indicador_id] || "—"}</td>
                  <td className="p-3">{i.nome_indicado || "—"}</td>
                  <td className="p-3">{new Date(i.criado_em).toLocaleDateString("pt-BR")}</td>
                  <td className="p-3 text-right">R$ {Number(i.valor_negocio||0).toLocaleString("pt-BR")}</td>
                  <td className="p-3">
                    <select value={i.status} onChange={e => updateStatus(i.id, e.target.value)} className="border rounded px-2 h-8">
                      <option value="enviada">Enviada</option>
                      <option value="negociacao">Em negociação</option>
                      <option value="fechada">Fechada</option>
                    </select>
                  </td>
                  <td className="p-3 text-right font-bold">{i.pontos_creditados || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </EnergiaAdminLayout>
  );
}
