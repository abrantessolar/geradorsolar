import { useEffect, useState } from "react";
import EnergiaAdminLayout from "./EnergiaAdminLayout";
import { evCall, evGetAdminToken } from "@/lib/energiaApi";
import { Loader2, Trash2, Plus } from "lucide-react";

export default function EnergiaAdminTrilha() {
  const [etapas, setEtapas] = useState<any[]>([]);
  const [premios, setPremios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const tk = evGetAdminToken();
    const [e, p] = await Promise.all([
      evCall<{ data: any[] }>("admin_list", { tabela: "energia_etapas" }, tk),
      evCall<{ data: any[] }>("admin_list", { tabela: "energia_premios" }, tk),
    ]);
    setEtapas(e.data || []); setPremios(p.data || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const update = (idx: number, field: string, value: any) => {
    setEtapas(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };
  const save = async (e: any) => {
    await evCall("admin_upsert", { tabela: "energia_etapas", row: e }, evGetAdminToken());
    load();
  };
  const add = async () => {
    await evCall("admin_upsert", { tabela: "energia_etapas", row: { nome: "Nova etapa", ordem: etapas.length + 1, pontos_minimos: 0 } }, evGetAdminToken());
    load();
  };
  const del = async (id: string) => {
    if (!confirm("Excluir etapa?")) return;
    await evCall("admin_delete", { tabela: "energia_etapas", id }, evGetAdminToken());
    load();
  };

  return (
    <EnergiaAdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#1A3C5E]">Trilha</h1>
        <button onClick={add} className="px-4 py-2 rounded-lg bg-[#1A3C5E] text-white flex items-center gap-2"><Plus className="w-4 h-4" /> Etapa</button>
      </div>
      {loading ? <Loader2 className="animate-spin" /> : (
        <div className="space-y-2">
          {etapas.map((e, idx) => (
            <div key={e.id} className="bg-white p-3 rounded-lg shadow-sm grid grid-cols-12 gap-2 items-center">
              <input className="col-span-3 h-9 border rounded px-2" value={e.nome || ""} onChange={ev => update(idx, "nome", ev.target.value)} />
              <input type="number" className="col-span-2 h-9 border rounded px-2" placeholder="Ordem" value={e.ordem} onChange={ev => update(idx, "ordem", Number(ev.target.value))} />
              <input type="number" className="col-span-2 h-9 border rounded px-2" placeholder="Pontos mín" value={e.pontos_minimos} onChange={ev => update(idx, "pontos_minimos", Number(ev.target.value))} />
              <select className="col-span-3 h-9 border rounded px-2" value={e.premio_id || ""} onChange={ev => update(idx, "premio_id", ev.target.value || null)}>
                <option value="">— Sem prêmio —</option>
                {premios.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
              <button onClick={() => save(e)} className="col-span-1 h-9 bg-[#1A3C5E] text-white rounded text-xs">Salvar</button>
              <button onClick={() => del(e.id)} className="col-span-1 h-9 bg-red-100 text-red-700 rounded flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}
    </EnergiaAdminLayout>
  );
}
