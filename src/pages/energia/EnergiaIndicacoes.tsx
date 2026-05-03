import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, MapPin, Zap, Share2, Copy, X } from "lucide-react";
import EnergiaLayout from "./EnergiaLayout";
import { useEnergia } from "@/contexts/EnergiaContext";
import { evCall, evMaskPhone } from "@/lib/energiaApi";

const STATUS_LABEL: any = { enviada: "Em Rota", negociacao: "Em Batalha", fechada: "Vitória!" };
const STATUS_COLOR: any = {
  enviada: "#00C2FF", negociacao: "#F5A623", fechada: "#2E9E4F",
};
const CIDADES = ["Três Lagoas", "Água Clara", "Selvíria", "Bataguassu", "Outras"];

export default function EnergiaIndicacoes() {
  const { indicador, cpf } = useEnergia();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notifSent, setNotifSent] = useState<Record<string, boolean>>({});
  const [sending, setSending] = useState<string | null>(null);

  const [showLink, setShowLink] = useState(false);
  const [showIndicar, setShowIndicar] = useState(false);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ nome: "", telefone: "", cidade: "Três Lagoas", observacao: "" });
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);
  const [resultado, setResultado] = useState<{ whatsapp_url: string } | null>(null);

  const refetch = () => {
    if (!indicador) return;
    evCall("cliente_dashboard", { indicador_id: indicador.id, cpf }).then(setData).finally(() => setLoading(false));
  };

  useEffect(() => {
    refetch();
    const t = setInterval(refetch, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indicador, cpf]);

  useEffect(() => {
    const map: Record<string, boolean> = {};
    (data?.indicacoes || []).forEach((i: any) => {
      if (localStorage.getItem(`notif_${i.id}`)) map[i.id] = true;
    });
    setNotifSent(map);
  }, [data]);

  if (!indicador) return <Navigate to="/energia" replace />;

  const linkUrl = `${window.location.origin}/energia/i/${indicador.codigo_link}`;
  const copyLink = async () => {
    await navigator.clipboard.writeText(linkUrl);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const handleFechou = async (i: any) => {
    if (!confirm("Tem certeza? Isso vai notificar nossa equipe para confirmar o fechamento.")) return;
    setSending(i.id);
    try {
      await evCall("cliente_solicitar_confirmacao", {
        indicador_id: indicador.id, cpf, indicacao_id: i.id,
      });
      localStorage.setItem(`notif_${i.id}`, "1");
      setNotifSent(s => ({ ...s, [i.id]: true }));
      alert("Notificação enviada! Nossa equipe vai confirmar em breve.");
    } catch (e: any) {
      alert(e.message || "Erro ao enviar notificação");
    } finally {
      setSending(null);
    }
  };

  return (
    <EnergiaLayout>
      <h1 className="ev-font-epic text-3xl font-black mb-5 ev-text-glow" style={{ color: "#F5A623" }}>Suas Indicações</h1>

      {/* Botões de ação */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <button
          onClick={() => { setResultado(null); setForm({ nome: "", telefone: "", cidade: "Três Lagoas", observacao: "" }); setShowIndicar(true); }}
          className="ev-btn-primary h-14 flex items-center justify-center gap-2 ev-font-epic">
          <Share2 className="w-5 h-5 ev-sparkle" /> INDICAR AGORA
        </button>
        <button onClick={() => setShowLink(true)} className="ev-btn-secondary h-14 flex items-center justify-center gap-2 ev-font-epic">
          <Copy className="w-5 h-5" /> MEU LINK
        </button>
      </div>

      {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: "#F5A623" }} /> : (
        <div className="space-y-3">
          {(data?.indicacoes || []).length === 0 && (
            <div className="ev-card p-8 text-center" style={{ color: "#A08060" }}>
              Nenhuma indicação registrada ainda. Compartilhe seu portal!
            </div>
          )}
          {(data?.indicacoes || []).map((i: any, idx: number) => {
            const podeNotificar = (i.status === "enviada" || i.status === "negociacao") && !notifSent[i.id];
            return (
              <div key={i.id} className="ev-card p-4 flex justify-between items-center gap-3 ev-enter"
                style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className="min-w-0 flex-1">
                  <p className="ev-font-epic font-bold truncate" style={{ color: "#F5E6C8" }}>{i.nome_indicado || "Indicação anônima"}</p>
                  <p className="text-xs flex items-center gap-2 mt-1" style={{ color: "#A08060" }}>
                    {i.cidade && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {i.cidade}</span>}
                    <span>· {new Date(i.criado_em).toLocaleDateString("pt-BR")}</span>
                  </p>
                  {i.pontos_creditados > 0 && (
                    <p className="text-xs font-bold mt-1 ev-sparkle" style={{ color: "#F5A623" }}>+{i.pontos_creditados} pts históricos e disponíveis</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="ev-badge-epic" style={{ color: STATUS_COLOR[i.status] }}>
                    {i.status === "fechada" && <Zap className="w-3 h-3" />} {STATUS_LABEL[i.status] || i.status}
                  </span>
                  {podeNotificar && (
                    <button
                      onClick={() => handleFechou(i)}
                      disabled={sending === i.id}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1"
                      style={{ background: "#F5A623", color: "#0D0A00", boxShadow: "0 0 8px rgba(245,166,35,0.5)" }}>
                      ⚡ {sending === i.id ? "Enviando..." : "Fechou!"}
                    </button>
                  )}
                  {notifSent[i.id] && i.status !== "fechada" && (
                    <span className="text-[10px]" style={{ color: "#2E9E4F" }}>✓ Notificação enviada</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showLink && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }} onClick={() => setShowLink(false)}>
          <div className="ev-card ev-card-glow p-5 max-w-md w-full space-y-3 ev-enter" onClick={e => e.stopPropagation()}>
            <h3 className="ev-font-epic font-black text-lg ev-text-glow" style={{ color: "#F5A623" }}>Seu portal de indicação</h3>
            <div className="rounded-lg p-3 text-sm break-all" style={{ background: "rgba(0,0,0,0.5)", color: "#F5E6C8", border: "1px solid rgba(193,127,36,0.4)" }}>{linkUrl}</div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={copyLink} className="ev-btn-secondary h-11 flex items-center justify-center gap-2">
                <Copy className="w-4 h-4" /> {copied ? "Copiado!" : "Copiar"}
              </button>
              <a href={`https://wa.me/?text=${encodeURIComponent("Olá! Estou usando energia solar da Três Lagoas Solar e quero te indicar. Acesse: " + linkUrl)}`}
                target="_blank" rel="noreferrer" className="h-11 rounded-xl font-bold flex items-center justify-center"
                style={{ background: "#25D366", color: "#0D0A00" }}>WhatsApp</a>
            </div>
            <button onClick={() => setShowLink(false)} className="w-full text-sm" style={{ color: "#A08060" }}>Fechar</button>
          </div>
        </div>
      )}

      {showIndicar && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }} onClick={() => setShowIndicar(false)}>
          <div className="ev-card ev-card-glow p-5 max-w-md w-full space-y-3 ev-enter" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="ev-font-epic font-black text-lg ev-text-glow" style={{ color: "#F5A623" }}>Nova Indicação</h3>
              <button onClick={() => setShowIndicar(false)}><X className="w-5 h-5" style={{ color: "#A08060" }} /></button>
            </div>
            {resultado ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg text-sm" style={{ background: "rgba(46,158,79,0.18)", color: "#F5E6C8", border: "1px solid rgba(46,158,79,0.5)" }}>
                  Indicação registrada! Envie a mensagem no WhatsApp do indicado:
                </div>
                <a href={resultado.whatsapp_url} target="_blank" rel="noreferrer"
                  className="w-full h-12 rounded-xl font-bold flex items-center justify-center"
                  style={{ background: "#25D366", color: "#0D0A00" }}>Abrir WhatsApp do indicado</a>
                <button onClick={() => setShowIndicar(false)} className="w-full h-10" style={{ color: "#A08060" }}>Fechar</button>
              </div>
            ) : (
              <>
                <FieldDark label="Nome completo">
                  <input className="ev-input" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
                </FieldDark>
                <FieldDark label="Telefone (WhatsApp)">
                  <input className="ev-input" placeholder="(67) 99999-9999" value={form.telefone}
                    onChange={e => setForm({ ...form, telefone: evMaskPhone(e.target.value) })} />
                </FieldDark>
                <FieldDark label="Cidade">
                  <select className="ev-input" value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })}>
                    {CIDADES.map(c => <option key={c} value={c} style={{ background: "#1A0F00" }}>{c}</option>)}
                  </select>
                </FieldDark>
                <FieldDark label="O que você sabe sobre ele(a)?">
                  <textarea className="ev-input" style={{ height: "auto", padding: "10px 12px" }} rows={3}
                    placeholder="Conta de luz alta, casa nova, interesse em energia solar..."
                    value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} />
                </FieldDark>
                <button
                  disabled={enviando || !form.nome || !form.telefone}
                  onClick={async () => {
                    if (enviandoRef.current) return;
                    enviandoRef.current = true; setEnviando(true);
                    try {
                      const r = await evCall<{ whatsapp_url: string }>("cliente_criar_indicacao", {
                        indicador_id: indicador.id, cpf, ...form,
                      });
                      setResultado({ whatsapp_url: r.whatsapp_url });
                      refetch();
                    } catch (e: any) { alert(e.message); }
                    finally { setEnviando(false); enviandoRef.current = false; }
                  }}
                  className="ev-btn-primary w-full h-12 flex items-center justify-center">
                  {enviando ? "Enviando..." : "REGISTRAR INDICAÇÃO"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </EnergiaLayout>
  );
}

function FieldDark({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] ev-font-epic uppercase tracking-widest mb-1" style={{ color: "#F5A623" }}>{label}</label>
      {children}
    </div>
  );
}
