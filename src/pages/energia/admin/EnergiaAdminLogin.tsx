import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sun, AlertCircle, Loader2 } from "lucide-react";
import { evCall, evSetAdminToken } from "@/lib/energiaApi";

export default function EnergiaAdminLogin() {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const handle = async () => {
    setError(""); setLoading(true);
    try {
      const res = await evCall<{ token: string }>("login_admin", { usuario, senha });
      evSetAdminToken(res.token);
      nav("/energia/admin");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#1A3C5E] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full space-y-4">
        <div className="text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-br from-[#F5A623] to-[#E8651A] flex items-center justify-center mb-2">
            <Sun className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-[#1A3C5E]">Painel Admin</h1>
          <p className="text-xs text-gray-500">Energia que Volta</p>
        </div>
        {error && <div className="flex items-center gap-2 p-3 rounded bg-red-50 text-red-700 text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}
        <input className="w-full h-11 rounded-lg border border-gray-300 px-3" placeholder="Usuário" value={usuario} onChange={e => setUsuario(e.target.value)} />
        <input type="password" className="w-full h-11 rounded-lg border border-gray-300 px-3" placeholder="Senha" value={senha} onChange={e => setSenha(e.target.value)} onKeyDown={e => e.key === "Enter" && handle()} />
        <button onClick={handle} disabled={loading} className="w-full h-11 rounded-lg bg-[#1A3C5E] text-white font-bold flex items-center justify-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />} Entrar
        </button>
      </div>
    </div>
  );
}
