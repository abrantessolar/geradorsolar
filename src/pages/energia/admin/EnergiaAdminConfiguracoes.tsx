import { useEffect, useState } from "react";
import EnergiaAdminLayout from "./EnergiaAdminLayout";
import { evCall, evGetAdminToken } from "@/lib/energiaApi";
import { Loader2 } from "lucide-react";

const FIELDS = [
  { key: "webhook_kommo_url", label: "URL Webhook Kommo", type: "text" },
  { key: "mensagem_whatsapp_indicado", label: "Mensagem WhatsApp para o indicado (use {indicador} e {indicado})", type: "textarea" },
  { key: "mensagem_resgate", label: "Mensagem ao solicitar resgate", type: "textarea" },
  { key: "texto_link_indicacao", label: "Texto do link de indicação", type: "textarea" },
  { key: "modo_pontuacao", label: "Modo de pontuação (placas | valor)", type: "text" },
  { key: "pontos_por_placa", label: "Pontos por placa", type: "text" },
  { key: "logo_url", label: "URL do logo", type: "text" },
  { key: "nome_plataforma", label: "Nome da plataforma", type: "text" },
  { key: "ranking_publico", label: "Exibir ranking publicamente", type: "toggle" },
];

export default function EnergiaAdminConfiguracoes() {
  const [cfg, setCfg] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    evCall<{ data: any[] }>("admin_list", { tabela: "energia_config" }, evGetAdminToken()).then(r => {
      const c: any = {}; (r.data || []).forEach((x: any) => { c[x.chave] = x.valor; }); setCfg(c);
    }).finally(() => setLoading(false));
  }, []);

  const save = async (chave: string) => {
    await evCall("admin_upsert", { tabela: "energia_config", row: { chave, valor: cfg[chave] } }, evGetAdminToken());
    alert("Salvo!");
  };

  if (loading) return <EnergiaAdminLayout><Loader2 className="animate-spin" /></EnergiaAdminLayout>;

  return (
    <EnergiaAdminLayout>
      <h1 className="text-2xl font-bold text-[#1A3C5E] mb-6">Configurações</h1>
      <div className="bg-white rounded-xl shadow-sm p-5 max-w-2xl space-y-4">
        {FIELDS.map(f => (
          <div key={f.key}>
            <label className="block text-sm font-medium mb-1">{f.label}</label>
            {f.type === "textarea" ? (
              <textarea className="w-full border rounded p-2" rows={3} value={cfg[f.key] || ""} onChange={e => setCfg({ ...cfg, [f.key]: e.target.value })} />
            ) : (
              <input className="w-full h-10 border rounded px-3" value={cfg[f.key] || ""} onChange={e => setCfg({ ...cfg, [f.key]: e.target.value })} />
            )}
            <button onClick={() => save(f.key)} className="mt-1 px-3 py-1 bg-[#1A3C5E] text-white rounded text-xs">Salvar</button>
          </div>
        ))}
      </div>
    </EnergiaAdminLayout>
  );
}
