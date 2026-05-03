import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Sun, AlertCircle, Loader2 } from "lucide-react";
import { evCall, evMaskCpf } from "@/lib/energiaApi";
import { useEnergia } from "@/contexts/EnergiaContext";

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
    } catch (e: any) {
      setError(e.message || "Erro ao entrar");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A3C5E] via-[#2C5A8C] to-[#F5A623] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 space-y-5">
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-[#F5A623] to-[#E8651A] flex items-center justify-center">
            <Sun className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#1A3C5E]">Energia que Volta</h1>
          <p className="text-sm text-gray-500">Indique e ganhe prêmios solares</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-[#1A3C5E] mb-1">CPF</label>
            <input
              className="w-full h-11 rounded-lg border border-gray-300 px-3 focus:outline-none focus:border-[#F5A623]"
              value={cpf} placeholder="000.000.000-00"
              onChange={e => setCpf(evMaskCpf(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1A3C5E] mb-1">Data de nascimento</label>
            <input
              type="date"
              className="w-full h-11 rounded-lg border border-gray-300 px-3 focus:outline-none focus:border-[#F5A623]"
              value={data} onChange={e => setData(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handle()}
            />
          </div>
          <button
            disabled={loading}
            onClick={handle}
            className="w-full h-11 rounded-lg bg-gradient-to-r from-[#F5A623] to-[#E8651A] text-white font-bold hover:opacity-90 transition flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Entrar
          </button>
        </div>

        <p className="text-xs text-center text-gray-500">
          Não consegue entrar? Entre em contato com a empresa.
        </p>
        <Link to="/" className="block text-center text-xs text-[#1A3C5E]/60 hover:text-[#1A3C5E]">
          ← Voltar ao site
        </Link>
      </div>
    </div>
  );
}
