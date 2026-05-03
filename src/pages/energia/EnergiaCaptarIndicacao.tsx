import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Sun, Check } from "lucide-react";
import { evCall } from "@/lib/energiaApi";

export default function EnergiaCaptarIndicacao() {
  const { codigo } = useParams<{ codigo: string }>();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");

  const handle = async () => {
    setError("");
    try {
      await evCall("captar_indicacao", { codigo_link: codigo, nome, telefone, email });
      setEnviado(true);
    } catch (e: any) { setError(e.message); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5A623] via-[#E8651A] to-[#1A3C5E] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-[#F5A623] to-[#E8651A] flex items-center justify-center mb-3">
            <Sun className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#1A3C5E]">Você foi indicado!</h1>
          <p className="text-sm text-gray-500 mt-2">Energia Solar com a Três Lagoas Solar</p>
        </div>

        {enviado ? (
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-9 h-9 text-green-600" />
            </div>
            <h2 className="font-bold text-[#1A3C5E]">Recebemos seus dados!</h2>
            <p className="text-sm text-gray-600">Em breve nossa equipe entrará em contato.</p>
            <Link to="/" className="block mt-4 text-[#E8651A] text-sm">Conhecer a empresa →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}
            <input className="w-full h-11 rounded-lg border border-gray-300 px-3" placeholder="Seu nome" value={nome} onChange={e => setNome(e.target.value)} />
            <input className="w-full h-11 rounded-lg border border-gray-300 px-3" placeholder="WhatsApp (com DDD)" value={telefone} onChange={e => setTelefone(e.target.value)} />
            <input type="email" className="w-full h-11 rounded-lg border border-gray-300 px-3" placeholder="E-mail (opcional)" value={email} onChange={e => setEmail(e.target.value)} />
            <button
              onClick={handle}
              disabled={!nome}
              className="w-full h-11 rounded-lg bg-gradient-to-r from-[#F5A623] to-[#E8651A] text-white font-bold disabled:opacity-50"
            >
              Quero saber mais
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
