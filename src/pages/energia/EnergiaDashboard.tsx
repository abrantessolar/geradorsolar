import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, Copy, Share2, X, Lock, Crown } from "lucide-react";
import EnergiaLayout from "./EnergiaLayout";
import { useEnergia } from "@/contexts/EnergiaContext";
import { evCall, evMaskPhone } from "@/lib/energiaApi";
import { EPIC_STAGES, epicMeta, epicName, EpicLevelUpOverlay } from "./_epic";

const CIDADES = ["Três Lagoas", "Água Clara", "Selvíria", "Bataguassu", "Outras"];

function Gauge({ value, max, label, color, format }: { value: number; max: number; label: string; color: string; format?: (n: number) => string }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  const angle = (pct / 100) * 180 - 90;
  return (
    <div className="ev-card p-4 flex flex-col items-center ev-enter">
      <div className="relative w-32 h-20 overflow-hidden">
        <div className="absolute inset-0 rounded-t-full border-8" style={{ borderColor: "rgba(193,127,36,0.25)", clipPath: "inset(0 0 50% 0)" }} />
        <div className="absolute inset-0 rounded-t-full border-8" style={{
          borderColor: color,
          clipPath: `polygon(50% 100%, 50% 0%, ${50 + 50 * Math.cos((angle - 90) * Math.PI / 180)}% ${100 + 50 * Math.sin((angle - 90) * Math.PI / 180)}%)`,
          filter: `drop-shadow(0 0 8px ${color})`,
        }} />
        <div className="absolute bottom-0 left-1/2 w-1 h-16 origin-bottom transition-transform"
          style={{ background: "#F5E6C8", boxShadow: "0 0 8px #F5A623", transform: `translateX(-50%) rotate(${angle}deg)` }} />
        <div className="absolute bottom-0 left-1/2 w-3 h-3 -translate-x-1/2 rounded-full" style={{ background: "#F5A623", boxShadow: "0 0 10px #F5A623" }} />
      </div>
      <div className="text-2xl font-black mt-1 ev-text-glow" style={{ color: "#F5E6C8" }}>{format ? format(value) : value}</div>
      <div className="text-[10px] ev-font-epic uppercase tracking-widest text-center mt-1" style={{ color: "#A08060" }}>{label}</div>
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
  const enviandoRef = useRef(false);
  const [resultado, setResultado] = useState<{ whatsapp_url: string } | null>(null);
  const [levelUp, setLevelUp] = useState<string | null>(null);

  const refetch = () => {
    if (!indicador) return;
    evCall("cliente_dashboard", { indicador_id: indicador.id, cpf })
      .then((d: any) => {
        setData(d);
        const prev = sessionStorage.getItem("ev_last_etapa");
        const cur = epicName(d?.indicador?.etapa_atual);
        if (prev && prev !== cur) setLevelUp(cur);
        sessionStorage.setItem("ev_last_etapa", cur);
      })
      .catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    refetch();
    const t = setInterval(refetch, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indicador, cpf]);

  if (!indicador) return <Navigate to="/energia" replace />;
  if (loading) return <EnergiaLayout><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#F5A623" }} /></div></EnergiaLayout>;
  if (!data) return <EnergiaLayout><p>Erro ao carregar.</p></EnergiaLayout>;

  const { indicador: ind, premios, stats } = data;
  // monta etapas a partir do mapa épico, pontos vindos do backend ou progressão padrão
  const backendEtapas: any[] = data.etapas || [];
  const etapasEpicas = EPIC_STAGES.map((s, i) => {
    const found = backendEtapas.find(b => epicName(b.nome) === s.key);
    return { ...s, pontos_minimos: found?.pontos_minimos ?? i * 100, premio_id: found?.premio_id, _orig: found?.nome || s.key };
  });
  const meta = epicMeta(ind.etapa_atual);
  const proximoPremio = (premios || []).find((p: any) => p.pontos_necessarios > ind.pontos_acumulados);
  const progressoMax = proximoPremio?.pontos_necessarios || ind.pontos_acumulados || 1;
  const linkUrl = `${window.location.origin}/energia/i/${ind.codigo_link}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(linkUrl);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <EnergiaLayout>
      {levelUp && <EpicLevelUpOverlay etapa={levelUp} onClose={() => setLevelUp(null)} />}

      <div className="space-y-6">
        {/* Header do player */}
        <div className="ev-card ev-card-glow p-5 ev-enter flex items-center gap-4">
          <div className="ev-frame-relic w-16 h-16 flex items-center justify-center ev-pulse-ring">
            <div className="w-full h-full rounded-full flex items-center justify-center text-2xl"
              style={{ background: "#1A0F00" }}>{meta.icon}</div>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="ev-font-epic text-xl font-black ev-text-glow truncate" style={{ color: "#F5E6C8" }}>
              Olá, {ind.nome.split(" ")[0]}
            </h1>
            <p className="text-sm ev-font-epic" style={{ color: "#F5A623", textShadow: `0 0 10px ${meta.aura}` }}>
              {meta.title}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black ev-text-glow ev-sparkle" style={{ color: "#F5A623" }}>{ind.pontos_acumulados}</div>
            <div className="text-[10px] ev-font-epic uppercase tracking-widest" style={{ color: "#A08060" }}>XP</div>
          </div>
        </div>

        {/* Gauges */}
        <div className="grid grid-cols-3 gap-3">
          <Gauge value={stats.fechadas} max={Math.max(10, stats.fechadas + 5)} label="Vitórias" color="#F5A623" />
          <Gauge value={stats.volume} max={Math.max(50000, stats.volume * 1.2)} label="Volume" color="#E8651A" format={n => `R$${(n/1000).toFixed(0)}k`} />
          <Gauge value={ind.pontos_acumulados} max={progressoMax} label={proximoPremio ? "Próx. relíquia" : "XP total"} color="#00C2FF" />
        </div>

        {/* Trilha sinuosa */}
        <div className="ev-card p-5 overflow-x-auto ev-scroll ev-enter" style={{
          background: "linear-gradient(180deg, rgba(30,18,0,0.85), rgba(13,10,0,0.95)), radial-gradient(ellipse at 50% 0%, rgba(245,166,35,0.18), transparent 70%)",
        }}>
          <div className="flex items-end gap-1 min-w-max relative py-3">
            {etapasEpicas.map((e, idx) => {
              const conquistada = ind.pontos_acumulados >= e.pontos_minimos;
              const atual = epicName(ind.etapa_atual) === e.key;
              const premio = (premios || []).find((p: any) => p.id === e.premio_id);
              const offsetY = idx % 2 === 0 ? 0 : 14;
              return (
                <div key={e.key} className="flex items-end">
                  <div className="flex flex-col items-center gap-2" style={{ marginTop: offsetY }}>
                    <div className={`relative w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all ${atual ? "ev-pulse" : ""}`}
                      style={{
                        background: conquistada ? "linear-gradient(135deg, #F5A623, #E8651A)" : "rgba(0,0,0,0.55)",
                        border: `2px solid ${conquistada ? "#F5E6C8" : "rgba(193,127,36,0.4)"}`,
                        boxShadow: conquistada ? `0 0 20px ${e.aura}` : "none",
                        transform: atual ? "scale(1.1)" : "scale(1)",
                      }}>
                      {atual && <Crown className="absolute -top-5 w-5 h-5" style={{ color: "#F5A623", filter: "drop-shadow(0 0 6px #F5A623)" }} />}
                      {conquistada ? <span style={{ filter: "drop-shadow(0 0 4px #fff)" }}>{e.icon}</span>
                        : <Lock className="w-5 h-5" style={{ color: "#A08060" }} />}
                    </div>
                    <div className="text-[10px] ev-font-epic uppercase tracking-wider text-center max-w-[72px]"
                      style={{ color: conquistada ? "#F5A623" : "#A08060" }}>{e.key}</div>
                    {/* mini relíquia */}
                    <div className="ev-frame-relic w-10 h-10">
                      <div className="w-full h-full rounded-full flex items-center justify-center overflow-hidden"
                        style={{ filter: conquistada ? "none" : "grayscale(1) brightness(0.45)" }}>
                        {premio?.imagem_url
                          ? <img src={premio.imagem_url} alt="" className="w-7 h-7 object-contain" />
                          : <span className="text-xs">🎁</span>}
                      </div>
                    </div>
                  </div>
                  {idx < etapasEpicas.length - 1 && (
                    <div className="h-1.5 w-10 mx-1 rounded-full self-center"
                      style={conquistada
                        ? {} : { background: "repeating-linear-gradient(90deg, rgba(193,127,36,0.4) 0 6px, transparent 6px 12px)" }}
                      {...(conquistada ? { className: "h-1.5 w-10 mx-1 rounded-full self-center ev-trail-line-done" } : {})} />
                  )}
                </div>
              );
            })}
          </div>

          {proximoPremio && (
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1 ev-font-epic uppercase tracking-wider" style={{ color: "#A08060" }}>
                <span>Caminho até {proximoPremio.nome}</span>
                <span style={{ color: "#F5A623" }}>{ind.pontos_acumulados}/{proximoPremio.pontos_necessarios}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.5)" }}>
                <div className="h-full ev-trail-line-done transition-all" style={{ width: `${Math.min(100, (ind.pontos_acumulados/proximoPremio.pontos_necessarios)*100)}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Próxima relíquia */}
        {proximoPremio && (
          <div className="ev-card ev-card-glow p-5 flex gap-4 items-center ev-enter">
            <div className="ev-frame-relic w-24 h-24 flex items-center justify-center">
              <div className="w-full h-full rounded-full flex items-center justify-center overflow-hidden">
                {proximoPremio.imagem_url
                  ? <img src={proximoPremio.imagem_url} alt={proximoPremio.nome} className="w-20 h-20 object-contain" />
                  : <span className="text-3xl">🎁</span>}
              </div>
            </div>
            <div className="flex-1">
              <p className="text-[10px] ev-font-epic uppercase tracking-widest" style={{ color: "#A08060" }}>Próxima relíquia</p>
              <h3 className="ev-font-epic font-black text-lg ev-text-glow" style={{ color: "#F5E6C8" }}>{proximoPremio.nome}</h3>
              <p className="text-sm font-bold ev-sparkle" style={{ color: "#E8651A" }}>
                Faltam {proximoPremio.pontos_necessarios - ind.pontos_acumulados} pontos
              </p>
            </div>
          </div>
        )}

        {/* Botões de ação */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => { setResultado(null); setForm({ nome: "", telefone: "", cidade: "Três Lagoas", observacao: "" }); setShowIndicar(true); }}
            className="ev-btn-primary h-14 flex items-center justify-center gap-2 ev-font-epic">
            <Share2 className="w-5 h-5 ev-sparkle" /> INDICAR AGORA
          </button>
          <button onClick={() => setShowLink(true)} className="ev-btn-secondary h-14 flex items-center justify-center gap-2 ev-font-epic">
            <Copy className="w-5 h-5" /> MEU LINK
          </button>
        </div>

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
                <h3 className="ev-font-epic font-black text-lg ev-text-glow" style={{ color: "#F5A623" }}>Nova Missão</h3>
                <button onClick={() => setShowIndicar(false)}><X className="w-5 h-5" style={{ color: "#A08060" }} /></button>
              </div>
              {resultado ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg text-sm" style={{ background: "rgba(46,158,79,0.18)", color: "#F5E6C8", border: "1px solid rgba(46,158,79,0.5)" }}>
                    Missão registrada! Envie a mensagem no WhatsApp do indicado:
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
                    {enviando ? "Enviando..." : "REGISTRAR MISSÃO"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
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
