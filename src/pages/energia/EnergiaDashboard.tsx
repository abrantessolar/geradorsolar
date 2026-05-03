import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Zap, Sun, Battery, Factory, Radio, Loader2, Copy, Share2, X } from "lucide-react";
import EnergiaLayout from "./EnergiaLayout";
import { useEnergia } from "@/contexts/EnergiaContext";
import { evCall, evMaskPhone } from "@/lib/energiaApi";

const CIDADES = ["Três Lagoas", "Água Clara", "Selvíria", "Bataguassu", "Outras"];

const ETAPA_ICONS: Record<string, any> = {
  Raio: Zap, Painel: Sun, Gerador: Battery, Usina: Factory, Central: Radio, "Sol Maior": Sun,
};

function Gauge({ value, max, label, color, format }: { value: number; max: number; label: string; color: string; format?: (n: number) => string }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  const angle = (pct / 100) * 180 - 90;
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col items-center">
      <div className="relative w-32 h-20 overflow-hidden">
        <div className="absolute inset-0 rounded-t-full border-8 border-gray-100" style={{ clipPath: "inset(0 0 50% 0)" }} />
        <div
          className="absolute inset-0 rounded-t-full border-8"
          style={{ borderColor: color, clipPath: `polygon(50% 100%, 50% 0%, ${50 + 50 * Math.cos((angle - 90) * Math.PI / 180)}% ${100 + 50 * Math.sin((angle - 90) * Math.PI / 180)}%)` }}
        />
        <div className="absolute bottom-0 left-1/2 w-1 h-16 bg-[#1A3C5E] origin-bottom transition-transform" style={{ transform: `translateX(-50%) rotate(${angle}deg)` }} />
        <div className="absolute bottom-0 left-1/2 w-3 h-3 -translate-x-1/2 rounded-full bg-[#1A3C5E]" />
      </div>
      <div className="text-2xl font-bold text-[#1A3C5E] mt-1">{format ? format(value) : value}</div>
      <div className="text-xs text-gray-500 text-center mt-1">{label}</div>
    </div>
  );
}

