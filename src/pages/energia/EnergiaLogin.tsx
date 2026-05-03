import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Sun, AlertCircle, Loader2 } from "lucide-react";
import { evCall, evMaskCpf } from "@/lib/energiaApi";
import { useEnergia } from "@/contexts/EnergiaContext";
import { EpicParticles } from "./_epic";

export default function EnergiaLogin() {
  const [cpf, setCpf] = useState("");
  const [data, setData] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setIndicador, setCpf: saveCpf } = useEnergia();
  const nav = useNavigate();

  const handle = async () => {
    setError(""); setLoading(true);
    try {
      const res = await evCall<{ indicador: any }>("login_cliente", { cpf, data_nascimento: data });
      setIndicador(res.indicador);
      saveCpf(cpf.replace(/\D/g, ""));
      nav("/energia/dashboard");
    } catch (e: any) { setError(e.message || "Erro ao entrar"); }
    finally { setLoading(false); }
  };

  return (
    <div className="ev-epic flex items-center justify-center px-4 py-10">
      <EpicParticles count={24} />
      <div className="relative z-10 max-w-md w-full ev-card ev-card-glow ev-enter p-8 space-y-5">
        <div className="text-center space-y-2">
          <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center ev-pulse-ring"
            style={{ background: "linear-gradient(135deg, #F5A623, #E8651A)" }}>
            <Sun className="w-10 h-10" style={{ color: "#0D0A00" }} />
          </div>
          <h1 className="ev-font-epic text-3xl font-black ev-text-glow" style={{ color: "#F5A623" }}>Energia que Volta</h1>
          <p className="text-sm" style={{ color: "#A08060" }}>Bem-vindo, Indicador. Sua energia move o mundo.</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg text-sm"
            style={{ background: "rgba(232,101,26,0.18)", color: "#F5E6C8", border: "1px solid rgba(232,101,26,0.5)" }}>
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs ev-font-epic uppercase tracking-widest mb-1" style={{ color: "#F5A623" }}>CPF</label>
            <input className="ev-input" value={cpf} placeholder="000.000.000-00" onChange={e => setCpf(evMaskCpf(e.target.value))} />
          </div>
          <div>
            <label className="block text-xs ev-font-epic uppercase tracking-widest mb-1" style={{ color: "#F5A623" }}>Data de nascimento</label>
            <input type="date" className="ev-input" value={data} onChange={e => setData(e.target.value)} onKeyDown={e => e.key === "Enter" && handle()} />
          </div>
          <button disabled={loading} onClick={handle}
            className="ev-btn-primary w-full h-12 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            ENTRAR NA SAGA
          </button>
        </div>

        <p className="text-xs text-center" style={{ color: "#A08060" }}>
          Ainda não tem cadastro?{" "}
          <Link to="/energia/cadastro" className="font-bold ev-sparkle" style={{ color: "#F5A623" }}>Cadastre-se</Link>
        </p>
        <Link to="/" className="block text-center text-xs" style={{ color: "rgba(160,128,96,0.7)" }}>← Voltar ao site</Link>
      </div>
    </div>
  );
}
