import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Sun, AlertCircle, Loader2 } from "lucide-react";
import { evCall, evMaskCpf } from "@/lib/energiaApi";
import { useEnergia } from "@/contexts/EnergiaContext";
import EnergiaWelcomePopup from "./EnergiaWelcomePopup";

const maskDateBR = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 8);
  const p1 = d.slice(0, 2);
  const p2 = d.slice(2, 4);
  const p3 = d.slice(4, 8);
  return [p1, p2, p3].filter(Boolean).join("/");
};
const brToIso = (v: string) => {
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return "";
  return `${m[3]}-${m[2]}-${m[1]}`;
};

export default function EnergiaLogin() {
  const [cpf, setCpf] = useState("");
  const [data, setData] = useState("");
  const [aceite, setAceite] = useState(false);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setIndicador, setCpf: saveCpf } = useEnergia();
  const nav = useNavigate();

  const handle = async () => {
    if (!aceite) return;
    setError(""); setNotFound(false); setLoading(true);
    try {
      const iso = brToIso(data);
      if (!iso) { setError("Data inválida. Use DD/MM/AAAA"); setLoading(false); return; }
      const res = await evCall<{ indicador: any }>("login_cliente", { cpf, data_nascimento: iso, aceite_termos: true });
      setIndicador(res.indicador);
      saveCpf(cpf.replace(/\D/g, ""));
      nav("/energia/dashboard");
    } catch (e: any) {
      const msg = e.message || "Erro ao entrar";
      if (/não encontrado|nao encontrado|cadastre-se/i.test(msg)) setNotFound(true);
      else setError(msg);
    }
    finally { setLoading(false); }
  };

  return (
    <div className="ev-epic flex items-center justify-center px-4 py-10">
      <EnergiaWelcomePopup />
      <div className="relative z-10 max-w-md w-full ev-card ev-enter p-8 space-y-5">
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#F5A623" }}>
            <Sun className="w-8 h-8" style={{ color: "#1A2233" }} />
          </div>
          <h1 className="text-2xl font-extrabold" style={{ color: "#1A2233" }}>Energia que Volta</h1>
          <p className="text-sm" style={{ color: "#6B7585" }}>Bem-vindo, Indicador.</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg text-sm"
            style={{ background: "#FEE2E2", color: "#B91C1C" }}>
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {notFound && (
          <div className="p-4 rounded-lg space-y-3 text-sm"
            style={{ background: "#FFF4E0", color: "#1A2233" }}>
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#F5A623" }} />
              <span>CPF não encontrado em nossa base. Que tal se cadastrar agora?</span>
            </div>
            <Link to="/energia/cadastro"
              state={{ cpf }}
              className="ev-btn-primary w-full h-11 flex items-center justify-center font-bold">
              Criar meu cadastro
            </Link>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "#6B7585" }}>CPF</label>
            <input className="ev-input" value={cpf} placeholder="000.000.000-00" onChange={e => setCpf(evMaskCpf(e.target.value))} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "#6B7585" }}>Data de nascimento</label>
            <input type="tel" inputMode="numeric" autoComplete="bday" placeholder="DD/MM/AAAA" maxLength={10} className="ev-input" value={data} onChange={e => setData(maskDateBR(e.target.value))} onKeyDown={e => e.key === "Enter" && handle()} />
          </div>
          <label className="flex items-start gap-2 cursor-pointer select-none" style={{ fontSize: 13, color: "#1A2233" }}>
            <input
              type="checkbox"
              checked={aceite}
              onChange={e => setAceite(e.target.checked)}
              style={{ accentColor: "#F5A623", width: 16, height: 16, marginTop: 2 }}
            />
            <span>
              Li e aceito os{" "}
              <a
                href="/docs/regulamento-energia-que-volta.pdf"
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{ color: "#F5A623", textDecoration: "underline", fontSize: 13 }}
              >
                Termos e Condições do Programa Energia que Volta
              </a>
            </span>
          </label>
          <button disabled={loading || !aceite} onClick={handle}
            className="ev-btn-primary w-full h-12 flex items-center justify-center gap-2"
            style={!aceite ? { opacity: 0.5, pointerEvents: "none" } : undefined}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Entrar
          </button>
        </div>

        <p className="text-xs text-center" style={{ color: "#8891A0" }}>
          Ainda não tem cadastro?{" "}
          <Link to="/energia/cadastro" className="font-bold" style={{ color: "#F5A623" }}>Cadastre-se</Link>
        </p>
        <Link to="/" className="block text-center text-xs" style={{ color: "#8891A0" }}>← Voltar ao site</Link>
      </div>
    </div>
  );
}
