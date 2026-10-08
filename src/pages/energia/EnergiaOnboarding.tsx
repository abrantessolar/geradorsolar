import { useState } from "react";
import { Share2, Coins, Gift } from "lucide-react";
import { evCall } from "@/lib/energiaApi";
import { useEnergia } from "@/contexts/EnergiaContext";

type Props = { nome: string; onClose: (naoMostrarMais: boolean) => void; onIndicar: () => void };

const PASSOS = [
  { icon: Share2, titulo: "Indique amigos e vizinhos", desc: "Compartilhe seu link pessoal" },
  { icon: Coins, titulo: "Acumule pontos", desc: "Cada etapa da indicação soma pontos" },
  { icon: Gift, titulo: "Troque por prêmios", desc: "Resgate pontos por prêmios reais" },
];

export default function EnergiaOnboarding({ nome, onClose, onIndicar }: Props) {
  const { indicador, cpf } = useEnergia();

  const finalizar = async (naoMostrarMais: boolean) => {
    if (naoMostrarMais && indicador) {
      try { await evCall("cliente_marcar_onboarding_visto", { indicador_id: indicador.id, cpf }); } catch {}
    }
    onClose(naoMostrarMais);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: "rgba(10,18,30,0.55)" }}>
      <div className="ev-card ev-enter w-full max-w-md p-7 text-center">
        <div
          className="mx-auto mb-5 flex items-center justify-center"
          style={{ width: 64, height: 64, borderRadius: 16, background: "#1A3C5E" }}
        >
          <Share2 className="w-7 h-7" style={{ color: "#F5A623" }} />
        </div>

        <h2 className="text-xl font-extrabold mb-2" style={{ color: "#1A2233" }}>
          Bem-vindo, {nome}!
        </h2>
        <p className="text-sm mb-6" style={{ color: "#6B7585" }}>
          Indique amigos e vizinhos para a Três Lagoas Solar e ganhe pontos a cada etapa da indicação.
        </p>

        <div className="flex flex-col gap-3 mb-6 text-left">
          {PASSOS.map((p, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#F5F7FA", border: "1px solid #E3E8EF" }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#FFF4E0" }}>
                <p.icon className="w-4 h-4" style={{ color: "#F5A623" }} />
              </div>
              <div>
                <div className="text-sm font-bold" style={{ color: "#1A2233" }}>{p.titulo}</div>
                <div className="text-xs" style={{ color: "#8891A0" }}>{p.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={async () => { await finalizar(false); onIndicar(); }}
          className="ev-btn-primary w-full h-12 flex items-center justify-center gap-2 mb-2"
        >
          Fazer minha primeira indicação
        </button>
        <button onClick={() => finalizar(true)} className="w-full py-2.5 text-sm" style={{ color: "#8891A0" }}>
          Não mostrar novamente
        </button>
      </div>
    </div>
  );
}
