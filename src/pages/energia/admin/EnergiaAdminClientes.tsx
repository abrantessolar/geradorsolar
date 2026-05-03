import { useEffect, useMemo, useState } from "react";
import EnergiaAdminLayout from "./EnergiaAdminLayout";
import { evCall, evGetAdminToken, evMaskCpf } from "@/lib/energiaApi";
import { Loader2, Plus, Search } from "lucide-react";

export default function EnergiaAdminClientes() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<any>(null);
  const [adding, setAdding] = useState<any>(null);
  const [pontosModal, setPontosModal] = useState<any>(null);

  const load = () => {
    setLoading(true);
    evCall<{ data: any[] }>("admin_list", { tabela: "energia_indicadores" }, evGetAdminToken())
      .then(r => setList(r.data || [])).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return list.filter(i => !q || i.nome.toLowerCase().includes(q) || (i.cpf || "").includes(q));
  }, [list, search]);

  const create = async () => {
    try {
      await evCall("admin_create_indicador", adding, evGetAdminToken());
      setAdding(null); load();
    } catch (e: any) { alert(e.message); }
  };

  const saveToggle = async (i: any) => {
    await evCall("admin_upsert", { tabela: "energia_indicadores", row: { id: i.id, aparece_ranking: !i.aparece_ranking } }, evGetAdminToken());
    load();
  };

  const addPontos = async () => {
    await evCall("admin_add_pontos", { indicador_id: pontosModal.id, pontos: Number(pontosModal._pontos), motivo: pontosModal._motivo }, evGetAdminToken());
    setPontosModal(null); load();
  };

  return (
    <EnergiaAdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#1A3C5E]">Indicadores</h1>
        <button onClick={() => setAdding({ nome: "", cpf: "", data_nascimento: "" })} className="px-4 py-2 bg-[#1A3C5E] text-white rounded flex items-center gap-2"><Plus className="w-4 h-4" /> Novo</button>
      </div>

      <div className="mb-4 relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
        <input className="w-full h-10 border rounded pl-9 pr-3" placeholder="Buscar nome ou CPF..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <Loader2 className="animate-spin" /> : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Nome</th><th className="text-left p-3">CPF</th>
                <th className="text-left p-3">Etapa</th><th className="text-right p-3">Pontos</th>
                <th className="text-center p-3">Ranking</th><th className="p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(i => (
                <tr key={i.id} className="border-t">
                  <td className="p-3">{i.nome}</td>
                  <td className="p-3">{evMaskCpf(i.cpf || "")}</td>
                  <td className="p-3">{i.etapa_atual || "—"}</td>
                  <td className="p-3 text-right font-bold">{i.pontos_acumulados}</td>
                  <td className="p-3 text-center">
                    <input type="checkbox" checked={i.aparece_ranking} onChange={() => saveToggle(i)} />
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => setPontosModal({ ...i, _pontos: 0, _motivo: "" })} className="px-2 py-1 text-xs bg-[#F5A623] text-white rounded">+ Pontos</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adding && <Modal title="Novo indicador" onClose={() => setAdding(null)}>
        <input className="w-full h-10 border rounded px-3" placeholder="Nome completo" value={adding.nome} onChange={e => setAdding({ ...adding, nome: e.target.value })} />
        <input className="w-full h-10 border rounded px-3" placeholder="CPF" value={adding.cpf} onChange={e => setAdding({ ...adding, cpf: evMaskCpf(e.target.value) })} />
        <input type="date" className="w-full h-10 border rounded px-3" value={adding.data_nascimento} onChange={e => setAdding({ ...adding, data_nascimento: e.target.value })} />
        <input className="w-full h-10 border rounded px-3" placeholder="Telefone" value={adding.telefone || ""} onChange={e => setAdding({ ...adding, telefone: e.target.value })} />
        <input className="w-full h-10 border rounded px-3" placeholder="Email" value={adding.email || ""} onChange={e => setAdding({ ...adding, email: e.target.value })} />
        <button onClick={create} className="w-full h-10 bg-[#1A3C5E] text-white rounded">Criar</button>
      </Modal>}

      {pontosModal && <Modal title={`Adicionar pontos — ${pontosModal.nome}`} onClose={() => setPontosModal(null)}>
        <input type="number" className="w-full h-10 border rounded px-3" placeholder="Pontos (use negativo para subtrair)" value={pontosModal._pontos} onChange={e => setPontosModal({ ...pontosModal, _pontos: e.target.value })} />
        <textarea className="w-full border rounded px-3 py-2" rows={3} placeholder="Observação (ex: Negócio fechado - Carlos Souza - 02/05/2026)" value={pontosModal._motivo} onChange={e => setPontosModal({ ...pontosModal, _motivo: e.target.value })} />
        <button onClick={addPontos} className="w-full h-10 bg-[#1A3C5E] text-white rounded">Confirmar</button>
      </Modal>}
    </EnergiaAdminLayout>
  );
}

function Modal({ title, children, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-md w-full space-y-3" onClick={e => e.stopPropagation()}>
        <h2 className="font-bold text-[#1A3C5E]">{title}</h2>
        {children}
      </div>
    </div>
  );
}
