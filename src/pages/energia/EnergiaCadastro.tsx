import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Sun, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { evCall, evMaskCpf } from "@/lib/energiaApi";
import { useEnergia } from "@/contexts/EnergiaContext";

const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, a, b, c) => [a && `(${a}`, a && a.length === 2 ? ") " : "", b, c && `-${c}`].filter(Boolean).join(""));
  return d.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
};
const maskDateBR = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean).join("/");
};
const brToIso = (v: string) => {
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
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
      const iso = brToIso(form.data_nascimento);
      if (!iso) { setError("Data inválida. Use DD/MM/AAAA"); setLoading(false); return; }
      const res = await evCall<{ indicador: any }>("cadastro_publico", {
        nome: form.nome, cpf: form.cpf, data_nascimento: iso,
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
      <div className="relative z-10 max-w-md w-full ev-card ev-enter p-7 space-y-4">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "#F5A623" }}>
            <Sun className="w-7 h-7" style={{ color: "#1A2233" }} />
          </div>
          <h1 className="text-xl font-extrabold" style={{ color: "#1A2233" }}>Criar cadastro</h1>
          <p className="text-sm" style={{ color: "#6B7585" }}>Comece a indicar e ganhar prêmios</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg text-sm"
            style={{ background: "#FEE2E2", color: "#B91C1C" }}>
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <div className="space-y-3">
          <Field label="Nome completo *"><input className="ev-input" value={form.nome} onChange={e => set("nome", e.target.value)} /></Field>
          <Field label="CPF *"><input className="ev-input" placeholder="000.000.000-00" value={form.cpf} onChange={e => set("cpf", evMaskCpf(e.target.value))} /></Field>
          <Field label="Data de nascimento *"><input type="tel" inputMode="numeric" autoComplete="bday" placeholder="DD/MM/AAAA" maxLength={10} className="ev-input" value={form.data_nascimento} onChange={e => set("data_nascimento", maskDateBR(e.target.value))} /></Field>
          <Field label="Telefone (WhatsApp) *"><input className="ev-input" placeholder="(00) 00000-0000" value={form.telefone} onChange={e => set("telefone", maskPhone(e.target.value))} /></Field>
          <Field label="E-mail"><input type="email" className="ev-input" value={form.email} onChange={e => set("email", e.target.value)} /></Field>

          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: "#6B7585" }}>Você já é cliente da Três Lagoas Solar? *</label>
            <div className="grid grid-cols-2 gap-2">
              {[["sim", "Sim, sou cliente"], ["nao", "Ainda não"]].map(([v, l]) => (
                <button key={v} type="button" onClick={() => set("eh_cliente", v)}
                  className="h-11 rounded-lg text-sm font-bold flex items-center justify-center gap-1 transition"
                  style={{
                    border: form.eh_cliente === v ? "2px solid #F5A623" : "1px solid #E3E8EF",
                    background: form.eh_cliente === v ? "#FFF4E0" : "#FFFFFF",
                    color: form.eh_cliente === v ? "#1A2233" : "#6B7585",
                  }}>
                  {form.eh_cliente === v && <CheckCircle2 className="w-4 h-4" />} {l}
                </button>
              ))}
            </div>
          </div>

          <button disabled={loading} onClick={handle}
            className="ev-btn-primary w-full h-12 flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} Criar minha conta
          </button>
        </div>

        <div className="text-center text-xs space-y-2" style={{ color: "#8891A0" }}>
          <p>Já tem cadastro? <Link to="/energia" className="font-bold" style={{ color: "#F5A623" }}>Entrar</Link></p>
          <Link to="/" className="block">← Voltar ao site</Link>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1" style={{ color: "#6B7585" }}>{label}</label>
      {children}
    </div>
  );
}
