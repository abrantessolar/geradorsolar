import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, Copy, Share2, X, Lock, Crown } from "lucide-react";
import EnergiaLayout from "./EnergiaLayout";
import { useEnergia } from "@/contexts/EnergiaContext";
import { evCall, evMaskPhone } from "@/lib/energiaApi";
import { EPIC_STAGES, epicMeta, epicName, epicMetaByName, EpicLevelUpOverlay } from "./_epic";
import EnergiaOnboarding from "./EnergiaOnboarding";

const CIDADES = ["Três Lagoas", "Água Clara", "Selvíria", "Bataguassu", "Outras"];

function Gauge({ value, max, label, color, format }: { value: number; max: number; label: string; color: string; format?: (n: number) => string }) {
  const pct = Math.min(1, max > 0 ? value / max : 0);
  const cx = 80, cy = 90, r = 70;
  const circumference = Math.PI * r;
  const dash = pct * circumference;
  const pointerDeg = -180 + pct * 180; // -180° (left) to 0° (right)
  const [animDeg, setAnimDeg] = useState(-180);
  useEffect(() => {
    const t = requestAnimationFrame(() => setAnimDeg(pointerDeg));
    return () => cancelAnimationFrame(t);
  }, [pointerDeg]);

  return (
    <div className="ev-card p-3 flex flex-col items-center ev-enter">
      <svg width="160" height="100" viewBox="0 0 160 100">
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="#2A1A00" strokeWidth="8" strokeLinecap="round"
        />
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: "stroke-dasharray 1s ease-out" }}
        />
        <line
          x1={cx} y1={cy} x2={cx} y2={cy - r}
          stroke="#F5E6C8" strokeWidth="2" strokeLinecap="round"
          style={{
            transformOrigin: `${cx}px ${cy}px`,
            transform: `rotate(${animDeg}deg)`,
            transition: "transform 1s ease-out",
            filter: "drop-shadow(0 0 4px #F5A623)",
          }}
        />
        <circle cx={cx} cy={cy} r="4" fill="#F5A623" style={{ filter: "drop-shadow(0 0 6px #F5A623)" }} />
      </svg>
      <div className="text-xl font-black ev-text-glow -mt-1" style={{ color: "#F5A623" }}>{format ? format(value) : value}</div>
      <div className="text-[10px] ev-font-epic uppercase tracking-widest text-center mt-0.5" style={{ color: "#A08060" }}>{label}</div>
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
  const [showOnboarding, setShowOnboarding] = useState(false);

  const refetch = () => {
    if (!indicador) return;
    evCall("cliente_dashboard", { indicador_id: indicador.id, cpf })
      .then((d: any) => {
        setData(d);
        const prev = sessionStorage.getItem("ev_last_etapa");
        const cur = epicName(d?.indicador?.etapa_atual);
        if (prev && prev !== cur) setLevelUp(cur);
        sessionStorage.setItem("ev_last_etapa", cur);
        if (d?.indicador && d.indicador.onboarding_visto === false) setShowOnboarding(true);
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
  const pHist = ind.pontos_historicos ?? ind.pontos_acumulados ?? 0;
  const pDisp = ind.pontos_disponiveis ?? ind.pontos_acumulados ?? 0;
  // monta etapas a partir do banco (ordenadas por pontos_minimos), com metadata épica por nome
  const backendEtapas: any[] = (data.etapas || []).slice().sort((a: any, b: any) => (a.pontos_minimos ?? 0) - (b.pontos_minimos ?? 0));
  const etapasEpicas = (backendEtapas.length ? backendEtapas : EPIC_STAGES.map((s, i) => ({ nome: s.title, pontos_minimos: i * 100 }))).map((b: any) => {
    const m = epicMetaByName(b.nome);
    return { ...m, title: b.nome || m.title, pontos_minimos: b.pontos_minimos ?? 0, premio_id: b.premio_id };
  });
  const meta = epicMeta(ind.etapa_atual);
  const proximoPremio = (premios || []).find((p: any) => p.pontos_necessarios > pDisp);
  const progressoMax = proximoPremio?.pontos_necessarios || pDisp || 1;
  const linkUrl = `${window.location.origin}/energia/i/${ind.codigo_link}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(linkUrl);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <EnergiaLayout>
      {levelUp && <EpicLevelUpOverlay etapa={levelUp} onClose={() => setLevelUp(null)} />}
      {showOnboarding && (
        <EnergiaOnboarding
          nome={ind.nome.split(" ")[0]}
          onClose={() => setShowOnboarding(false)}
          onIndicar={() => { setResultado(null); setForm({ nome: "", telefone: "", cidade: "Três Lagoas", observacao: "" }); setShowIndicar(true); }}
        />
      )}

      <div className="space-y-6">
        {/* Header do player */}
        <div className="ev-card ev-card-glow p-3 sm:p-5 ev-enter flex items-center gap-3 sm:gap-4">
          <div className="ev-frame-relic w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 flex items-center justify-center ev-pulse-ring">
            <div className="w-full h-full rounded-full flex items-center justify-center text-xl sm:text-2xl"
              style={{ background: "#1A0F00" }}>{meta.icon}</div>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="ev-font-epic text-base sm:text-xl font-black ev-text-glow truncate" style={{ color: "#F5E6C8" }}>
              Olá, {ind.nome.split(" ")[0]}
            </h1>
            <p className="text-xs sm:text-sm ev-font-epic truncate" style={{ color: "#F5A623", textShadow: `0 0 10px ${meta.aura}` }}>
              {meta.title}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-2xl sm:text-3xl font-black ev-text-glow ev-sparkle" style={{ color: "#F5A623" }}>{pHist}</div>
            <div className="text-[10px] ev-font-epic uppercase tracking-widest" style={{ color: "#A08060" }}>XP</div>
          </div>
        </div>

        {/* Gauges - mobile: 1 coluna, sm+: 3 colunas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Gauge value={stats.fechadas} max={Math.max(10, stats.fechadas + 5)} label="Vitórias" color="#F5A623" />
          <Gauge value={stats.placas || 0} max={Math.max(20, (stats.placas || 0) + 10)} label="Placas indicadas" color="#E8651A" />
          <Gauge value={pDisp} max={progressoMax} label={proximoPremio ? "Próx. relíquia" : "Saldo"} color="#00C2FF" />
        </div>

        {/* Indicadores de pontos H/D */}
        <div className="flex justify-center gap-4 -mt-2 text-xs ev-font-epic">
          <div className="flex items-center gap-1.5" style={{ color: "#F5A623" }}>
            <span>⚡</span><b>{pHist}</b><span style={{ color: "#A08060" }}>pts históricos</span>
          </div>
          <div className="flex items-center gap-1.5" style={{ color: "#E8651A" }}>
            <span>🎁</span><b>{pDisp}</b><span style={{ color: "#A08060" }}>pts disponíveis</span>
          </div>
        </div>

        {/* Trilha sinuosa */}
        <div className="ev-card p-5 overflow-x-auto ev-scroll ev-enter" style={{
          background: "linear-gradient(180deg, rgba(30,18,0,0.85), rgba(13,10,0,0.95)), radial-gradient(ellipse at 50% 0%, rgba(245,166,35,0.18), transparent 70%)",
        }}>
          <div className="flex items-end gap-1 min-w-max relative py-3">
            {etapasEpicas.map((e, idx) => {
              const conquistada = pHist >= e.pontos_minimos;
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
                    conquistada
                      ? <div className="h-1.5 w-10 mx-1 rounded-full self-center ev-trail-line-done" />
                      : <div className="h-1.5 w-10 mx-1 rounded-full self-center" style={{ background: "repeating-linear-gradient(90deg, rgba(193,127,36,0.4) 0 6px, transparent 6px 12px)" }} />
                  )}
                </div>
              );
            })}
          </div>

          {proximoPremio && (
            <div className="mt-4">
              <div className="flex flex-col items-center text-xs mb-1.5 ev-font-epic uppercase tracking-wider gap-0.5" style={{ color: "#A08060" }}>
                <span className="text-center">Caminho até {proximoPremio.nome}</span>
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