export default function EnergiaDashboard() {
  const { indicador, cpf } = useEnergia();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showLink, setShowLink] = useState(false);
  const [showIndicar, setShowIndicar] = useState(false);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ nome: "", telefone: "", cidade: "Três Lagoas", observacao: "" });
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ whatsapp_url: string } | null>(null);

  const refetch = () => {
    if (!indicador) return;
    evCall("cliente_dashboard", { indicador_id: indicador.id, cpf })
      .then(setData).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    refetch();
    const t = setInterval(refetch, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indicador, cpf]);

  if (!indicador) return <Navigate to="/energia" replace />;
  if (loading) return <EnergiaLayout><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#E8651A]" /></div></EnergiaLayout>;
  if (!data) return <EnergiaLayout><p>Erro ao carregar.</p></EnergiaLayout>;

  const { indicador: ind, etapas, premios, stats } = data;
  const proximoPremio = (premios || []).find((p: any) => p.pontos_necessarios > ind.pontos_acumulados);
  const progressoMax = proximoPremio?.pontos_necessarios || ind.pontos_acumulados || 1;
  const linkUrl = `${window.location.origin}/energia/i/${ind.codigo_link}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(linkUrl);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <EnergiaLayout>
      <div className="space-y-5">
        <div className="bg-gradient-to-r from-[#1A3C5E] to-[#2C5A8C] text-white rounded-2xl p-5 shadow-lg">
          <h1 className="text-xl font-bold">Olá, {ind.nome.split(" ")[0]} <span className="text-[#F5A623]">⚡</span></h1>
          <p className="text-sm text-white/80">Você é um <span className="font-bold text-[#F5A623]">{ind.etapa_atual || "Raio"}</span></p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Gauge value={stats.fechadas} max={Math.max(10, stats.fechadas + 5)} label="Indicações fechadas" color="#F5A623" />
          <Gauge value={stats.volume} max={Math.max(50000, stats.volume * 1.2)} label="Volume gerado" color="#E8651A" format={n => `R$ ${(n/1000).toFixed(0)}k`} />
          <Gauge value={ind.pontos_acumulados} max={progressoMax} label={proximoPremio ? `Até ${proximoPremio.nome}` : "Pontos"} color="#1A3C5E" />
        </div>

        {/* Trilha horizontal */}
        <div className="bg-white rounded-2xl p-4 shadow-sm overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            {(etapas || []).map((e: any, idx: number) => {
              const conquistada = ind.pontos_acumulados >= e.pontos_minimos;
              const atual = ind.etapa_atual === e.nome;
              const Icon = ETAPA_ICONS[e.nome] || Sun;
              return (
                <div key={e.id} className="flex items-center">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                      atual ? "bg-gradient-to-br from-[#F5A623] to-[#E8651A] animate-pulse shadow-lg" :
                      conquistada ? "bg-[#F5A623]/80" : "bg-gray-200"
                    }`}>
                      <Icon className={`w-7 h-7 ${conquistada || atual ? "text-white" : "text-gray-400"}`} />
                    </div>
                    <span className={`text-[11px] font-medium ${conquistada || atual ? "text-[#1A3C5E]" : "text-gray-400"}`}>{e.nome}</span>
                  </div>
                  {idx < etapas.length - 1 && <div className={`h-1 w-6 mx-1 rounded ${conquistada ? "bg-[#F5A623]" : "bg-gray-200"}`} />}
                </div>
              );
            })}
          </div>
        </div>

        {proximoPremio && (
          <div className="bg-white rounded-2xl p-5 shadow-sm flex gap-4 items-center">
            {proximoPremio.imagem_url ? (
              <img src={proximoPremio.imagem_url} alt={proximoPremio.nome} className="w-20 h-20 object-contain" />
            ) : <div className="w-20 h-20 bg-[#F5A623]/20 rounded-xl flex items-center justify-center"><Sun className="w-10 h-10 text-[#F5A623]" /></div>}
            <div className="flex-1">
              <p className="text-xs text-gray-500">Próximo prêmio</p>
              <h3 className="font-bold text-[#1A3C5E]">{proximoPremio.nome}</h3>
              <p className="text-sm text-[#E8651A] font-semibold">Faltam {proximoPremio.pontos_necessarios - ind.pontos_acumulados} pontos</p>
            </div>
          </div>
        )}

        <button
          onClick={() => setShowLink(true)}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#F5A623] to-[#E8651A] text-white font-bold text-lg shadow-lg hover:opacity-90 flex items-center justify-center gap-2"
        >
          <Share2 className="w-5 h-5" /> Indicar agora
        </button>

        {showLink && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-end md:items-center justify-center p-4" onClick={() => setShowLink(false)}>
            <div className="bg-white rounded-2xl p-5 max-w-md w-full space-y-3" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-[#1A3C5E]">Seu link de indicação</h3>
              <div className="bg-gray-50 rounded-lg p-3 text-sm break-all">{linkUrl}</div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={copyLink} className="h-11 rounded-lg bg-[#1A3C5E] text-white font-medium flex items-center justify-center gap-2">
                  <Copy className="w-4 h-4" /> {copied ? "Copiado!" : "Copiar"}
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent("Olá! Estou usando energia solar da Três Lagoas Solar e quero te indicar. Acesse: " + linkUrl)}`}
                  target="_blank" rel="noreferrer"
                  className="h-11 rounded-lg bg-[#25D366] text-white font-medium flex items-center justify-center"
                >
                  WhatsApp
                </a>
              </div>
              <button onClick={() => setShowLink(false)} className="w-full text-sm text-gray-500 hover:text-gray-700">Fechar</button>
            </div>
          </div>
        )}
      </div>
    </EnergiaLayout>
  );
}
