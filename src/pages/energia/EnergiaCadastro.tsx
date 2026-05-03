import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Sun, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { evCall, evMaskCpf } from "@/lib/energiaApi";
import { useEnergia } from "@/contexts/EnergiaContext";
import { EpicParticles } from "./_epic";

const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, a, b, c) => [a && `(${a}`, a && a.length === 2 ? ") " : "", b, c && `-${c}`].filter(Boolean).join(""));
  return d.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
};

export default function EnergiaCadastro() {
  const [form, setForm] = useState({ nome: "", cpf: "", data_nascimento: "", telefone: "", email: "", eh_cliente: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setIndicador, setCpf } = useEnergia();
  const nav = useNavigate();
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handle = async () => {
    setError("");
    if (!form.nome || !form.cpf || !form.data_nascimento || !form.telefone) { setError("Preencha todos os campos obrigatórios"); return; }
    if (form.eh_cliente === "") { setError("Informe se já é cliente da Três Lagoas Solar"); return; }
    setLoading(true);
    try {
      const res = await evCall<{ indicador: any }>("cadastro_publico", {
        nome: form.nome, cpf: form.cpf, data_nascimento: form.data_nascimento,
        telefone: form.telefone, email: form.email, eh_cliente: form.eh_cliente === "sim",
      });
      setIndicador(res.indicador);
      setCpf(form.cpf.replace(/\D/g, ""));
      nav("/energia/dashboard");
    } catch (e: any) { setError(e.message || "Erro ao cadastrar"); }
    finally { setLoading(false); }
  };

  return (
    <div className="ev-epic flex items-center justify-center px-4 py-10">
      <EpicParticles count={20} />
      <div className="relative z-10 max-w-md w-full ev-card ev-card-glow ev-enter p-7 space-y-4">
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center ev-pulse-ring"
            style={{ background: "linear-gradient(135deg, #F5A623, #E8651A)" }}>
            <Sun className="w-9 h-9" style={{ color: "#0D0A00" }} />
          </div>
          <h1 className="ev-font-epic text-2xl font-black ev-text-glow" style={{ color: "#F5A623" }}>Junte-se à Saga</h1>
          <p className="text-sm" style={{ color: "#A08060" }}>Comece a indicar e conquistar relíquias solares</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg text-sm"
            style={{ background: "rgba(232,101,26,0.18)", color: "#F5E6C8", border: "1px solid rgba(232,101,26,0.5)" }}>
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <div className="space-y-3">
          <Field label="Nome completo *"><input className="ev-input" value={form.nome} onChange={e => set("nome", e.target.value)} /></Field>
          <Field label="CPF *"><input className="ev-input" placeholder="000.000.000-00" value={form.cpf} onChange={e => set("cpf", evMaskCpf(e.target.value))} /></Field>
          <Field label="Data de nascimento *"><input type="date" className="ev-input" value={form.data_nascimento} onChange={e => set("data_nascimento", e.target.value)} /></Field>
          <Field label="Telefone (WhatsApp) *"><input className="ev-input" placeholder="(00) 00000-0000" value={form.telefone} onChange={e => set("telefone", maskPhone(e.target.value))} /></Field>
          <Field label="E-mail"><input type="email" className="ev-input" value={form.email} onChange={e => set("email", e.target.value)} /></Field>

          <div>
            <label className="block text-xs ev-font-epic uppercase tracking-widest mb-2" style={{ color: "#F5A623" }}>Você já é cliente da Três Lagoas Solar? *</label>
            <div className="grid grid-cols-2 gap-2">
              {[["sim", "Sim, sou cliente"], ["nao", "Ainda não"]].map(([v, l]) => (
                <button key={v} type="button" onClick={() => set("eh_cliente", v)}
                  className="h-11 rounded-lg text-sm font-bold flex items-center justify-center gap-1 transition"
                  style={{
                    border: form.eh_cliente === v ? "2px solid #F5A623" : "2px solid rgba(193,127,36,0.35)",
                    background: form.eh_cliente === v ? "rgba(245,166,35,0.18)" : "rgba(0,0,0,0.35)",
                    color: form.eh_cliente === v ? "#F5E6C8" : "#A08060",
                  }}>
                  {form.eh_cliente === v && <CheckCircle2 className="w-4 h-4" />} {l}
                </button>
              ))}
            </div>
          </div>

          <button disabled={loading} onClick={handle}
            className="ev-btn-primary w-full h-12 flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} CRIAR MINHA CONTA
          </button>
        </div>

        <div className="text-center text-xs space-y-2" style={{ color: "#A08060" }}>
          <p>Já tem cadastro? <Link to="/energia" className="font-bold" style={{ color: "#F5A623" }}>Entrar</Link></p>
          <Link to="/" className="block" style={{ color: "rgba(160,128,96,0.7)" }}>← Voltar ao site</Link>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs ev-font-epic uppercase tracking-widest mb-1" style={{ color: "#F5A623" }}>{label}</label>
      {children}
    </div>
  );
}
