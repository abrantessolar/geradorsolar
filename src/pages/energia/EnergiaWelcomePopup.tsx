import { useEffect, useState } from "react";
import { Sun } from "lucide-react";

const KEY = "ev_welcome_seen";

export default function EnergiaWelcomePopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem(KEY)) {
      const t = setTimeout(() => setOpen(true), 250);
      return () => clearTimeout(t);
    }
  }, []);

  const close = () => {
    sessionStorage.setItem(KEY, "1");
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      onClick={close}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(10,18,30,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        padding: 16,
        animation: "ev-fade-in 0.3s ease-out",
      }}
    >
      <div
        className="ev-card"
        onClick={e => e.stopPropagation()}
        style={{
          position: "relative",
          maxWidth: 420,
          width: "100%",
          textAlign: "center",
          padding: "32px 28px 28px",
          cursor: "default",
        }}
      >
        <div
          className="mx-auto mb-4 flex items-center justify-center"
          style={{ width: 64, height: 64, borderRadius: "50%", background: "#FFF4E0" }}
        >
          <Sun className="w-8 h-8" style={{ color: "#F5A623" }} />
        </div>
        <h2 className="text-xl font-extrabold mb-2" style={{ color: "#1A2233" }}>
          Bem-vindo à Energia que Volta
        </h2>
        <p className="text-sm" style={{ color: "#6B7585" }}>
          Indique amigos e vizinhos para a Três Lagoas Solar, acumule pontos e troque por prêmios.
        </p>
        <button
          onClick={close}
          className="ev-btn-primary w-full h-11 mt-5 flex items-center justify-center"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
