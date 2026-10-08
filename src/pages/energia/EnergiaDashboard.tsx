import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, Copy, Share2, X, Lock, Check, User, Gift } from "lucide-react";
import EnergiaLayout from "./EnergiaLayout";
import { useEnergia } from "@/contexts/EnergiaContext";
import { evCall, evMaskPhone } from "@/lib/energiaApi";
import { EPIC_STAGES, epicMeta, epicName, epicMetaByName, EpicLevelUpOverlay } from "./_epic";
import EnergiaOnboarding from "./EnergiaOnboarding";
import { PremioIcon, isPremioIcon } from "./premioIcons";

const CIDADES = ["Três Lagoas", "Água Clara", "Selvíria", "Bataguassu", "Outras"];

function StatTile({ value, max, label }: { value: number | string; max: number; label: string }) {
  const numeric = typeof value === "number" ? value : parseFloat(String(value)) || 0;
  const pct = Math.min(100, max > 0 ? (numeric / max) * 100 : 0);
  return (
    <div className="ev-card p-3 flex flex-col items-center gap-1.5 ev-enter">
      <div className="text-lg font-extrabold" style={{ color: "#1A2233" }}>{value}</div>
      <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "#EEF1F5" }}>
        <div className="h-full rounded-full" style={{ background: "#F5A623", width: `${pct}%` }} />
      </div>
      <div className="text-[9px] text-center" style={{ color: "#8891A0" }}>{label}</div>
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
  const backendEtapas: any[] = (data.etapas || []).slice().sort((a: any, b: any) => (a.pontos_minimos ?? 0) - (b.pontos_minimos ?? 0));
  const etapasNiveis = (backendEtapas.length ? backendEtapas : EPIC_STAGES.map((s, i) => ({ nome: s.title, pontos_minimos: i * 100 }))).map((b: any) => {
    const m = epicMetaByName(b.nome);
    return { ...m, title: b.nome || m.title, pontos_minimos: b.pontos_minimos ?? 0, premio_id: b.premio_id };
  });
  const meta = epicMeta(ind.etapa_atual);
  const proximoPremio = (premios || []).find((p: any) => p.pontos_necessarios > pDisp);
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

      <div className="space-y-4">
        {/* Header do indicador */}
        <div className="ev-card p-3.5 ev-enter flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#F5F7FA", border: `2px solid #F5A623` }}>
            <User className="w-5 h-5" style={{ color: "#1A3C5E" }} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-extrabold truncate" style={{ color: "#1A2233" }}>
              Olá, {ind.nome.split(" ")[0]}
            </h1>
            <p className="text-xs font-bold truncate" style={{ color: "#F5A623" }}>
              Nível {meta.title}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xl font-extrabold" style={{ color: "#1A2233" }}>{pHist}</div>
            <div className="text-[9px] uppercase tracking-wide" style={{ color: "#8891A0" }}>pontos</div>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-3 gap-3">
          <StatTile value={stats.fechadas} max={20} label="Fechadas" />
          <StatTile value={stats.placas || 0} max={Math.max(20, (stats.placas || 0) + 10)} label="Placas indicadas" />
          <StatTile
            value={proximoPremio ? `${Math.min(100, Math.round((pDisp / proximoPremio.pontos_necessarios) * 100))}%` : "100%"}
            max={100}
            label="Próx. prêmio"
          />
        </div>

        {/* Trilha de níveis */}
        <div className="ev-card p-4 overflow-x-auto ev-scroll ev-enter">
          <div className="text-[10px] uppercase tracking-wide font-semibold mb-3" style={{ color: "#6B7585" }}>Seu nível</div>
          <div className="flex items-end gap-1 min-w-max relative py-2">
            {etapasNiveis.map((e, idx) => {
              const conquistada = pHist >= e.pontos_minimos;
              const atual = epicName(ind.etapa_atual) === e.key;
              const premio = (premios || []).find((p: any) => p.id === e.premio_id);
              return (
                <div key={e.key} className="flex items-end">
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative w-14 h-14 rounded-full flex items-center justify-center"
                      style={{
                        background: conquistada ? "#F5A623" : "#F5F7FA",
                        border: `2px solid ${conquistada ? "#F5A623" : "#E3E8EF"}`,
                      }}>
                      {conquistada
                        ? <Check className="w-5 h-5" style={{ color: "#1A2233" }} />
                        : <Lock className="w-4 h-4" style={{ color: "#B4BDC9" }} />}
                    </div>
                    <div className="text-[10px] font-semibold text-center max-w-[72px]"
                      style={{ color: atual ? "#1A2233" : conquistada ? "#1A3C5E" : "#B4BDC9" }}>{e.title}</div>
                    {premio && (
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden" style={{ background: "#F5F7FA", opacity: conquistada ? 1 : 0.4 }}>
                        {isPremioIcon(premio?.imagem_url)
                          ? <PremioIcon value={premio.imagem_url} size={26} />
                          : premio?.imagem_url
                            ? <img src={premio.imagem_url} alt="" className="w-6 h-6 object-contain" />
                            : <Gift className="w-4 h-4" style={{ color: "#8891A0" }} />}
                      </div>
                    )}
                  </div>
                  {idx < etapasNiveis.length - 1 && (
                    <div className="h-0.5 w-8 mx-1 rounded-full self-center"
                      style={{ background: conquistada ? "#F5A623" : "#E3E8EF" }} />
                  )}
                </div>
              );
            })}
          </div>

          {proximoPremio && (
            <div className="mt-4">
              <div className="flex flex-col items-center text-xs mb-1.5 gap-0.5" style={{ color: "#6B7585" }}>
                <span className="text-center">Caminho até {proximoPremio.nome}</span>
                <span style={{ color: "#1A2233", fontWeight: 700 }}>{pDisp}/{proximoPremio.pontos_necessarios} disponíveis</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "#EEF1F5" }}>
                <div className="h-full rounded-full" style={{ background: "#F5A623", width: `${Math.min(100, (pDisp/proximoPremio.pontos_necessarios)*100)}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Próximo prêmio */}
        {proximoPremio && (
          <div className="ev-card p-4 flex gap-4 items-center ev-enter">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#F5F7FA", border: "1px solid #E3E8EF" }}>
              {isPremioIcon(proximoPremio.imagem_url)
                ? <PremioIcon value={proximoPremio.imagem_url} size={48} />
                : proximoPremio.imagem_url
                  ? <img src={proximoPremio.imagem_url} alt={proximoPremio.nome} className="w-12 h-12 object-contain" />
                  : <Gift className="w-7 h-7" style={{ color: "#F5A623" }} />}
            </div>
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-wide" style={{ color: "#8891A0" }}>Próximo prêmio</p>
              <h3 className="font-extrabold text-base" style={{ color: "#1A2233" }}>{proximoPremio.nome}</h3>
              <p className="text-sm font-semibold" style={{ color: "#F5A623" }}>
                {pDisp >= proximoPremio.pontos_necessarios
                  ? "Disponível para resgate!"
                  : `Faltam ${proximoPremio.pontos_necessarios - pDisp} pts disponíveis`}
              </p>
            </div>
          </div>
        )}

        {/* Botões de ação */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => { setResultado(null); setForm({ nome: "", telefone: "", cidade: "Três Lagoas", observacao: "" }); setShowIndicar(true); }}
            className="ev-btn-primary h-13 flex items-center justify-center gap-2" style={{ height: 50 }}>
            <Share2 className="w-5 h-5" /> Indicar agora
          </button>
          <button onClick={() => setShowLink(true)} className="ev-btn-secondary h-13 flex items-center justify-center gap-2" style={{ height: 50 }}>
            <Copy className="w-5 h-5" /> Meu link
          </button>
        </div>

        {showLink && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4" style={{ background: "rgba(10,18,30,0.55)" }} onClick={() => setShowLink(false)}>
            <div className="ev-card p-5 max-w-md w-full space-y-3 ev-enter" onClick={e => e.stopPropagation()}>
              <h3 className="font-extrabold text-lg" style={{ color: "#1A2233" }}>Seu link de indicação</h3>
              <div className="rounded-lg p-3 text-sm break-all" style={{ background: "#F5F7FA", color: "#1A2233", border: "1px solid #E3E8EF" }}>{linkUrl}</div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={copyLink} className="ev-btn-secondary h-11 flex items-center justify-center gap-2">
                  <Copy className="w-4 h-4" /> {copied ? "Copiado!" : "Copiar"}
                </button>
                <a href={`https://wa.me/?text=${encodeURIComponent("Olá! Estou usando energia solar da Três Lagoas Solar e quero te indicar. Acesse: " + linkUrl)}`}
                  target="_blank" rel="noreferrer" className="h-11 rounded-xl font-bold flex items-center justify-center"
                  style={{ background: "#25D366", color: "#FFFFFF" }}>WhatsApp</a>
              </div>
              <button onClick={() => setShowLink(false)} className="w-full text-sm" style={{ color: "#8891A0" }}>Fechar</button>
            </div>
          </div>
        )}

        {showIndicar && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4" style={{ background: "rgba(10,18,30,0.55)" }} onClick={() => setShowIndicar(false)}>
            <div className="ev-card p-5 max-w-md w-full space-y-3 ev-enter" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-lg" style={{ color: "#1A2233" }}>Nova indicação</h3>
                <button onClick={() => setShowIndicar(false)}><X className="w-5 h-5" style={{ color: "#8891A0" }} /></button>
              </div>
              {resultado ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg text-sm" style={{ background: "#DCFCE7", color: "#15803D" }}>
                    Indicação registrada! Envie a mensagem no WhatsApp do indicado:
                  </div>
                  <a href={resultado.whatsapp_url} target="_blank" rel="noreferrer"
                    className="w-full h-12 rounded-xl font-bold flex items-center justify-center"
                    style={{ background: "#25D366", color: "#FFFFFF" }}>Abrir WhatsApp do indicado</a>
                  <button onClick={() => setShowIndicar(false)} className="w-full h-10" style={{ color: "#8891A0" }}>Fechar</button>
                </div>
              ) : (
                <>
                  <FieldLight label="Nome completo">
                    <input className="ev-input" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
                  </FieldLight>
                  <FieldLight label="Telefone (WhatsApp)">
                    <input className="ev-input" placeholder="(67) 99999-9999" value={form.telefone}
                      onChange={e => setForm({ ...form, telefone: evMaskPhone(e.target.value) })} />
                  </FieldLight>
                  <FieldLight label="Cidade">
                    <select className="ev-input" value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })}>
                      {CIDADES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </FieldLight>
                  <FieldLight label="O que você sabe sobre ele(a)?">
                    <textarea className="ev-input" style={{ height: "auto", padding: "10px 12px" }} rows={3}
                      placeholder="Conta de luz alta, casa nova, interesse em energia solar..."
                      value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} />
                  </FieldLight>
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
                    {enviando ? "Enviando..." : "Registrar indicação"}
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

function FieldLight({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#6B7585" }}>{label}</label>
      {children}
    </div>
  );
}
