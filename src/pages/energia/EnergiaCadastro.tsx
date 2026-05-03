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

export default function EnergiaCadastro() {
  const [form, setForm] = useState({ nome: "", cpf: "", data_nascimento: "", telefone: "", email: "", eh_cliente: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setIndicador, setCpf } = useEnergia();
  const nav = useNavigate();

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handle = async () => {
    setError("");
    if (!form.nome || !form.cpf || !form.data_nascimento || !form.telefone) {
      setError("Preencha todos os campos obrigatórios"); return;
    }
    if (form.eh_cliente === "") { setError("Informe se já é cliente da Três Lagoas Solar"); return; }
    setLoading(true);
    try {
      const res = await evCall<{ indicador: any }>("cadastro_publico", {
        nome: form.nome,
        cpf: form.cpf,
        data_nascimento: form.data_nascimento,
        telefone: form.telefone,
        email: form.email,
        eh_cliente: form.eh_cliente === "sim",
      });
      setIndicador(res.indicador);
      setCpf(form.cpf.replace(/\D/g, ""));
      nav("/energia/dashboard");
    } catch (e: any) {
      setError(e.message || "Erro ao cadastrar");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A3C5E] via-[#2C5A8C] to-[#F5A623] flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 space-y-5">
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-[#F5A623] to-[#E8651A] flex items-center justify-center">
            <Sun className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#1A3C5E]">Cadastre-se</h1>
          <p className="text-sm text-gray-500">Comece a indicar e ganhar prêmios</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <div className="space-y-3">
          <Field label="Nome completo *">
            <input className="ev-input" value={form.nome} onChange={e => set("nome", e.target.value)} />
          </Field>
          <Field label="CPF *">
            <input className="ev-input" placeholder="000.000.000-00" value={form.cpf} onChange={e => set("cpf", evMaskCpf(e.target.value))} />
          </Field>
          <Field label="Data de nascimento *">
            <input type="date" className="ev-input" value={form.data_nascimento} onChange={e => set("data_nascimento", e.target.value)} />
          </Field>
          <Field label="Telefone (WhatsApp) *">
            <input className="ev-input" placeholder="(00) 00000-0000" value={form.telefone} onChange={e => set("telefone", maskPhone(e.target.value))} />
          </Field>
          <Field label="E-mail">
            <input type="email" className="ev-input" value={form.email} onChange={e => set("email", e.target.value)} />
          </Field>

          <div>
            <label className="block text-sm font-medium text-[#1A3C5E] mb-2">Você já é cliente da Três Lagoas Solar? *</label>
            <div className="grid grid-cols-2 gap-2">
              {[["sim", "Sim, sou cliente"], ["nao", "Ainda não"]].map(([v, l]) => (
                <button
                  key={v} type="button"
                  onClick={() => set("eh_cliente", v)}
                  className={`h-11 rounded-lg border-2 text-sm font-semibold transition flex items-center justify-center gap-1 ${
                    form.eh_cliente === v
                      ? "border-[#F5A623] bg-[#F5A623]/10 text-[#1A3C5E]"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {form.eh_cliente === v && <CheckCircle2 className="w-4 h-4" />}
                  {l}
                </button>
              ))}
            </div>
          </div>

          <button
            disabled={loading}
            onClick={handle}
            className="w-full h-11 rounded-lg bg-gradient-to-r from-[#F5A623] to-[#E8651A] text-white font-bold hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Criar minha conta
          </button>
        </div>

        <div className="text-center text-xs text-gray-500 space-y-2">
          <p>Já tem cadastro? <Link to="/energia" className="text-[#E8651A] font-semibold">Entrar</Link></p>
          <Link to="/" className="block text-[#1A3C5E]/60 hover:text-[#1A3C5E]">← Voltar ao site</Link>
        </div>
      </div>
      <style>{`.ev-input{width:100%;height:44px;border-radius:8px;border:1px solid #d1d5db;padding:0 12px;outline:none}.ev-input:focus{border-color:#F5A623}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#1A3C5E] mb-1">{label}</label>
      {children}
    </div>
  );
}
