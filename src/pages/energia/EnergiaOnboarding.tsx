import { useState } from "react";
import { evCall } from "@/lib/energiaApi";
import { useEnergia } from "@/contexts/EnergiaContext";
import { EPIC_STAGES } from "./_epic";

type Props = { nome: string; onClose: (naoMostrarMais: boolean) => void; onIndicar: () => void };

export default function EnergiaOnboarding({ nome, onClose, onIndicar }: Props) {
  const [step, setStep] = useState(0);
  const { indicador, cpf } = useEnergia();
  const total = 4;

  const finalizar = async (naoMostrarMais: boolean) => {
    if (naoMostrarMais && indicador) {
      try { await evCall("cliente_marcar_onboarding_visto", { indicador_id: indicador.id, cpf }); } catch {}
    }
    onClose(naoMostrarMais);
  };

  const next = () => setStep(s => Math.min(total - 1, s + 1));

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center"
      style={{ background: "rgba(8,5,0,0.96)", backdropFilter: "blur(6px)" }}>
      {/* partículas */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 24 }).map((_, i) => {
          const left = (i * 53) % 100, top = (i * 37) % 100, size = 2 + (i % 4);
          return <div key={i} style={{
            position: "absolute", left: `${left}%`, top: `${top}%`,
            width: size, height: size, borderRadius: "50%",
            background: "radial-gradient(circle, #F5E6C8, transparent 70%)",
            animation: `ev-float ${6 + (i%5)}s ease-in-out ${(i%7)*0.6}s infinite`,
            opacity: 0.65,
          }} />;
        })}
      </div>

      <div className="relative w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-2xl flex flex-col"
        style={{ background: "linear-gradient(180deg, #1A0F00 0%, #0D0A00 100%)", border: "1px solid rgba(245,166,35,0.3)" }}>
        {/* progresso */}
        <div className="flex justify-center gap-2 pt-6">
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} className="h-1.5 rounded-full transition-all"
              style={{ width: i === step ? 28 : 8, background: i <= step ? "#F5A623" : "rgba(245,166,35,0.25)" }} />
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col items-center justify-center text-center">
          {step === 0 && (
            <div className="ev-enter flex flex-col items-center justify-center text-center" style={{ gap: 32 }}>
              <span
                className="leading-none"
                style={{
                  fontSize: 96,
                  filter: "drop-shadow(0 0 30px #F5A623)",
                  background: "transparent",
                  display: "inline-block",
                  animation: "ev-icon-pulse 2.4s ease-in-out infinite",
                }}
              >
                ☀️
              </span>
              <h2 className="ev-font-epic text-2xl sm:text-3xl font-black ev-text-glow" style={{ color: "#F5A623", margin: 0 }}>
                Bem-vindo ao Energia que Volta, {nome}!
              </h2>
              <p className="text-base sm:text-lg" style={{ color: "#F5E6C8", margin: 0 }}>
                Você indica. A gente fecha. A energia volta pra você.
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="w-full">
              <h2 className="ev-font-epic text-2xl font-black ev-text-glow mb-6" style={{ color: "#F5A623" }}>Como funciona?</h2>
              <div className="space-y-4 text-left">
                {[
                  { icon: "⚡", t: "Indique um amigo ou familiar", d: 0.1 },
                  { icon: "🤝", t: "Nossa equipe fecha o contrato", d: 0.3 },
                  { icon: "🎁", t: "Você ganha pontos e troca por prêmios", d: 0.5 },
                  { icon: "🏆", t: "Seu nível nunca regride — mesmo após resgatar prêmios", d: 0.7 },
                ].map((it, i) => (
                  <div key={i} className="flex items-center gap-4 ev-enter"
                    style={{ animationDelay: `${it.d}s` }}>
                    <div className="text-4xl flex-shrink-0">{it.icon}</div>
                    <div className="text-base sm:text-lg font-medium" style={{ color: "#F5E6C8" }}>{it.t}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="w-full">
              <h2 className="ev-font-epic text-2xl font-black ev-text-glow mb-2" style={{ color: "#F5A623" }}>Sua Trilha Solar</h2>
              <p className="text-xs ev-font-epic uppercase tracking-wider mb-4" style={{ color: "#F5A623" }}>Você está aqui → Indicador Faísca</p>
              <div className="flex items-center justify-center gap-1 overflow-x-auto ev-scroll py-3 mb-4">
                {EPIC_STAGES.map((s, i) => (
                  <div key={s.key} className="flex items-center flex-shrink-0">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-base"
                        style={{
                          background: i === 0 ? "linear-gradient(135deg,#F5A623,#E8651A)" : "rgba(0,0,0,0.55)",
                          border: `2px solid ${i === 0 ? "#F5E6C8" : "rgba(193,127,36,0.4)"}`,
                          boxShadow: i === 0 ? `0 0 14px ${s.aura}` : "none",
                        }}>{s.icon}</div>
                      <div className="text-[9px] ev-font-epic uppercase" style={{ color: i === 0 ? "#F5A623" : "#A08060" }}>{s.key}</div>
                    </div>
                    {i < EPIC_STAGES.length - 1 && (
                      <div className="h-0.5 w-4 mx-0.5" style={{ background: "rgba(193,127,36,0.4)" }} />
                    )}
                  </div>
                ))}
              </div>
              <p className="text-sm sm:text-base" style={{ color: "#F5E6C8" }}>
                Cada placa do projeto do seu indicado vale 1 ponto. Acumule e suba de nível!
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="ev-enter w-full">
              <div className="text-6xl mb-4">🚀</div>
              <h2 className="ev-font-epic text-2xl sm:text-3xl font-black ev-text-glow mb-3" style={{ color: "#F5A623" }}>Pronto para começar?</h2>
              <p className="text-base sm:text-lg mb-6" style={{ color: "#F5E6C8" }}>
                Sua primeira indicação está a um clique.
              </p>
              <button
                onClick={async () => { await finalizar(false); onIndicar(); }}
                className="w-full py-4 rounded-xl ev-font-epic font-black text-base sm:text-lg transition-transform active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #F5A623, #E8651A)",
                  color: "#1A0F00",
                  boxShadow: "0 0 24px rgba(245,166,35,0.5)",
                }}>
                ⚡ Fazer minha primeira indicação
              </button>
            </div>
          )}
        </div>

        {/* footer */}
        <div className="px-6 pb-6 pt-2 flex flex-col gap-2">
          {step < total - 1 && (
            <button onClick={next}
              className="w-full py-3 rounded-xl ev-font-epic font-bold transition-transform active:scale-95"
              style={{ background: "linear-gradient(135deg, #F5A623, #E8651A)", color: "#1A0F00" }}>
              Próximo
            </button>
          )}
          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={() => finalizar(false)}
              className="flex-1 py-2.5 rounded-lg text-sm border"
              style={{ borderColor: "rgba(245,166,35,0.4)", color: "#F5E6C8", background: "transparent" }}>
              OK, entendi
            </button>
            <button onClick={() => finalizar(true)}
              className="flex-1 py-2.5 rounded-lg text-sm"
              style={{ color: "#A08060", background: "transparent" }}>
              Não mostrar novamente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
