import { useEffect, useState } from "react";
import EnergiaAdminLayout from "./EnergiaAdminLayout";
import { evCall, evGetAdminToken } from "@/lib/energiaApi";
import { Loader2, Plus, Trash2 } from "lucide-react";

export default function EnergiaAdminPontuacao() {
  const [config, setConfig] = useState<any>({ pontos_por_placa: 1, bonus_placas_minimo: 0, bonus_placas_pontos: 0 });
  const [campanhas, setCampanhas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const tk = evGetAdminToken();
    const [cfg, camp] = await Promise.all([
      evCall<{ data: any[] }>("admin_list", { tabela: "energia_config" }, tk),
      evCall<{ data: any[] }>("admin_list", { tabela: "energia_campanhas" }, tk),
    ]);
    const c: any = {};
    (cfg.data || []).forEach((r: any) => { c[r.chave] = r.valor; });
    setConfig(prev => ({ ...prev, ...c }));
    setCampanhas(camp.data || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const saveConfig = async (chave: string, valor: any) => {
    await evCall("admin_upsert", { tabela: "energia_config", row: { chave, valor } }, evGetAdminToken());
  };

  const addCamp = async () => {
    const today = new Date().toISOString().slice(0,10);
    await evCall("admin_upsert", { tabela: "energia_campanhas", row: { nome: "Nova campanha", inicio: today, fim: today, multiplicador: 2, ativa: true } }, evGetAdminToken());
    load();
  };
  const saveCamp = async (c: any) => { await evCall("admin_upsert", { tabela: "energia_campanhas", row: c }, evGetAdminToken()); load(); };
  const delCamp = async (id: string) => { if (!confirm("Excluir?")) return; await evCall("admin_delete", { tabela: "energia_campanhas", id }, evGetAdminToken()); load(); };

  if (loading) return <EnergiaAdminLayout><Loader2 className="animate-spin" /></EnergiaAdminLayout>;

  return (
    <EnergiaAdminLayout>
      <h1 className="text-2xl font-bold text-[#1A3C5E] mb-6">Pontuação</h1>

      <div className="bg-white p-5 rounded-xl shadow-sm space-y-4 mb-6 max-w-md">
        <h2 className="font-bold">Pontuação por placas</h2>
        <Field label="Pontos por placa" value={config.pontos_por_placa} onSave={v => saveConfig("pontos_por_placa", v)} />
        <h3 className="font-semibold text-sm pt-2">Bônus por volume de placas</h3>
        <Field label="A partir de quantas placas" value={config.bonus_placas_minimo} onSave={v => saveConfig("bonus_placas_minimo", v)} />
        <Field label="Pontos extras de bônus" value={config.bonus_placas_pontos} onSave={v => saveConfig("bonus_placas_pontos", v)} />
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold">Campanhas temporárias</h2>
          <button onClick={addCamp} className="px-3 py-1 bg-[#1A3C5E] text-white rounded text-sm flex items-center gap-1"><Plus className="w-4 h-4" /> Nova</button>
        </div>
        <div className="space-y-2">
          {campanhas.map((c, idx) => (
            <div key={c.id} className="grid grid-cols-12 gap-2 items-center">
              <input className="col-span-3 h-9 border rounded px-2" value={c.nome} onChange={e => setCampanhas(p => p.map((x, i) => i===idx?{...x, nome: e.target.value}:x))} />
              <input type="date" className="col-span-2 h-9 border rounded px-2" value={c.inicio} onChange={e => setCampanhas(p => p.map((x, i) => i===idx?{...x, inicio: e.target.value}:x))} />
              <input type="date" className="col-span-2 h-9 border rounded px-2" value={c.fim} onChange={e => setCampanhas(p => p.map((x, i) => i===idx?{...x, fim: e.target.value}:x))} />
              <input type="number" step="0.1" className="col-span-2 h-9 border rounded px-2" value={c.multiplicador} onChange={e => setCampanhas(p => p.map((x, i) => i===idx?{...x, multiplicador: Number(e.target.value)}:x))} />
              <label className="col-span-1 flex items-center gap-1 text-xs"><input type="checkbox" checked={c.ativa} onChange={e => setCampanhas(p => p.map((x, i) => i===idx?{...x, ativa: e.target.checked}:x))} />Ativa</label>
              <button onClick={() => saveCamp(c)} className="col-span-1 h-9 bg-[#1A3C5E] text-white rounded text-xs">Salvar</button>
              <button onClick={() => delCamp(c.id)} className="col-span-1 h-9 bg-red-100 text-red-700 rounded flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </div>
    </EnergiaAdminLayout>
  );
}

function Field({ label, value, onSave }: any) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <div>
      <label className="block text-xs text-gray-500">{label}</label>
      <div className="flex gap-2">
        <input type="number" className="flex-1 h-9 border rounded px-2" value={v ?? 0} onChange={e => setV(Number(e.target.value))} />
        <button onClick={() => onSave(v)} className="px-3 bg-[#1A3C5E] text-white rounded text-xs">Salvar</button>
      </div>
    </div>
  );
}
