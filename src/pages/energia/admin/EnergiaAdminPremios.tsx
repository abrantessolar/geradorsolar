import { useEffect, useState } from "react";
import EnergiaAdminLayout from "./EnergiaAdminLayout";
import { evCall, evGetAdminToken, fileToBase64 } from "@/lib/energiaApi";
import { Plus, Trash2, Loader2, Upload } from "lucide-react";

type Premio = { id?: string; nome: string; imagem_url?: string; pontos_necessarios: number; ordem: number; ativo: boolean };

export default function EnergiaAdminPremios() {
  const [list, setList] = useState<Premio[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Premio | null>(null);

  const load = () => {
    setLoading(true);
    evCall<{ data: Premio[] }>("admin_list", { tabela: "energia_premios" }, evGetAdminToken())
      .then(r => setList(r.data || [])).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const save = async (p: Premio) => {
    await evCall("admin_upsert", { tabela: "energia_premios", row: p }, evGetAdminToken());
    setEditing(null); load();
  };
  const del = async (id: string) => {
    if (!confirm("Excluir prêmio?")) return;
    await evCall("admin_delete", { tabela: "energia_premios", id }, evGetAdminToken());
    load();
  };

  const upload = async (file: File): Promise<string> => {
    const path = `${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("energia-premios").upload(path, file, { upsert: true });
    if (error) throw error;
    return supabase.storage.from("energia-premios").getPublicUrl(path).data.publicUrl;
  };

  return (
    <EnergiaAdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#1A3C5E]">Prêmios</h1>
        <button onClick={() => setEditing({ nome: "", pontos_necessarios: 100, ordem: list.length, ativo: true })}
          className="px-4 py-2 rounded-lg bg-[#1A3C5E] text-white flex items-center gap-2"><Plus className="w-4 h-4" /> Novo</button>
      </div>

      {loading ? <Loader2 className="animate-spin" /> : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {list.map(p => (
            <div key={p.id} className="bg-white rounded-xl p-4 shadow-sm">
              {p.imagem_url ? <img src={p.imagem_url} className="w-full h-32 object-contain mb-2" /> : <div className="w-full h-32 bg-gray-100 rounded mb-2" />}
              <div className="font-bold">{p.nome}</div>
              <div className="text-sm text-gray-500">{p.pontos_necessarios} pts · ordem {p.ordem}</div>
              <div className={`text-xs mt-1 ${p.ativo ? "text-green-600" : "text-gray-400"}`}>{p.ativo ? "Ativo" : "Pausado"}</div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => setEditing(p)} className="flex-1 px-2 py-1 text-xs bg-gray-100 rounded">Editar</button>
                <button onClick={() => del(p.id!)} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full space-y-3" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-[#1A3C5E]">{editing.id ? "Editar" : "Novo"} prêmio</h2>
            <input className="w-full h-10 border rounded px-3" placeholder="Nome" value={editing.nome} onChange={e => setEditing({ ...editing, nome: e.target.value })} />
            <input type="number" className="w-full h-10 border rounded px-3" placeholder="Pontos necessários" value={editing.pontos_necessarios} onChange={e => setEditing({ ...editing, pontos_necessarios: Number(e.target.value) })} />
            <input type="number" className="w-full h-10 border rounded px-3" placeholder="Ordem" value={editing.ordem} onChange={e => setEditing({ ...editing, ordem: Number(e.target.value) })} />
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Upload className="w-4 h-4" /> Imagem PNG
              <input type="file" accept="image/*" className="hidden" onChange={async e => {
                const f = e.target.files?.[0]; if (!f) return;
                const url = await upload(f); setEditing({ ...editing, imagem_url: url });
              }} />
            </label>
            {editing.imagem_url && <img src={editing.imagem_url} className="w-24 h-24 object-contain mx-auto" />}
            <label className="flex items-center gap-2"><input type="checkbox" checked={editing.ativo} onChange={e => setEditing({ ...editing, ativo: e.target.checked })} /> Ativo</label>
            <div className="flex gap-2">
              <button onClick={() => setEditing(null)} className="flex-1 h-10 border rounded">Cancelar</button>
              <button onClick={() => save(editing)} className="flex-1 h-10 bg-[#1A3C5E] text-white rounded">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </EnergiaAdminLayout>
  );
}
